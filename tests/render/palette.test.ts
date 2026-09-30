import { TIER_FILL } from '../../src/render/palette';
import type { Tier } from '../../src/core/types';

function luminance(hex: number): number {
  const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

test('tier fill brightness ramps strictly upward (visual hierarchy guard)', () => {
  const tiers: Tier[] = [1, 2, 3, 4, 5];
  for (let i = 1; i < tiers.length; i++) {
    const lo = luminance(TIER_FILL[tiers[i - 1]!]);
    const hi = luminance(TIER_FILL[tiers[i]!]);
    expect(hi).toBeGreaterThan(lo);
  }
});
