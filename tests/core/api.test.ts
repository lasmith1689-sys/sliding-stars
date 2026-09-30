import * as core from '../../src/core';

test('public API surface is complete', () => {
  expect(typeof core.loadLevel).toBe('function');
  expect(typeof core.trySwap).toBe('function');
  expect(typeof core.solve).toBe('function');
  expect(typeof core.createRng).toBe('function');
  expect(typeof core.findMatches).toBe('function');
  expect(core.MAX_TIER).toBe(5);
});
