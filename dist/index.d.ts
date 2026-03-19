/**
 * OBIX TodoApp - Public API
 * Heart/Soul SDK for team collaboration with #NoGhosting protocol
 */
export * from './types';
export * from './runtime';
export * from './noshadowing-protocol';
import { TodoAppRuntime } from './runtime';
import { NoGhostingProtocol } from './noshadowing-protocol';
import { TodoAppState } from './types';
/**
 * Create a new TodoApp instance
 */
export declare function createTodoApp(initialState?: Partial<TodoAppState>): {
    runtime: TodoAppRuntime;
    protocol: NoGhostingProtocol;
    state: () => Readonly<TodoAppState>;
    dispatch: (action: any) => void;
    subscribe: (cb: (state: TodoAppState) => void) => () => void;
    validateCompliance: () => import("./noshadowing-protocol").NoGhostingViolation[];
    getEngagementReport: (teamId: string) => import("./noshadowing-protocol").EngagementReport;
    checkEscalations: () => {
        taskId: string;
        reason: string;
        severity: "info" | "warning" | "critical";
        recommendedAction: string;
    }[];
};
export type TodoApp = ReturnType<typeof createTodoApp>;
//# sourceMappingURL=index.d.ts.map