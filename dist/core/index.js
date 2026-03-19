/**
 * OBIX TodoApp - Public API
 * Heart/Soul SDK for team collaboration with #NoGhosting protocol
 */
export * from './types';
export * from './runtime';
export * from './noshadowing-protocol';
import { TodoAppRuntime } from './runtime';
import { NoGhostingProtocol } from './noshadowing-protocol';
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