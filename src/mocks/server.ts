import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server for Vitest environment.
 * Automatically intercepts HTTP requests during test runs.
 */
export const server = setupServer(...handlers);
