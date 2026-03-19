# OBIX TodoApp

**Heart/Soul SDK for Team Collaboration with #NoGhosting Protocol**

Version: 0.1.0
Author: OBINexus (okpalan@protonmail.com)
License: MIT

---

## Overview

OBIX TodoApp is a team collaboration task management system built on the OBIX Heart/Soul SDK. It implements the **#NoGhosting Protocol** — a comprehensive framework for preventing communication gaps, ensuring clear ownership, and maintaining accountability through milestone-based engagement tracking.

### Key Features

- **#NoGhosting Protocol**: Enforces communication standards to prevent task abandonment and silent failures
- **Hierarchical Tasks**: Support for complex task dependencies with parent-child relationships
- **Team Collaboration**: Multi-user task assignment with role-based access control
- **Compliance Audit Trail**: Complete record of all team modifications and policy enforcement events
- **Engagement Tracking**: Automatic recording of all interactions with acknowledgment requirements
- **Escalation Management**: Intelligent detection and escalation of stalled, critical, or overdue tasks
- **State Persistence**: Leverages obix-state for reliable data storage and sync

---

## Architecture

### Core Components

#### 1. **TodoAppRuntime**
Manages the complete application state and dispatch system. Coordinates with obix-core for component lifecycle management.

```
TodoAppRuntime
├── State Management (tasks, teams, users)
├── Action Dispatch (CREATE_TASK, ASSIGN_TASK, COMPLETE_TASK, etc.)
├── Policy Enforcement (clear assignment, critical acknowledgment)
├── Subscription System (reactive updates)
└── Compliance Recording
```

#### 2. **NoGhostingProtocol**
Implements communication and engagement standards to prevent ghosting (communication gaps).

**Violation Types:**
- `unassigned_critical`: Critical tasks without clear ownership
- `overdue_acknowledgment`: Assignment acknowledgments past deadline
- `stalled_task`: Tasks with no activity for extended periods
- `unacknowledged_assignment`: Tasks awaiting user acknowledgment

**Escalation Detection:**
- Critical tasks inactive beyond threshold
- Tasks past due date
- Unacknowledged critical assignments

#### 3. **Type System**
Complete type definitions for tasks, teams, engagement events, and compliance tracking.

- **Task**: Individual work item with hierarchy, assignments, and engagement history
- **Team**: Group of collaborators with settings and compliance trail
- **EngagementEvent**: Tracked interaction (assignment, completion, comment, etc.)
- **ComplianceEvent**: Audit trail entry for policy enforcement

---

## #NoGhosting Protocol Details

The #NoGhosting Protocol enforces these core principles:

### 1. **Clear Assignment**
Every task must have at least one assignee (critical tasks especially).

```typescript
// Violation: Critical task without assignee
{
  type: 'unassigned_critical',
  severity: 'critical'
}
```

### 2. **Required Acknowledgment**
Task assignments require acknowledgment within a configurable timeout (default: 2 hours).

```typescript
interface EngagementEvent {
  type: 'task_assigned';
  acknowledged: boolean;
  acknowledgmentDeadline: number;
}
```

### 3. **Activity Monitoring**
Tasks in progress are tracked for extended inactivity. Reminder threshold triggers notifications.

```typescript
// Stalled if inactive > 24 hours (default reminderThresholdHours)
{
  type: 'stalled_task',
  severity: 'warning'
}
```

### 4. **Escalation Path**
Critical tasks escalate automatically if unresolved beyond threshold (default: 48 hours).

```typescript
// Escalate if:
// - Critical + inactive > 48 hours
// - Overdue + unresolved
// - Critical + unacknowledged
```

### 5. **Complete Audit Trail**
Every action is recorded with timestamp, user, and details for compliance verification.

---

## Data Structures

### Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;

  // Hierarchy
  parentId?: string;
  childIds: string[];

  // Assignment
  assignedTo: string[];
  createdBy: string;
  teamId: string;

  // Status tracking
  status: 'open' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Timestamps
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  completedAt?: number;

  // Engagement & compliance
  engagementEvents: EngagementEvent[];
  lastEngagementAt?: number;
  tags: string[];
  attachments: string[];
  customFields: Record<string, any>;
}
```

### Team
```typescript
interface Team {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;

  members: TeamMember[];
  settings: TeamSettings;
  complianceTrail: ComplianceEvent[];
}
```

### TeamSettings (includes #NoGhosting parameters)
```typescript
interface TeamSettings {
  visibility: 'private' | 'internal' | 'public';
  enableNotifications: boolean;
  enableReminders: boolean;
  reminderThresholdHours: number;
  escalationEnabled: boolean;
  escalationThresholdHours: number;
  requireAcknowledgment: boolean;
  acknowledgmentTimeoutHours: number;
  archiveCompletedTasksDays?: number;
}
```

---

## API Usage

### Creating a TodoApp Instance

```typescript
import { createTodoApp } from '@obinexusltd/obix-todoapp';

const app = createTodoApp();

// Set user context
app.runtime.setCurrentUser('user-alice');

// Create team
app.dispatch({
  type: 'CREATE_TEAM',
  payload: {
    name: 'Engineering',
    description: 'Core team',
    members: [...],
    settings: {
      requireAcknowledgment: true,
      acknowledgmentTimeoutHours: 2,
      escalationEnabled: true,
      escalationThresholdHours: 48,
    }
  }
});

// Set team context
app.runtime.setCurrentTeam('team-engineering');
```

### Creating and Managing Tasks

```typescript
// Create task
app.dispatch({
  type: 'CREATE_TASK',
  payload: {
    title: 'Implement authentication',
    description: 'Add OAuth2 support',
    assignedTo: ['user-bob'],
    createdBy: 'user-alice',
    teamId: 'team-engineering',
    priority: 'high',
    status: 'open',
    dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    childIds: [],
    tags: ['feature', 'backend'],
    attachments: [],
    customFields: {},
  }
});

// Assign additional user
app.dispatch({
  type: 'ASSIGN_TASK',
  payload: {
    taskId: 'task-123',
    userId: 'user-charlie'
  }
});

// Complete task
app.dispatch({
  type: 'COMPLETE_TASK',
  payload: { id: 'task-123' }
});
```

### Compliance & Monitoring

```typescript
// Check for #NoGhosting violations
const violations = app.validateCompliance();
violations.forEach(v => {
  console.log(`${v.type}: ${v.description}`);
});

// Get engagement report
const report = app.getEngagementReport('team-engineering');
console.log(`Engagement rate: ${report.engagementRate * 100}%`);
console.log(`Total tasks: ${report.totalTasks}`);
console.log(`Member stats:`, report.memberEngagement);

// Check for escalations
const escalations = app.checkEscalations();
escalations.forEach(e => {
  console.log(`⚠️ ${e.severity}: ${e.reason}`);
  console.log(`   Action: ${e.recommendedAction}`);
});

// Acknowledge an event
app.protocol.acknowledgeEvent('task-123', 'event-456', 'user-bob');

// Get unacknowledged tasks for user
const pending = app.protocol.getUnacknowledgedTasks('user-bob');
console.log(`User has ${pending.length} unacknowledged tasks`);
```

### State Subscription

```typescript
// Subscribe to state changes
const unsubscribe = app.subscribe((state) => {
  console.log(`State updated. Tasks: ${Object.keys(state.tasks).length}`);
});

// Later: unsubscribe
unsubscribe();
```

---

## Integration with OBIX Packages

### obix-core
- Component lifecycle management
- Policy enforcement system
- Instance management

### obix-state
- Task data persistence
- State synchronization
- Recovery mechanisms

### Future Integrations
- **obix-components**: React/UI layer for TodoApp
- **obix-router**: Deep-linking and navigation
- **obix-telemetry**: Engagement tracking and analytics
- **obix-forms**: Task creation/editing dialogs

---

## Testing

Run the integration test suite:

```bash
npm test
```

Tests cover:
- #NoGhosting violation detection
- Task assignment and completion
- Team collaboration workflows
- Escalation detection
- Engagement reporting
- Compliance audit trail

---

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Lint
```bash
npm run lint
```

---

## Compliance & Legal

### #NoGhosting Protocol Reference
This implementation follows the OBINexus Legal Policy Framework for team collaboration:

- **HACC Protocol**: Hierarchical Accountability & Communication Compliance
- **Anti-Ghosting**: Ensures no communication gaps or silent failures
- **Milestone-Based**: Investment in features tied to engagement milestones
- **OpenSense Recruitment**: Transparent team composition and role clarity

### Audit Trail
All team modifications and policy enforcement are recorded in `complianceTrail`. This provides:
- Complete history of who made what changes and when
- Policy violation records with context
- Escalation triggers and resolutions
- Member lifecycle tracking

---

## Performance Considerations

- **State Updates**: O(1) task lookup via ID indexing
- **Compliance Checks**: O(n) where n = number of tasks
- **Engagement Reports**: O(n*m) where n = tasks, m = events per task
- **Subscription Notifications**: Batched at dispatch time

---

## Roadmap

- [ ] Real-time sync with obix-adapter
- [ ] Multi-device conflict resolution
- [ ] Advanced reporting and analytics dashboard
- [ ] Integration with external calendars/scheduling
- [ ] Custom workflow templates
- [ ] AI-powered escalation suggestions
- [ ] Mobile app (React Native)

---

## Support

For issues, questions, or contributions:
- Email: okpalan@protonmail.com
- GitHub: [OBINexus/obix-todoapp](https://github.com/obinexus/obix-todoapp)

---

**Built with OBIX Heart/Soul SDK**
*Empowering distributed teams with clear accountability and zero ghosting.*
