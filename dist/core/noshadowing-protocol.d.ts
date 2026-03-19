/**
 * #NoGhosting Protocol Implementation
 * Ensures no communication gaps, clear ownership, and milestone-based accountability
 *
 * Reference: OBINexus Legal Policy Framework - HACC Protocol
 * "Ghosting" = absence of expected communication or acknowledgment
 * Prevents: task abandonment, silent failures, unclear ownership
 */
import { TodoAppRuntime } from './runtime';
import { Task } from './types';
export interface NoGhostingViolation {
    type: 'unacknowledged_assignment' | 'overdue_acknowledgment' | 'stalled_task' | 'unassigned_critical';
    taskId: string;
    severity: 'warning' | 'critical';
    description: string;
    affectedUsers: string[];
    timeoutAt?: number;
}
export interface EngagementReport {
    teamId: string;
    totalTasks: number;
    engagementRate: number;
    averageResponseTime: number;
    violations: NoGhostingViolation[];
    memberEngagement: Record<string, MemberEngagementStats>;
}
export interface MemberEngagementStats {
    userId: string;
    name: string;
    tasksAssigned: number;
    tasksCompleted: number;
    tasksInProgress: number;
    tasksBlocked: number;
    averageCompletionTime: number;
    lastActivityAt: number;
    acknowledgedCount: number;
    unacknowledgedCount: number;
    escalationCount: number;
}
/**
 * NoGhostingProtocol enforces communication and engagement standards
 */
export declare class NoGhostingProtocol {
    private runtime;
    constructor(runtime: TodoAppRuntime);
    /**
     * Check for #NoGhosting violations
     * Detects unacknowledged assignments, stalled tasks, and communication gaps
     */
    validateCompliance(): NoGhostingViolation[];
    /**
     * Generate engagement report for a team
     */
    getEngagementReport(teamId: string): EngagementReport;
    /**
     * Check for escalation-worthy situations
     * Returns tasks that need escalation attention
     */
    checkEscalations(): Array<{
        taskId: string;
        reason: string;
        severity: 'info' | 'warning' | 'critical';
        recommendedAction: string;
    }>;
    /**
     * Acknowledge an engagement event (for #NoGhosting compliance)
     */
    acknowledgeEvent(taskId: string, eventId: string, userId: string): boolean;
    /**
     * Get unacknowledged tasks for a user
     */
    getUnacknowledgedTasks(userId: string): Task[];
}
//# sourceMappingURL=noshadowing-protocol.d.ts.map