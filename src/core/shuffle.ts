import { createRng } from './rng';
import { findMatches } from './match';
import { legalMoves, swapMatches } from './moves';
import { doorCell } from './dome';
import type { GameEvent } from './events';
import type { BoardState, Pos } from './types';

/** Prefer endangered crew and rescues over arbitrary top-row matches. */
export function findHint(s: BoardState): [Pos,Pos] | null {
  let best: [Pos,Pos]|null=null, bestScore=-Infinity;
  for(const [a,b] of legalMoves(s)) {
    const moved=(p:Pos)=>p.r===a.r&&p.c===a.c?b:p.r===b.r&&p.c===b.c?a:p;
    const doors:Pos[]=[];
    for(let r=0;r<s.rows;r++) for(let c=0;c<s.cols;c++) {
      const p=s.grid[r]![c]; if(p?.kind==='dome') { const to=moved({r,c}); doors.push(doorCell(to.r,to.c,p.facing),to); }
    }
    const matches=swapMatches(s,a,b);
    let score=matches.reduce((n,m)=>n+m.tier*5+m.cells.length*3,0);
    for(const sv of s.survivors) {
      if(sv.state==='housed'||sv.state==='lost') continue;
      const p=moved(sv);
      if(doors.some(d=>d.r===p.r&&d.c===p.c)) score+=2000;
      for(const m of matches) if(m.cells.some(c=>c.r===p.r&&c.c===p.c)) {
        score+=200+(sv.need?400/Math.max(1,sv.need.movesLeft):0);
        if(m.tier>=3||m.cells.length>=4) score+=400;
      }
      if(doors.length) score-=Math.min(...doors.map(d=>Math.abs(d.r-p.r)+Math.abs(d.c-p.c)))*10;
    }
    for(const m of matches) for(const cell of m.cells) for(const p of [cell,{r:cell.r-1,c:cell.c},{r:cell.r+1,c:cell.c},{r:cell.r,c:cell.c-1},{r:cell.r,c:cell.c+1}]) {
      const ov=s.overlays[p.r]?.[p.c]; if(ov) score+=ov.kind==='canister'?80:ov.kind==='reactor'?70:30;
    }
    if(score>bestScore) { best=[a,b]; bestScore=score; }
  }
  return best;
}

export function hasLegalMove(s: BoardState): boolean { return !legalMoves(s).next().done; }
export function ensureLegalMoves(s: BoardState, events: GameEvent[]): void {
  if(!hasLegalMove(s)) shuffleBoard(s,events);
}

export function shuffleBoard(s: BoardState, events: GameEvent[]): void {
  const positions:Pos[]=[];
  for(let r=0;r<s.rows;r++) for(let c=0;c<s.cols;c++) {
    if(s.grid[r]![c]?.kind==='tile'&&!s.overlays[r]![c]) positions.push({r,c});
  }
  if(positions.length<2) return;
  const original=positions.map(p=>s.grid[p.r]![p.c]!);
  const rng=createRng(s.rngState);
  for(let attempt=0;attempt<120;attempt++) {
    const perm=positions.map((_,i)=>i);
    for(let i=perm.length-1;i>0;i--) { const j=rng.nextInt(i+1); [perm[i],perm[j]]=[perm[j]!,perm[i]!]; }
    positions.forEach((p,k)=>{s.grid[p.r]![p.c]=original[perm[k]!]!;});
    if(findMatches(s).length||!hasLegalMove(s)) continue;
    const moves=positions.flatMap((to,k)=>{
      const from=positions[perm[k]!]!;
      return from.r===to.r&&from.c===to.c?[]:[{from,to}];
    });
    if(!moves.length) continue;
    for(const sv of s.survivors) {
      if(sv.state==='housed'||sv.state==='lost'||s.rovers.some(rv=>rv.riderId===sv.id)) continue;
      const move=moves.find(m=>m.from.r===sv.r&&m.from.c===sv.c);
      if(move) { sv.r=move.to.r; sv.c=move.to.c; }
    }
    s.rngState=rng.state(); events.push({type:'shuffle',moves}); return;
  }
  positions.forEach((p,k)=>{s.grid[p.r]![p.c]=original[k]!;});
}
