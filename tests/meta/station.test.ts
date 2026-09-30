import {
  emptyStation, recordWin, unlockedModules, buildableModules, canExpand,
  buildModule, residentsOf, loadStation, saveStation, RESCUES_PER_MODULE,
} from '../../src/meta/station';
import { STATIONS } from '../../src/meta/roster';

test('recordWin grows lifetime score and current-station rescues, banks unique VIPs', () => {
  let s = emptyStation();
  s = recordWin(s, ['botanist', 'chef'], 2);
  s = recordWin(s, ['botanist'], 1); // dupe VIP, +1 rescue
  expect(s.collectedVips.sort()).toEqual(['botanist', 'chef']);
  expect(s.totalRescued).toBe(3);
  expect(s.stationRescued).toBe(3);
});

test('a module unlocks once you have a VIP of its category', () => {
  let s = emptyStation();
  expect(unlockedModules(s)).toEqual([]);
  s = recordWin(s, ['botanist'], 1);
  expect(unlockedModules(s)).toEqual(['greenhouse']);
  expect(buildableModules(s)).toEqual(['greenhouse']);
});

test('expansion needs both an unlocked module and enough current-station rescues', () => {
  let s = recordWin(emptyStation(), ['botanist'], 1); // unlocked, but only 1 rescue
  expect(canExpand(s)).toBe(false);
  s = { ...s, stationRescued: RESCUES_PER_MODULE };
  expect(canExpand(s)).toBe(true);
  s = buildModule(s, 'greenhouse').state;
  expect(s.builtModules).toEqual(['greenhouse']);
  expect(buildableModules(s)).toEqual([]); // nothing else unlocked
  expect(canExpand(s)).toBe(false);
});

test('residents are the collected VIPs of a module', () => {
  const s = recordWin(emptyStation(), ['botanist', 'florist'], 2);
  expect(residentsOf(s, 'greenhouse').sort()).toEqual(['botanist', 'florist']);
  expect(residentsOf(s, 'galley')).toEqual([]);
});

test('completing the last module advances to the next station and resets per-station progress', () => {
  let s = emptyStation();
  const oneVipPerModule = STATIONS[0]!.modules.map((m) => STATIONS[0]!.vips.find((v) => v.module === m.id)!.id);
  s = recordWin(s, oneVipPerModule, RESCUES_PER_MODULE * 6);
  let completedOnce = false;
  for (const m of STATIONS[0]!.modules) {
    const out = buildModule(s, m.id);
    s = out.state;
    completedOnce = completedOnce || out.completed;
  }
  expect(completedOnce).toBe(true);
  expect(s.currentStation).toBe(1);
  expect(s.stationsCompleted).toBe(1);
  expect(s.builtModules).toEqual([]);      // reset for station 2
  expect(s.stationRescued).toBe(0);        // reset for station 2
  expect(s.totalRescued).toBe(RESCUES_PER_MODULE * 6); // lifetime score preserved
});

test('an old-shape save migrates without losing progress', () => {
  const store = {
    getItem: () => JSON.stringify({ totalRescued: 8, collectedVips: ['chef'], builtModules: ['galley'] }),
    setItem: () => { /* noop */ },
  } as unknown as Storage;
  const s = loadStation(store);
  expect(s.totalRescued).toBe(8);
  expect(s.stationRescued).toBe(8); // defaulted from totalRescued
  expect(s.currentStation).toBe(0);
  expect(s.stationsCompleted).toBe(0);
  expect(s.builtModules).toEqual(['galley']);
});

test('save/load round-trips through an injected storage', () => {
  const store: Record<string, string> = {};
  const fake = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
  let s = recordWin(emptyStation(), ['vet'], RESCUES_PER_MODULE);
  s = buildModule(s, 'petbay').state;
  saveStation(s, fake as unknown as Storage);
  expect(loadStation(fake as unknown as Storage)).toEqual(s);
});
