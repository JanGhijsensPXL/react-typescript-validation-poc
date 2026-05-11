import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

/**
 * MSW setup: start the mock server before all tests,
 * reset handlers after each test, and clean up after all tests.
 */
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
