/**
 * OBIX TodoApp - Public API
 * Heart/Soul SDK for team collaboration with #NoGhosting protocol
 */
export * from './types.js';
export * from './runtime.js';
export * from './noshadowing-protocol.js';
import { TodoAppRuntime } from './runtime.js';
import { NoGhostingProtocol } from './noshadowing-protocol.js';
/**
 * Create a new TodoApp instance
 */
export function createTodoApp(initialState) {
    const runtime = new TodoAppRuntime(initialState);
    const protocol = new NoGhostingProtocol(runtime);
    return {
        runtime,
        protocol,
        state: () => runtime.getState(),
        dispatch: (action) => runtime.dispatch(action),
        subscribe: (cb) => runtime.subscribe(cb),
        validateCompliance: () => protocol.validateCompliance(),
        getEngagementReport: (teamId) => protocol.getEngagementReport(teamId),
        checkEscalations: () => protocol.checkEscalations(),
    };
}
//# sourceMappingURL=index.js.map