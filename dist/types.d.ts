/**
 * OBIX TodoApp - Core Type Definitions
 * Supports team collaboration with #NoGhosting protocol and compliance tracking
 */
/**
 * Engagement event types for #NoGhosting protocol
 * Tracks all interactions to prevent communication gaps
 */
export type EngagementEventType = 'task_created' | 'task_updated' | 'task_assigned' | 'task_completed' | 'comment_added' | 'status_changed' | 'deadline_approaching' | 'reminder_sent' | 'acknowledgment_received' | 'escalation_triggered';
/**
 * Engagement event - tracks every interaction for #NoGhosting compliance
 */
export interface EngagementEvent {
    id: string;
    type: EngagementEventType;
    timestamp: number;
    userId: string;
    taskId: string;
    metadata: Record<string, any>;
    acknowledged: boolean;
    acknowledgmentDeadline?: number;
}
/**
 * Task/Todo with hierarchical structure support
 */
export interface Task {
    id: string;
    title: string;
    description: string;
    parentId?: string;
    childIds: string[];
    assignedTo: string[];
    createdBy: string;
    teamId: string;
    status: 'open' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    createdAt: number;
    updatedAt: number;
    dueDate?: number;
    completedAt?: number;
    engagementEvents: EngagementEvent[];
    lastEngagementAt?: number;
    tags: string[];
    attachments: string[];
    customFields: Record<string, any>;
}
/**
 * Team member with role and status
 */
export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'maintainer' | 'contributor' | 'viewer';
    status: 'active' | 'inactive' | 'archived';
    joinedAt: number;
    lastActiveAt: number;
    settings: Record<string, any>;
}
/**
 * Team - group of collaborators
 */
export interface Team {
    id: string;
    name: string;
    description: string;
    createdAt: number;
    updatedAt: number;
    members: TeamMember[];
    settings: TeamSettings;
    complianceTrail: ComplianceEvent[];
}
/**
 * Team settings including #NoGhosting policy
 */
export interface TeamSettings {
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
/**
 * Compliance event for audit trail
 */
export interface ComplianceEvent {
    id: string;
    timestamp: number;
    type: 'task_created' | 'team_modified' | 'member_added' | 'member_removed' | 'policy_violation' | 'escalation';
    userId: string;
    details: Record<string, any>;
    severity: 'info' | 'warning' | 'critical';
}
/**
 * Action types for state management
 */
export type TodoAppAction = {
    type: 'CREATE_TASK';
    payload: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'engagementEvents'>;
} | {
    type: 'UPDATE_TASK';
    payload: {
        id: string;
        updates: Partial<Task>;
    };
} | {
    type: 'DELETE_TASK';
    payload: {
        id: string;
    };
} | {
    type: 'ASSIGN_TASK';
    payload: {
        taskId: string;
        userId: string;
    };
} | {
    type: 'UNASSIGN_TASK';
    payload: {
        taskId: string;
        userId: string;
    };
} | {
    type: 'COMPLETE_TASK';
    payload: {
        id: string;
    };
} | {
    type: 'ADD_ENGAGEMENT_EVENT';
    payload: {
        taskId: string;
        event: EngagementEvent;
    };
} | {
    type: 'CREATE_TEAM';
    payload: Omit<Team, 'id' | 'createdAt' | 'updatedAt' | 'complianceTrail'>;
} | {
    type: 'ADD_TEAM_MEMBER';
    payload: {
        teamId: string;
        member: TeamMember;
    };
} | {
    type: 'REMOVE_TEAM_MEMBER';
    payload: {
        teamId: string;
        userId: string;
    };
} | {
    type: 'ADD_COMPLIANCE_EVENT';
    payload: {
        teamId: string;
        event: ComplianceEvent;
    };
};
/**
 * TodoApp state
 */
export interface TodoAppState {
    tasks: Record<string, Task>;
    teams: Record<string, Team>;
    currentTeamId: string;
    currentUserId: string;
    lastSyncAt: number;
}
//# sourceMappingURL=types.d.ts.map