import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { resetPwaRegisterMock } from './pwaRegisterMock';

beforeEach(() => {
  resetPwaRegisterMock();
});
