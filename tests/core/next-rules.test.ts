import { loadLevel } from '../../src/core/level';
import { findHint, hasLegalMove, shuffleBoard } from '../../src/core/shuffle';
import { trySwap, settle } from '../../src/core/game';
import { resolveMatchesOnce } from '../../src/core/resolve';
import { generateLevel, paramsForLevel } from '../../src/core/generator';
import type { GameEvent, LevelDef } from '../../src/core';

const make = (tiles: string[], extra: Partial<LevelDef> = {}) => loadLevel({
  id: 0, tiles, mask: tiles.map(row => row.replace(/[^.]/g, '#')),
  survivors: [], goal: { type: 'rescueN', n: 2 }, seed: 7, ...extra,
});

test('a hint never asks the player to swap a frozen tile', () => {
  const s = make(['211','134','425'], { overlays: ['...','I..','...'] });
  const before = structuredClone(s);
  const hint = findHint(s);
  expect(hint === null || trySwap(s, ...hint).legal).toBe(true);
  expect(s).toEqual(before);
});

test('a board with a movable station is not dead', () => {
  const s = make(['D231','2312','3123','1231']);
  expect(hasLegalMove(s)).toBe(true);
  const hint = findHint(s)!;
  expect(trySwap(s, ...hint).legal).toBe(true);
});

test('wormhole preserves frozen terrain and carries astronauts with their tiles', () => {
  const s = loadLevel(generateLevel(7, 7 * 7919, paramsForLevel(7)));
  const before = structuredClone(s); const events: GameEvent[] = [];
  shuffleBoard(s, events);
  for (let r=0;r<s.rows;r++) for(let c=0;c<s.cols;c++) {
    if (s.overlays[r]![c]) expect(s.grid[r]![c]).toEqual(before.grid[r]![c]);
  }
  const moves = events.flatMap(e => e.type === 'shuffle' ? e.moves : []);
  for (const sv of before.survivors) {
    const move = moves.find(m => m.from.r === sv.r && m.from.c === sv.c);
    expect(s.survivors.find(v => v.id === sv.id)).toMatchObject(move?.to ?? {r:sv.r,c:sv.c});
  }
});

test('four dangerous tiles make a movable safe rescue pod', () => {
  const s = make(['2222','1345'], { survivors: [{r:0,c:2}] });
  const events: GameEvent[] = [];
  resolveMatchesOnce(s, {r:0,c:0}, events);
  expect(s.grid[0]![0]).toEqual({kind:'pod'});
  expect(events.some(e => e.type === 'podCreated')).toBe(true);
});

test('four safe ground tiles make a station without another terrain step', () => {
  const s = make(['4444','1231']);
  resolveMatchesOnce(s,{r:0,c:1},[]);
  expect(s.grid[0]![1]?.kind).toBe('dome');
});

test('a rescue pod can slide without forming a match', () => {
  expect(trySwap(make(['P23','451','234']),{r:0,c:0},{r:0,c:1}).legal).toBe(true);
});

test('a rover takes a detour when the direct route is blocked', () => {
  const s = make(['12345','2312D','34512','45123'], {
    rovers:[{r:1,c:1}], overlays:['.....','..I..','.....','.....'],
  });
  s.grid[1]![4] = {kind:'dome',facing:'left'};
  const events: GameEvent[] = [];
  settle(s,events,true);
  expect(s.rovers[0]).not.toMatchObject({r:1,c:1});
  expect(events.some(e => e.type === 'roverMoved')).toBe(true);
});

test('the final rover delivery event identifies the rider even after the rover retires',()=>{
 const s=make(['1234','231D','3451'],{rovers:[{r:1,c:1}]});
 s.grid[1]![3]={kind:'dome',facing:'left'};
 const riderId=s.rovers[0]!.riderId,events:GameEvent[]=[];settle(s,events,true);
 expect(s.rovers).toHaveLength(0);
 expect(events.find(e=>e.type==='roverMoved')).toMatchObject({riderId,to:{r:1,c:2}});
});
