/**
 * OBIX TodoApp Runtime
 * Manages task state, team collaboration, and #NoGhosting protocol enforcement
 */
/**
 * TodoAppRuntime manages the complete todo application state
 * Implements #NoGhosting protocol with engagement tracking and compliance
 */
export class TodoAppRuntime {
    constructor(initialState = {}) {
        this.subscribers = new Set();
        this.policies = new Map();
        this.state = {
            tasks: {},
            teams: {},
            currentTeamId: '',
            currentUserId: '',
            lastSyncAt: Date.now(),
            ...initialState,
        };
        this.initializeDefaultPolicies();
    }
    /**
     * Initialize default policies for #NoGhosting compliance
     */
    initializeDefaultPolicies() {
        // Policy: Tasks must have clear assignments
        this.addPolicy('clear_assignment', (state) => {
            const team = state.teams[state.currentTeamId];
            if (!team)
                return true;
            for (const task of Object.values(state.tasks)) {
                if (task.teamId === state.currentTeamId && task.status !== 'completed' && task.assignedTo.length === 0) {
                    return false;
                }
            }
            return true;
        });
        // Policy: Critical tasks must be acknowledged within timeout
        this.addPolicy('critical_acknowledgment', (state) => {
            const team = state.teams[state.currentTeamId];
            if (!team || !team.settings.requireAcknowledgment)
                return true;
            const now = Date.now();
            for (const task of Object.values(state.tasks)) {
                if (task.teamId === state.currentTeamId && task.priority === 'critical') {
                    const lastEvent = task.engagementEvents[task.engagementEvents.length - 1];
                    if (lastEvent && !lastEvent.acknowledged) {
                        const timeoutMs = team.settings.acknowledgmentTimeoutHours * 60 * 60 * 1000;
                        if (now - lastEvent.timestamp > timeoutMs) {
                            return false;
                        }
                    }
                }
            }
            return true;
        });
    }
    /**
     * Add a custom policy
     */
    addPolicy(name, policy) {
        this.policies.set(name, policy);
    }
    /**
     * Validate all policies
     */
    validatePolicies() {
        const violations = [];
        for (const [name, policy] of this.policies) {
            if (!policy(this.state)) {
                violations.push(name);
            }
        }
        return { valid: violations.length === 0, violations };
    }
    /**
     * Dispatch an action to update state
     */
    dispatch(action) {
        switch (action.type) {
            case 'CREATE_TASK': {
                const taskId = this.generateId('task');
                const now = Date.now();
                const newTask = {
                    ...action.payload,
                    id: taskId,
                    createdAt: now,
                    updatedAt: now,
                    engagementEvents: [],
                };
                this.state.tasks[taskId] = newTask;
                this.recordComplianceEvent('task_created', action.payload.teamId, { taskId });
                // Record engagement event for each assignment
                for (const userId of action.payload.assignedTo) {
                    this.recordEngagementEvent(taskId, 'task_assigned', {
                        assignedUserId: userId,
                    });
                }
                break;
            }
            case 'UPDATE_TASK': {
                const task = this.state.tasks[action.payload.id];
                if (!task)
                    throw new Error(`Task ${action.payload.id} not found`);
                this.state.tasks[action.payload.id] = {
                    ...task,
                    ...action.payload.updates,
                    updatedAt: Date.now(),
                };
                break;
            }
            case 'DELETE_TASK': {
                delete this.state.tasks[action.payload.id];
                break;
            }
            case 'ASSIGN_TASK': {
                const task = this.state.tasks[action.payload.taskId];
                if (!task)
                    throw new Error(`Task ${action.payload.taskId} not found`);
                if (!task.assignedTo.includes(action.payload.userId)) {
                    task.assignedTo.push(action.payload.userId);
                    task.updatedAt = Date.now();
                    this.recordEngagementEvent(action.payload.taskId, 'task_assigned', {
                        assignedUserId: action.payload.userId,
                    });
                }
                break;
            }
            case 'UNASSIGN_TASK': {
                const task = this.state.tasks[action.payload.taskId];
                if (!task)
                    throw new Error(`Task ${action.payload.taskId} not found`);
                task.assignedTo = task.assignedTo.filter((id) => id !== action.payload.userId);
                task.updatedAt = Date.now();
                break;
            }
            case 'COMPLETE_TASK': {
                const task = this.state.tasks[action.payload.id];
                if (!task)
                    throw new Error(`Task ${action.payload.id} not found`);
                task.status = 'completed';
                task.completedAt = Date.now();
                task.updatedAt = Date.now();
                this.recordEngagementEvent(action.payload.id, 'task_completed', {
                    completionTime: task.completedAt,
                });
                break;
            }
            case 'ADD_ENGAGEMENT_EVENT': {
                const task = this.state.tasks[action.payload.taskId];
                if (!task)
                    throw new Error(`Task ${action.payload.taskId} not found`);
                task.engagementEvents.push(action.payload.event);
                task.lastEngagementAt = action.payload.event.timestamp;
                task.updatedAt = Date.now();
                break;
            }
            case 'CREATE_TEAM': {
                const teamId = this.generateId('team');
                const now = Date.now();
                const newTeam = {
                    ...action.payload,
                    id: teamId,
                    createdAt: now,
                    updatedAt: now,
                    complianceTrail: [],
                };
                this.state.teams[teamId] = newTeam;
                break;
            }
            case 'ADD_TEAM_MEMBER': {
                const team = this.state.teams[action.payload.teamId];
                if (!team)
                    throw new Error(`Team ${action.payload.teamId} not found`);
                team.members.push(action.payload.member);
                team.updatedAt = Date.now();
                this.recordComplianceEvent('member_added', action.payload.teamId, {
                    userId: action.payload.member.id,
                });
                break;
            }
            case 'REMOVE_TEAM_MEMBER': {
                const team = this.state.teams[action.payload.teamId];
                if (!team)
                    throw new Error(`Team ${action.payload.teamId} not found`);
                team.members = team.members.filter((m) => m.id !== action.payload.userId);
                team.updatedAt = Date.now();
                this.recordComplianceEvent('member_removed', action.payload.teamId, {
                    userId: action.payload.userId,
                });
                break;
            }
            case 'ADD_COMPLIANCE_EVENT': {
                const team = this.state.teams[action.payload.teamId];
                if (!team)
                    throw new Error(`Team ${action.payload.teamId} not found`);
                team.complianceTrail.push(action.payload.event);
                team.updatedAt = Date.now();
                break;
            }
        }
        this.state.lastSyncAt = Date.now();
        this.notifySubscribers();
    }
    /**
     * Record an engagement event (for #NoGhosting tracking)
     */
    recordEngagementEvent(taskId, type, metadata) {
        const task = this.state.tasks[taskId];
        if (!task)
            return;
        const event = {
            id: this.generateId('event'),
            type,
            timestamp: Date.now(),
            userId: this.state.currentUserId,
            taskId,
            metadata,
            acknowledged: false,
        };
        const team = this.state.teams[task.teamId];
        if (team && team.settings.requireAcknowledgment && type === 'task_assigned') {
            event.acknowledgmentDeadline =
                Date.now() + team.settings.acknowledgmentTimeoutHours * 60 * 60 * 1000;
        }
        this.dispatch({ type: 'ADD_ENGAGEMENT_EVENT', payload: { taskId, event } });
    }
    /**
     * Record a compliance event for audit trail
     */
    recordComplianceEvent(type, teamId, details) {
        const team = this.state.teams[teamId];
        if (!team)
            return;
        const event = {
            id: this.generateId('compliance'),
            timestamp: Date.now(),
            type,
            userId: this.state.currentUserId,
            teamId,
            details,
            severity: 'info',
        };
        this.dispatch({ type: 'ADD_COMPLIANCE_EVENT', payload: { teamId, event } });
    }
    /**
     * Get task by ID
     */
    getTask(id) {
        return this.state.tasks[id] || null;
    }
    /**
     * Get all tasks for current team
     */
    getTeamTasks(teamId) {
        const team = teamId || this.state.currentTeamId;
        return Object.values(this.state.tasks).filter((t) => t.teamId === team);
    }
    /**
     * Get team by ID
     */
    getTeam(id) {
        return this.state.teams[id] || null;
    }
    /**
     * Get current state
     */
    getState() {
        return Object.freeze({ ...this.state });
    }
    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    /**
     * Notify all subscribers of state change
     */
    notifySubscribers() {
        this.subscribers.forEach((cb) => cb(this.state));
    }
    /**
     * Generate unique ID
     */
    generateId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Set current user context
     */
    setCurrentUser(userId) {
        this.state.currentUserId = userId;
    }
    /**
     * Set current team context
     */
    setCurrentTeam(teamId) {
        this.state.currentTeamId = teamId;
    }
}
//# sourceMappingURL=runtime.js.map