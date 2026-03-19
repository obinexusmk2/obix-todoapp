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
export function createTodoApp(initialState?: Partial<TodoAppState>) {
  const runtime = new TodoAppRuntime(initialState);
  const protocol = new NoGhostingProtocol(runtime);

  return {
    runtime,
    protocol,
    state: () => runtime.getState(),
    dispatch: (action: any) => runtime.dispatch(action),
    subscribe: (cb: (state: TodoAppState) => void) => runtime.subscribe(cb),
    validateCompliance: () => protocol.validateCompliance(),
    getEngagementReport: (teamId: string) => protocol.getEngagementReport(teamId),
    checkEscalations: () => protocol.checkEscalations(),
  };
}

export type TodoApp = ReturnType<typeof createTodoApp>;
