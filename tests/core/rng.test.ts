import { createRng } from '../../src/core/rng';

test('same seed gives same sequence', () => {
  const a = createRng(42), b = createRng(42);
  expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
});

test('different seeds differ', () => {
  expect(createRng(1).next()).not.toBe(createRng(2).next());
});

test('nextInt stays in range and state resumes sequence', () => {
  const r = createRng(7);
  for (let i = 0; i < 100; i++) {
    const v = r.nextInt(5);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(5);
  }
  const s = r.state();
  const resumed = createRng(s);
  expect(resumed.next()).toBe(createRng(s).next());
});
