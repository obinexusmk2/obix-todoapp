/**
 * OBIX TodoApp Runtime
 * Manages task state, team collaboration, and #NoGhosting protocol enforcement
 */
import { Task, Team, TodoAppState, TodoAppAction } from './types';
/**
 * TodoAppRuntime manages the complete todo application state
 * Implements #NoGhosting protocol with engagement tracking and compliance
 */
export declare class TodoAppRuntime {
    private state;
    private subscribers;
    private policies;
    constructor(initialState?: Partial<TodoAppState>);
    /**
     * Initialize default policies for #NoGhosting compliance
     */
    private initializeDefaultPolicies;
    /**
     * Add a custom policy
     */
    addPolicy(name: string, policy: (state: TodoAppState) => boolean): void;
    /**
     * Validate all policies
     */
    validatePolicies(): {
        valid: boolean;
        violations: string[];
    };
    /**
     * Dispatch an action to update state
     */
    dispatch(action: TodoAppAction): void;
    /**
     * Record an engagement event (for #NoGhosting tracking)
     */
    private recordEngagementEvent;
    /**
     * Record a compliance event for audit trail
     */
    private recordComplianceEvent;
    /**
     * Get task by ID
     */
    getTask(id: string): Task | null;
    /**
     * Get all tasks for current team
     */
    getTeamTasks(teamId?: string): Task[];
    /**
     * Get team by ID
     */
    getTeam(id: string): Team | null;
    /**
     * Get current state
     */
    getState(): Readonly<TodoAppState>;
    /**
     * Subscribe to state changes
     */
    subscribe(callback: (state: TodoAppState) => void): () => void;
    /**
     * Notify all subscribers of state change
     */
    private notifySubscribers;
    /**
     * Generate unique ID
     */
    private generateId;
    /**
     * Set current user context
     */
    setCurrentUser(userId: string): void;
    /**
     * Set current team context
     */
    setCurrentTeam(teamId: string): void;
}
//# sourceMappingURL=runtime.d.ts.map