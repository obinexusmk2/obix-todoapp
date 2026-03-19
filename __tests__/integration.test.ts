/**
 * OBIX TodoApp Integration Tests
 * Tests #NoGhosting protocol implementation and team collaboration features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TodoAppRuntime } from '../src/runtime';
import { NoGhostingProtocol } from '../src/noshadowing-protocol';
import { Task, Team, TeamMember, TodoAppState } from '../src/types';

describe('obix-todoapp integration', () => {
  let runtime: TodoAppRuntime;
  let protocol: NoGhostingProtocol;
  let testTeamId: string;

  beforeEach(() => {
    runtime = new TodoAppRuntime();
    protocol = new NoGhostingProtocol(runtime);

    // Set up test user
    runtime.setCurrentUser('user-alice');

    // Create test team
    runtime.dispatch({
      type: 'CREATE_TEAM',
      payload: {
        name: 'Engineering',
        description: 'Core engineering team',
        members: [
          {
            id: 'user-alice',
            name: 'Alice',
            email: 'alice@example.com',
            role: 'maintainer',
            status: 'active',
            joinedAt: Date.now(),
            lastActiveAt: Date.now(),
            settings: {},
          } as TeamMember,
          {
            id: 'user-bob',
            name: 'Bob',
            email: 'bob@example.com',
            role: 'contributor',
            status: 'active',
            joinedAt: Date.now(),
            lastActiveAt: Date.now(),
            settings: {},
          } as TeamMember,
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

    // Capture the generated team ID
    const teams = Object.keys(runtime.getState().teams);
    testTeamId = teams[0];
    runtime.setCurrentTeam(testTeamId);
  });

  describe('#NoGhosting Protocol - Task Assignment', () => {
    it('should prevent unassigned critical tasks', () => {
      runtime.dispatch({
        type: 'CREATE_TASK',
        payload: {
          title: 'Critical fix',
          description: 'Security vulnerability',
          assignedTo: [],
          createdBy: 'user-alice',
          teamId: testTeamId,
          priority: 'critical',
          status: 'open',
          childIds: [],
          tags: [],
          attachments: [],
          customFields: {},
        },
      });

      const violations = protocol.validateCompliance();
      expect(violations).toContainEqual(
        expect.objectContaining({
          type: 'unassigned_critical',
        })
      );
    });

    it('should require acknowledgment for assigned tasks', () => {
      runtime.dispatch({
        type: 'CREATE_TASK',
        payload: {
          title: 'Feature implementation',
          description: 'Build new dashboard',
          assignedTo: ['user-bob'],
          createdBy: 'user-alice',
          teamId: testTeamId,
          priority: 'high',
          status: 'open',
          childIds: [],
          tags: [],
          attachments: [],
          customFields: {},
        },
      });

      const state = runtime.getState();
      const task = Object.values(state.tasks)[0];

      // Verify engagement event was created
      expect(task.engagementEvents.length).toBeGreaterThan(0);
      expect(task.engagementEvents[0].type).toBe('task_assigned');
      expect(task.engagementEvents[0].acknowledged).toBe(false);
    });

    it('should allow task completion and record engagement', () => {
      runtime.dispatch({
        type: 'CREATE_TASK',
        payload: {
          title: 'Fix bug',
          description: 'Database timeout issue',
          assignedTo: ['user-bob'],
          createdBy: 'user-alice',
          teamId: testTeamId,
          priority: 'medium',
          status: 'open',
          childIds: [],
          tags: [],
          attachments: [],
          customFields: {},
        },
      });

      const state = runtime.getState();
      const taskId = Object.keys(state.tasks)[0];

      runtime.setCurrentUser('user-bob');
      runtime.dispatch({
        type: 'COMPLETE_TASK',
        payload: { id: taskId },
      });

      const completedTask = runtime.getTask(taskId);
      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.completedAt).toBeDefined();
      expect(completedTask?.engagementEvents).toContainEqual(
        expect.objectContaining({
          type: 'task_completed',
        })
      );
    });
  });

  describe('#NoGhosting Protocol - Escalation', () => {
    it('should detect stalled tasks', () => {
      const pastTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

      runtime.dispatch({
        type: 'CREATE_TASK',
        payload: {
          title: 'Stalled task',
          description: 'Should be finished',
          assignedTo: ['user-bob'],
          createdBy: 'user-alice',
          teamId: testTeamId,
          priority: 'medium',
          status: 'in_progress',
          childIds: [],
          tags: [],
          attachments: [],
          customFields: {},
        },
      });

      const state = runtime.getState();
      const taskId = Object.keys(state.tasks)[0];
      const task = state.tasks[taskId];

      // Manually set last engagement time to past
      task.lastEngagementAt = pastTime;

      const violations = protocol.validateCompliance();
      expect(violations).toContainEqual(
        expect.objectContaining({
          type: 'stalled_task',
          severity: 'warning',
        })
      );
    });

    it('should identify escalation-worthy critical tasks', () => {
      runtime.dispatch({
        type: 'CREATE_TASK',
        payload: {
          title: 'Critical production issue',
          description: 'System down',
          assignedTo: ['user-bob'],
          createdBy: 'user-alice',
          teamId: testTeamId,
          priority: 'critical',
          status: 'in_progress',
          childIds: [],
          tags: [],
          attachments: [],
          customFields: {},
        },
      });

      const state = runtime.getState();
      const taskId = Object.keys(state.tasks)[0];
      const task = state.tasks[taskId];

      // Set last activity to beyond escalation threshold
      task.lastEngagementAt = Date.now() - 49 * 60 * 60 * 1000; // 49 hours ago

      const escalations = protocol.checkEscalations();
      expect(escalations).toContainEqual(
        expect.objectContaining({
          taskId,
          severity: 'critical',
        })
      );
    });
  });

  describe('Team Collaboration', () => {
    it('should track team members and their engagement', () => {
      runtime.dispatch({
        type: 'CREATE_TASK',
        payload: {
          title: 'Task 1',
          description: 'Assigned to Bob',
          assignedTo: ['user-bob'],
          createdBy: 'user-alice',
          teamId: testTeamId,
          priority: 'medium',
          status: 'open',
          childIds: [],
          tags: [],
          attachments: [],
          customFields: {},
        },
      });

      runtime.dispatch({
        type: 'CREATE_TASK',
        payload: {
          title: 'Task 2',
          description: 'Assigned to Bob',
          assignedTo: ['user-bob'],
          createdBy: 'user-alice',
          teamId: testTeamId,
          priority: 'high',
          status: 'open',
          childIds: [],
          tags: [],
          attachments: [],
          customFields: {},
        },
      });

      const report = protocol.getEngagementReport(testTeamId);

      expect(report.totalTasks).toBe(2);
      expect(report.memberEngagement['user-bob']).toBeDefined();
      expect(report.memberEngagement['user-bob'].tasksAssigned).toBe(2);
    });

    it('should generate comprehensive engagement report', () => {
      // Create multiple tasks
      for (let i = 0; i < 5; i++) {
        runtime.dispatch({
          type: 'CREATE_TASK',
          payload: {
            title: `Task ${i}`,
            description: `Description ${i}`,
            assignedTo: i % 2 === 0 ? ['user-bob'] : ['user-alice'],
            createdBy: 'user-alice',
            teamId: testTeamId,
            priority: 'medium',
            status: 'open',
            childIds: [],
            tags: [],
            attachments: [],
            customFields: {},
          },
        });
      }

      const report = protocol.getEngagementReport(testTeamId);

      expect(report.teamId).toBe(testTeamId);
      expect(report.totalTasks).toBe(5);
      expect(Object.keys(report.memberEngagement).length).toBeGreaterThan(0);
      expect(report.engagementRate).toBeGreaterThanOrEqual(0);
      expect(report.engagementRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Hierarchical Task Structure', () => {
    it('should support parent-child task relationships', () => {
      // Create parent task
      runtime.dispatch({
        type: 'CREATE_TASK',
        payload: {
          title: 'Parent task',
          description: 'Contains subtasks',
          assignedTo: ['user-alice'],
          createdBy: 'user-alice',
          teamId: testTeamId,
          priority: 'high',
          status: 'open',
          childIds: [],
          tags: [],
          attachments: [],
          customFields: {},
        },
      });

      const state = runtime.getState();
      const parentId = Object.keys(state.tasks)[0];

      // Create child task
      runtime.dispatch({
        type: 'CREATE_TASK',
        payload: {
          title: 'Subtask 1',
          description: 'Part of parent',
          assignedTo: ['user-bob'],
          createdBy: 'user-alice',
          teamId: testTeamId,
          priority: 'medium',
          status: 'open',
          parentId,
          childIds: [],
          tags: [],
          attachments: [],
          customFields: {},
        },
      });

      const updatedState = runtime.getState();
      const childId = Object.keys(updatedState.tasks).find((id) => id !== parentId)!;
      const childTask = updatedState.tasks[childId];

      expect(childTask.parentId).toBe(parentId);
    });
  });

  describe('State Persistence & Subscription', () => {
    it('should notify subscribers of state changes', () => {
      return new Promise((resolve) => {
        let changeCount = 0;

        const unsubscribe = runtime.subscribe((state) => {
          changeCount++;
          if (changeCount >= 2) {
            expect(Object.keys(state.tasks).length).toBeGreaterThan(0);
            unsubscribe();
            resolve(undefined);
          }
        });

        runtime.dispatch({
          type: 'CREATE_TASK',
          payload: {
            title: 'Test task',
            description: 'For subscription test',
            assignedTo: [],
            createdBy: 'user-alice',
            teamId: testTeamId,
            priority: 'low',
            status: 'open',
            childIds: [],
            tags: [],
            attachments: [],
            customFields: {},
          },
        });
      });
    });

    it('should maintain read-only state snapshot', () => {
      const state1 = runtime.getState();
      const state2 = runtime.getState();

      expect(state1).toEqual(state2);

      // Verify state is frozen
      expect(() => {
        (state1 as any).tasks = {};
      }).toThrow();
    });
  });

  describe('Compliance Audit Trail', () => {
    it('should record compliance events for team modifications', () => {
      const team = runtime.getTeam(testTeamId);
      const initialTrailLength = team?.complianceTrail.length ?? 0;

      // Add team member
      runtime.dispatch({
        type: 'ADD_TEAM_MEMBER',
        payload: {
          teamId: testTeamId,
          member: {
            id: 'user-charlie',
            name: 'Charlie',
            email: 'charlie@example.com',
            role: 'contributor',
            status: 'active',
            joinedAt: Date.now(),
            lastActiveAt: Date.now(),
            settings: {},
          } as TeamMember,
        },
      });

      const updatedTeam = runtime.getTeam(testTeamId);
      expect((updatedTeam?.complianceTrail.length ?? 0)).toBeGreaterThan(initialTrailLength);
    });
  });
});
