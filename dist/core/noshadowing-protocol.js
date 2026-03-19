/**
 * #NoGhosting Protocol Implementation
 * Ensures no communication gaps, clear ownership, and milestone-based accountability
 *
 * Reference: OBINexus Legal Policy Framework - HACC Protocol
 * "Ghosting" = absence of expected communication or acknowledgment
 * Prevents: task abandonment, silent failures, unclear ownership
 */
/**
 * NoGhostingProtocol enforces communication and engagement standards
 */
export class NoGhostingProtocol {
    constructor(runtime) {
        this.runtime = runtime;
    }
    /**
     * Check for #NoGhosting violations
     * Detects unacknowledged assignments, stalled tasks, and communication gaps
     */
    validateCompliance() {
        const violations = [];
        const state = this.runtime.getState();
        const now = Date.now();
        for (const task of Object.values(state.tasks)) {
            // Check for unassigned critical tasks
            if (task.priority === 'critical' && task.assignedTo.length === 0) {
                violations.push({
                    type: 'unassigned_critical',
                    taskId: task.id,
                    severity: 'critical',
                    description: `Critical task "${task.title}" has no assignee`,
                    affectedUsers: [],
                });
            }
            // Check for unacknowledged assignments
            const team = state.teams[task.teamId];
            if (team?.settings.requireAcknowledgment) {
                for (const event of task.engagementEvents) {
                    if (event.type === 'task_assigned' &&
                        !event.acknowledged &&
                        event.acknowledgmentDeadline &&
                        now > event.acknowledgmentDeadline) {
                        violations.push({
                            type: 'overdue_acknowledgment',
                            taskId: task.id,
                            severity: 'critical',
                            description: `Assignment acknowledgment overdue for "${task.title}"`,
                            affectedUsers: task.assignedTo,
                            timeoutAt: event.acknowledgmentDeadline,
                        });
                    }
                }
            }
            // Check for stalled tasks (no activity for extended period)
            if (task.status === 'in_progress' &&
                team &&
                task.lastEngagementAt) {
                const stalledThresholdMs = team.settings.reminderThresholdHours * 60 * 60 * 1000;
                if (now - task.lastEngagementAt > stalledThresholdMs) {
                    violations.push({
                        type: 'stalled_task',
                        taskId: task.id,
                        severity: 'warning',
                        description: `Task "${task.title}" has no activity for ${team.settings.reminderThresholdHours} hours`,
                        affectedUsers: task.assignedTo,
                    });
                }
            }
        }
        return violations;
    }
    /**
     * Generate engagement report for a team
     */
    getEngagementReport(teamId) {
        const state = this.runtime.getState();
        const team = state.teams[teamId];
        if (!team)
            throw new Error(`Team ${teamId} not found`);
        const tasks = Object.values(state.tasks).filter((t) => t.teamId === teamId);
        const violations = this.validateCompliance();
        const memberStats = {};
        // Initialize stats for all team members
        for (const member of team.members) {
            memberStats[member.id] = {
                userId: member.id,
                name: member.name,
                tasksAssigned: 0,
                tasksCompleted: 0,
                tasksInProgress: 0,
                tasksBlocked: 0,
                averageCompletionTime: 0,
                lastActivityAt: member.lastActiveAt,
                acknowledgedCount: 0,
                unacknowledgedCount: 0,
                escalationCount: 0,
            };
        }
        // Aggregate task data
        let totalCompletionTime = 0;
        let completedCount = 0;
        for (const task of tasks) {
            for (const userId of task.assignedTo) {
                if (memberStats[userId]) {
                    memberStats[userId].tasksAssigned++;
                    if (task.status === 'completed') {
                        memberStats[userId].tasksCompleted++;
                        if (task.completedAt && task.createdAt) {
                            totalCompletionTime += task.completedAt - task.createdAt;
                            completedCount++;
                        }
                    }
                    else if (task.status === 'in_progress') {
                        memberStats[userId].tasksInProgress++;
                    }
                    else if (task.status === 'blocked') {
                        memberStats[userId].tasksBlocked++;
                    }
                    // Count acknowledgments
                    for (const event of task.engagementEvents) {
                        if (event.type === 'task_assigned' && event.userId === userId) {
                            if (event.acknowledged) {
                                memberStats[userId].acknowledgedCount++;
                            }
                            else {
                                memberStats[userId].unacknowledgedCount++;
                            }
                        }
                    }
                }
            }
        }
        const averageCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;
        // Calculate engagement rate
        let totalAcknowledgements = 0;
        for (const stats of Object.values(memberStats)) {
            totalAcknowledgements += stats.acknowledgedCount + stats.unacknowledgedCount;
        }
        const engagementRate = totalAcknowledgements > 0
            ? Object.values(memberStats).reduce((sum, s) => sum + s.acknowledgedCount, 0) / totalAcknowledgements
            : 0;
        return {
            teamId,
            totalTasks: tasks.length,
            engagementRate,
            averageResponseTime: averageCompletionTime,
            violations,
            memberEngagement: memberStats,
        };
    }
    /**
     * Check for escalation-worthy situations
     * Returns tasks that need escalation attention
     */
    checkEscalations() {
        const escalations = [];
        const state = this.runtime.getState();
        const now = Date.now();
        for (const task of Object.values(state.tasks)) {
            const team = state.teams[task.teamId];
            if (!team || !team.settings.escalationEnabled)
                continue;
            const escalationThresholdMs = team.settings.escalationThresholdHours * 60 * 60 * 1000;
            // Escalate critical tasks with no activity
            if (task.priority === 'critical' && task.lastEngagementAt) {
                if (now - task.lastEngagementAt > escalationThresholdMs) {
                    escalations.push({
                        taskId: task.id,
                        reason: `Critical task with no activity for ${team.settings.escalationThresholdHours} hours`,
                        severity: 'critical',
                        recommendedAction: 'Immediately notify assignees and team lead',
                    });
                }
            }
            // Escalate overdue tasks
            if (task.dueDate && now > task.dueDate && task.status !== 'completed') {
                escalations.push({
                    taskId: task.id,
                    reason: `Task overdue by ${Math.floor((now - task.dueDate) / (60 * 60 * 1000))} hours`,
                    severity: 'warning',
                    recommendedAction: 'Contact assignees to assess blockers and provide support',
                });
            }
            // Escalate unacknowledged critical assignments
            const unacknowledgedCritical = task.engagementEvents.filter((e) => e.type === 'task_assigned' && !e.acknowledged && task.priority === 'critical');
            if (unacknowledgedCritical.length > 0) {
                escalations.push({
                    taskId: task.id,
                    reason: 'Critical task assignment not acknowledged',
                    severity: 'critical',
                    recommendedAction: 'Send urgent notification to unresponsive assignees',
                });
            }
        }
        return escalations;
    }
    /**
     * Acknowledge an engagement event (for #NoGhosting compliance)
     */
    acknowledgeEvent(taskId, eventId, userId) {
        const task = this.runtime.getTask(taskId);
        if (!task)
            return false;
        const event = task.engagementEvents.find((e) => e.id === eventId);
        if (!event)
            return false;
        event.acknowledged = true;
        const team = this.runtime.getState().teams[task.teamId];
        // Record compliance event
        if (team) {
            this.runtime.dispatch({
                type: 'ADD_COMPLIANCE_EVENT',
                payload: {
                    teamId: task.teamId,
                    event: {
                        id: `ack-${eventId}`,
                        timestamp: Date.now(),
                        type: 'task_created', // reusing type for tracking
                        userId,
                        teamId: task.teamId,
                        details: {
                            eventId,
                            taskId,
                            acknowledgedAt: Date.now(),
                        },
                        severity: 'info',
                    },
                },
            });
        }
        return true;
    }
    /**
     * Get unacknowledged tasks for a user
     */
    getUnacknowledgedTasks(userId) {
        const state = this.runtime.getState();
        const unacknowledged = [];
        for (const task of Object.values(state.tasks)) {
            if (!task.assignedTo.includes(userId))
                continue;
            const assignmentEvent = task.engagementEvents.find((e) => e.type === 'task_assigned' && e.metadata.assignedUserId === userId && !e.acknowledged);
            if (assignmentEvent) {
                unacknowledged.push(task);
            }
        }
        return unacknowledged;
    }
}
//# sourceMappingURL=noshadowing-protocol.js.map