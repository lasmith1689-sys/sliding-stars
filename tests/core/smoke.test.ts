import { ENGINE_VERSION } from '../../src/core/version';

test('engine module loads', () => {
  expect(ENGINE_VERSION).toBe('0.1.0');
});
