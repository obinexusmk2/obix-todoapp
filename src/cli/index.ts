#!/usr/bin/env node

/**
 * OBIX TodoApp - CLI Tool
 * Command-line interface for task management with #NoGhosting Protocol
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { table } from 'table';
import { createTodoApp, Task, Team } from '../core';
import { TodoDatabase } from '../server/database';
import { v4 as uuid } from 'uuid';

const program = new Command();
const todoApp = createTodoApp();
const db = new TodoDatabase();

// Load data from database
function loadData(): void {
  const teams = db.getAllTeams();
  teams.forEach(team => {
    todoApp.dispatch({ type: 'CREATE_TEAM', payload: team });
  });
}

// Print header
function printHeader(title: string): void {
  console.log(
    chalk.cyan(
      `\n${'─'.repeat(50)}\n  ${title}\n${'─'.repeat(50)}\n`
    )
  );
}

// Print success message
function printSuccess(message: string): void {
  console.log(chalk.green(`✅ ${message}`));
}

// Print error message
function printError(message: string): void {
  console.log(chalk.red(`❌ ${message}`));
}

/**
 * Teams command group
 */
program
  .command('team create')
  .description('Create a new team')
  .action(async () => {
    printHeader('Create Team');

    const answers = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Team name:' },
      { type: 'input', name: 'description', message: 'Team description:' },
    ]);

    todoApp.dispatch({
      type: 'CREATE_TEAM',
      payload: {
        name: answers.name,
        description: answers.description,
        members: [
          {
            id: 'user-' + uuid().slice(0, 8),
            name: 'Current User',
            email: 'user@example.com',
            role: 'maintainer',
            status: 'active',
            joinedAt: Date.now(),
            lastActiveAt: Date.now(),
            settings: {},
          },
        ],
        settings: {
          visibility: 'private',
          enableNotifications: true,
          enableReminders: true,
          reminderThresholdHours: 24,
          escalationEnabled: true,
          escalationThresholdHours: 48,
          requireAcknowledgment: true,
          acknowledgmentTimeoutHours: 2,
        },
      },
    });

    const state = todoApp.state();
    const teams = Object.values(state.teams);
    const newTeam = teams[teams.length - 1];
    db.saveTeam(newTeam);

    printSuccess(`Team "${answers.name}" created!`);
  });

program
  .command('team list')
  .description('List all teams')
  .action(() => {
    printHeader('Teams');

    const teams = Object.values(todoApp.state().teams);
    if (teams.length === 0) {
      console.log(chalk.yellow('No teams found. Create one with: obix-todoapp team create'));
      return;
    }

    const tableData = [
      [chalk.bold('Team Name'), chalk.bold('Members'), chalk.bold('Tasks'), chalk.bold('Created')],
      ...teams.map(team => [
        team.name,
        team.members.length.toString(),
        todoApp.runtime.getTeamTasks(team.id).length.toString(),
        new Date(team.createdAt).toLocaleDateString(),
      ]),
    ];

    console.log(table(tableData));
  });

/**
 * Tasks command group
 */
program
  .command('task create')
  .description('Create a new task')
  .action(async () => {
    printHeader('Create Task');

    const teams = Object.values(todoApp.state().teams);
    if (teams.length === 0) {
      printError('No teams found. Create a team first with: obix-todoapp team create');
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'teamId',
        message: 'Select team:',
        choices: teams.map(t => ({ name: t.name, value: t.id })),
      },
      { type: 'input', name: 'title', message: 'Task title:' },
      { type: 'input', name: 'description', message: 'Task description:' },
      {
        type: 'list',
        name: 'priority',
        message: 'Priority:',
        choices: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
    ]);

    todoApp.dispatch({
      type: 'CREATE_TASK',
      payload: {
        title: answers.title,
        description: answers.description,
        assignedTo: [],
        createdBy: 'cli-user',
        teamId: answers.teamId,
        priority: answers.priority,
        status: 'open',
        childIds: [],
        tags: [],
        attachments: [],
        customFields: {},
      },
    });

    const state = todoApp.state();
    const tasks = Object.values(state.tasks);
    const newTask = tasks[tasks.length - 1];
    db.saveTask(newTask);

    printSuccess(`Task "${answers.title}" created!`);
  });

program
  .command('task list [teamId]')
  .description('List tasks for a team')
  .action((teamId?: string) => {
    printHeader('Tasks');

    let tasks: Task[] = [];

    if (teamId) {
      tasks = todoApp.runtime.getTeamTasks(teamId);
    } else {
      const teams = Object.values(todoApp.state().teams);
      if (teams.length === 1) {
        tasks = todoApp.runtime.getTeamTasks(teams[0].id);
      } else if (teams.length > 1) {
        console.log(chalk.yellow('Multiple teams found. Specify team ID:'));
        teams.forEach(t => console.log(`  obix-todoapp task list ${t.id}`));
        return;
      }
    }

    if (tasks.length === 0) {
      console.log(chalk.yellow('No tasks found.'));
      return;
    }

    const tableData = [
      [
        chalk.bold('Title'),
        chalk.bold('Status'),
        chalk.bold('Priority'),
        chalk.bold('Assigned'),
        chalk.bold('Due'),
      ],
      ...tasks.map(task => [
        task.title,
        task.status,
        task.priority,
        task.assignedTo.length.toString(),
        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A',
      ]),
    ];

    console.log(table(tableData));
  });

program
  .command('task complete <taskId>')
  .description('Mark a task as complete')
  .action((taskId: string) => {
    try {
      todoApp.dispatch({ type: 'COMPLETE_TASK', payload: { id: taskId } });

      const task = todoApp.runtime.getTask(taskId);
      if (task) {
        db.saveTask(task);
        printSuccess(`Task "${task.title}" completed!`);
      }
    } catch (error) {
      printError(String(error));
    }
  });

/**
 * Compliance command group
 */
program
  .command('compliance violations')
  .description('Check for #NoGhosting violations')
  .action(() => {
    printHeader('#NoGhosting Violations');

    const violations = todoApp.validateCompliance();

    if (violations.length === 0) {
      console.log(chalk.green('✅ No violations found!'));
      return;
    }

    const tableData = [
      [chalk.bold('Type'), chalk.bold('Task'), chalk.bold('Severity'), chalk.bold('Description')],
      ...violations.map(v => [
        v.type,
        v.taskId,
        v.severity === 'critical' ? chalk.red(v.severity) : chalk.yellow(v.severity),
        v.description,
      ]),
    ];

    console.log(table(tableData));
  });

program
  .command('compliance escalations')
  .description('Check for escalation-worthy tasks')
  .action(() => {
    printHeader('Escalations');

    const escalations = todoApp.checkEscalations();

    if (escalations.length === 0) {
      console.log(chalk.green('✅ No escalations needed!'));
      return;
    }

    const tableData = [
      [chalk.bold('Task'), chalk.bold('Severity'), chalk.bold('Reason'), chalk.bold('Action')],
      ...escalations.map(e => [
        e.taskId,
        e.severity === 'critical' ? chalk.red(e.severity) : chalk.yellow(e.severity),
        e.reason,
        e.recommendedAction,
      ]),
    ];

    console.log(table(tableData));
  });

program
  .command('compliance report <teamId>')
  .description('Get team engagement report')
  .action((teamId: string) => {
    try {
      printHeader(`Engagement Report`);

      const report = todoApp.getEngagementReport(teamId);

      console.log(chalk.cyan('Overall Metrics:'));
      console.log(`  Engagement Rate: ${(report.engagementRate * 100).toFixed(1)}%`);
      console.log(`  Total Tasks: ${report.totalTasks}`);
      console.log(
        `  Avg Completion Time: ${(report.averageResponseTime / (1000 * 60 * 60)).toFixed(1)} hours`
      );

      console.log(chalk.cyan('\nMember Statistics:'));
      const memberData = [
        [chalk.bold('Member'), chalk.bold('Assigned'), chalk.bold('Completed'), chalk.bold('In Progress')],
        ...Object.values(report.memberEngagement).map(m => [
          m.name,
          m.tasksAssigned.toString(),
          m.tasksCompleted.toString(),
          m.tasksInProgress.toString(),
        ]),
      ];

      console.log(table(memberData));

      if (report.violations.length > 0) {
        console.log(chalk.yellow(`\n⚠️ ${report.violations.length} violations found`));
      }
    } catch (error) {
      printError(String(error));
    }
  });

/**
 * Status command
 */
program
  .command('status')
  .description('Show app status')
  .action(() => {
    printHeader('OBIX TodoApp Status');

    const stats = db.getStats();
    const state = todoApp.state();

    console.log(chalk.cyan('Database:'));
    console.log(`  Tasks: ${stats.tasks}`);
    console.log(`  Teams: ${stats.teams}`);
    console.log(`  Engagement Events: ${stats.events}`);

    console.log(chalk.cyan('\nCompliance:'));
    const violations = todoApp.validateCompliance();
    const escalations = todoApp.checkEscalations();
    console.log(`  Violations: ${violations.length}`);
    console.log(`  Escalations: ${escalations.length}`);
  });

/**
 * Parse arguments and run
 */
program
  .name('obix-todoapp')
  .description('OBIX TodoApp - Team Collaboration with #NoGhosting Protocol')
  .version('0.1.0')
  .usage('[command] [options]');

// Load data before running
loadData();

// Show help by default
if (process.argv.length < 3) {
  program.help();
} else {
  program.parse(process.argv);
}
