// Run from the repository root: node docs/reviews/2026-09-25-audit-probe.mjs
// Read-only gameplay diagnostics: does not alter game saves or source files.
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { makeSolvableLevel, paramsForLevel } = await server.ssrLoadModule('/src/core/generator.ts');
  const { loadLevel } = await server.ssrLoadModule('/src/core/level.ts');
  const { findHint, shuffleBoard } = await server.ssrLoadModule('/src/core/shuffle.ts');
  const { trySwap } = await server.ssrLoadModule('/src/core/game.ts');
  const { findMatches } = await server.ssrLoadModule('/src/core/match.ts');
  const { solve } = await server.ssrLoadModule('/src/core/solver.ts');
  const times = [], fallbacks = [], illegalHints = [];
  for (let i = 1; i <= 100; i++) {
    const start = performance.now();
    const def = makeSolvableLevel(i);
    times.push({level:i, ms:Math.round(performance.now()-start)});
    const p = paramsForLevel(i), s = loadLevel(def);
    if (def.goal.type !== p.goal || def.goal.n !== p.goalN || (p.vip && def.vipSurvivor === undefined)) {
      fallbacks.push({level:i, expected:p.goal+':'+p.goalN, actual:def.goal, solved:solve(def,100), initialMatches:findMatches(s).length});
    }
    const hint = findHint(s);
    if (hint && !trySwap(s,...hint).legal) illegalHints.push({level:i,hint,overlays:hint.map(x=>s.overlays[x.r][x.c])});
    if (i === 7) {
      const before = structuredClone(s); const events=[];
      shuffleBoard(s, events);
      const frozenChanges=[];
      for (let r=0;r<s.rows;r++) for(let c=0;c<s.cols;c++) if(s.overlays[r][c] && JSON.stringify(s.grid[r][c])!==JSON.stringify(before.grid[r][c])) frozenChanges.push({r,c,before:before.grid[r][c],after:s.grid[r][c]});
      console.log(JSON.stringify({shuffleLevel7:{frozenChanges,survivorsBefore:before.survivors,survivorsAfter:s.survivors,movesFromSurvivors:events.flatMap(e=>e.moves??[]).filter(m=>before.survivors.some(v=>v.r===m.from.r&&v.c===m.from.c))}}));
    }
  }
  console.log(JSON.stringify({times:times.sort((a,b)=>b.ms-a.ms).slice(0,12),totalMs:times.reduce((s,x)=>s+x.ms,0),fallbacks,illegalHintCount:illegalHints.length,illegalHints}));
} finally { await server.close(); }
