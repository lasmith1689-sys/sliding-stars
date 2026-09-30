import { loadLevel } from '../../src/core/level';
import { settle } from '../../src/core/game';
import type { GameEvent } from '../../src/core/events';
import type { LevelDef } from '../../src/core/types';

// Dome at (1,0): left is off-board, so it faces RIGHT -> door cell is (1,1).
const DEF: LevelDef = {
  id: 0,
  mask: ['###', '###', '###'],
  tiles: ['412', 'D43', '215'],
  survivors: [],
  goal: { type: 'rescueN', n: 1 },
  seed: 1,
};

test('a survivor on the door cell is rescued; a non-door side is not', () => {
  const s = loadLevel(DEF);
  s.survivors = [
    { id: 0, r: 1, c: 1, state: 'grounded', need: null }, // door cell of the dome
    { id: 1, r: 0, c: 0, state: 'grounded', need: null }, // directly above the dome (non-door)
  ];
  const ev: GameEvent[] = [];
  settle(s, ev, false);
  expect(s.survivors[0]!.state).toBe('housed');
  expect(s.survivors[1]!.state).toBe('grounded');
  expect(s.rescued).toBe(1);
});

test('a survivor standing on the station tile itself is still rescued (no softlock)', () => {
  const s = loadLevel(DEF);
  s.survivors = [{ id: 0, r: 1, c: 0, state: 'grounded', need: null }]; // on the dome cell
  settle(s, [], false);
  expect(s.survivors[0]!.state).toBe('housed');
});
