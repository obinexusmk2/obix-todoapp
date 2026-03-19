# OBIX TodoApp - Quick Start Guide

Get started with OBIX TodoApp in 5 minutes.

## Installation

```bash
# In your OBIX monorepo workspace
npm install @obinexusltd/obix-todoapp
```

## Basic Usage

### 1. Create an App Instance

```typescript
import { createTodoApp } from '@obinexusltd/obix-todoapp';

const app = createTodoApp();
```

### 2. Create a Team

```typescript
app.dispatch({
  type: 'CREATE_TEAM',
  payload: {
    name: 'Engineering',
    description: 'Backend team',
    members: [
      {
        id: 'user-alice',
        name: 'Alice',
        email: 'alice@company.com',
        role: 'maintainer',
        status: 'active',
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
        settings: {},
      },
      {
        id: 'user-bob',
        name: 'Bob',
        email: 'bob@company.com',
        role: 'contributor',
        status: 'active',
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
        settings: {},
      },
    ],
    settings: {
      visibility: 'private',
      enableNotifications: true,
      requireAcknowledgment: true,
      acknowledgmentTimeoutHours: 2,
      escalationEnabled: true,
      escalationThresholdHours: 48,
    },
  },
});

// Get the created team ID
const teams = Object.keys(app.state().teams);
const teamId = teams[0];
app.runtime.setCurrentTeam(teamId);
```

### 3. Create a Task

```typescript
app.dispatch({
  type: 'CREATE_TASK',
  payload: {
    title: 'Implement authentication',
    description: 'Add OAuth2 support to API',
    assignedTo: ['user-bob'],
    createdBy: 'user-alice',
    teamId: teamId,
    priority: 'high',
    status: 'open',
    dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    childIds: [],
    tags: ['feature', 'backend'],
    attachments: [],
    customFields: {},
  },
});
```

### 4. Monitor Compliance

```typescript
// Check for #NoGhosting violations
const violations = app.validateCompliance();
if (violations.length > 0) {
  violations.forEach(v => {
    console.log(`⚠️ ${v.type}: ${v.description}`);
  });
}

// Get team engagement report
const report = app.getEngagementReport(teamId);
console.log(`Team engagement rate: ${(report.engagementRate * 100).toFixed(1)}%`);
console.log(`Total tasks: ${report.totalTasks}`);

// Check for escalations
const escalations = app.checkEscalations();
escalations.forEach(e => {
  console.log(`🚨 ${e.severity}: ${e.reason}`);
});
```

### 5. Track State Changes

```typescript
// Subscribe to state updates
const unsubscribe = app.subscribe((state) => {
  console.log(`State updated: ${Object.keys(state.tasks).length} tasks`);
});

// Later: unsubscribe
unsubscribe();
```

## Common Workflows

### Complete a Task

```typescript
const taskId = Object.keys(app.state().tasks)[0];

// Mark as complete
app.dispatch({
  type: 'COMPLETE_TASK',
  payload: { id: taskId },
});

// Verify completion
const task = app.runtime.getTask(taskId);
console.log(`Task status: ${task?.status}`);
console.log(`Completed at: ${new Date(task?.completedAt!)}`);
```

### Assign Additional User

```typescript
const taskId = Object.keys(app.state().tasks)[0];

app.dispatch({
  type: 'ASSIGN_TASK',
  payload: {
    taskId: taskId,
    userId: 'user-charlie',
  },
});
```

### Get Unacknowledged Tasks (for a User)

```typescript
const pendingTasks = app.protocol.getUnacknowledgedTasks('user-bob');
console.log(`Bob has ${pendingTasks.length} unacknowledged tasks`);

pendingTasks.forEach(task => {
  console.log(`- ${task.title} (assigned by ${task.createdBy})`);
});
```

### Create Hierarchical Tasks

```typescript
// Create parent task
app.dispatch({
  type: 'CREATE_TASK',
  payload: {
    title: 'Q2 Platform Upgrade',
    description: 'Complete platform redesign',
    assignedTo: ['user-alice'],
    createdBy: 'user-alice',
    teamId: teamId,
    priority: 'critical',
    status: 'in_progress',
    childIds: [],
    tags: ['major-initiative'],
    attachments: [],
    customFields: {},
  },
});

const parentId = Object.keys(app.state().tasks).pop()!;

// Create subtask
app.dispatch({
  type: 'CREATE_TASK',
  payload: {
    title: 'Design new UI',
    description: 'Create mockups and design system',
    assignedTo: ['user-bob'],
    createdBy: 'user-alice',
    teamId: teamId,
    priority: 'high',
    status: 'open',
    parentId: parentId,  // Link to parent
    childIds: [],
    tags: ['design', 'ui'],
    attachments: [],
    customFields: {},
  },
});
```

## Key Concepts

### #NoGhosting Protocol

The #NoGhosting Protocol ensures no communication gaps:

1. **Clear Assignment**: Every task must have assignees
2. **Acknowledgment**: Assignments must be explicitly acknowledged
3. **Activity Tracking**: Inactive tasks trigger reminders
4. **Escalation**: Critical issues escalate automatically
5. **Audit Trail**: Complete history of all actions

### Violation Types

| Type | Severity | Cause | Solution |
|------|----------|-------|----------|
| `unassigned_critical` | CRITICAL | Critical task has no owner | Assign immediately |
| `overdue_acknowledgment` | CRITICAL | Assignment not confirmed | User acknowledges or reassign |
| `stalled_task` | WARNING | No activity beyond threshold | Record activity or reassign |
| `unacknowledged_assignment` | INFO | Pending confirmation | User acknowledges |

### Escalation Rules

- Critical + inactive > 48 hours → CRITICAL
- Task overdue + not completed → WARNING
- Critical assignment unacknowledged > 2 hours → CRITICAL

## Debugging & Inspection

### View Current State

```typescript
const state = app.state();
console.log(`Tasks: ${Object.keys(state.tasks).length}`);
console.log(`Teams: ${Object.keys(state.teams).length}`);
console.log(`Current user: ${state.currentUserId}`);
console.log(`Current team: ${state.currentTeamId}`);
```

### Inspect Task Details

```typescript
const task = app.runtime.getTask('task-123');
console.log(`Title: ${task?.title}`);
console.log(`Status: ${task?.status}`);
console.log(`Assigned to: ${task?.assignedTo.join(', ')}`);
console.log(`Engagement events: ${task?.engagementEvents.length}`);
task?.engagementEvents.forEach(e => {
  console.log(`  - ${e.type} by ${e.userId} (acknowledged: ${e.acknowledged})`);
});
```

### View Compliance Trail

```typescript
const team = app.runtime.getTeam(teamId);
console.log(`Compliance events: ${team?.complianceTrail.length}`);
team?.complianceTrail.slice(-5).forEach(e => {
  console.log(`  - ${e.type} by ${e.userId} at ${new Date(e.timestamp)}`);
  console.log(`    Details: ${JSON.stringify(e.details)}`);
});
```

## Advanced: Custom Policies

Add custom validation rules:

```typescript
// Policy: All tasks must have a due date
app.runtime.addPolicy('require-due-dates', (state) => {
  return Object.values(state.tasks).every(task => {
    return task.dueDate !== undefined;
  });
});

// Check all policies
const { valid, violations } = app.runtime.validatePolicies();
if (!valid) {
  console.log(`Policy violations: ${violations.join(', ')}`);
}
```

## Testing

Run the integration test suite:

```bash
npm test

# Expected output:
# ✅ Test Files  1 passed (1)
# ✅ Tests       11 passed (11)
```

## Next Steps

1. **Read the README**: Full API documentation
2. **Check the SPECIFICATION**: Formal technical details
3. **Review PROJECT_SUMMARY**: Architecture overview
4. **Integrate with obix-state**: Add persistence
5. **Build UI components**: Use obix-components

## Common Errors

### Error: "Team {id} not found"
- Make sure you've created the team before referencing it
- Verify the `teamId` matches a team in state

### Error: "Task {id} not found"
- Ensure the task was created with `CREATE_TASK`
- Verify you're using the correct task ID

### Violation: "unassigned_critical"
- Critical tasks must have at least one assignee
- Use `ASSIGN_TASK` to add an assignee or reduce priority

## Support

- 📖 See `README.md` for full API documentation
- 📋 Check `SPECIFICATION.tex` for technical details
- 📝 Review `MANIFEST.md` for file structure
- 💬 Email: okpalan@protonmail.com

---

*Built with OBIX Heart/Soul SDK*
*#NoGhosting Protocol ensures zero communication gaps*
