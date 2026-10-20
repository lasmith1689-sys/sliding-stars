import {expect,it} from 'vitest';
import {baseLevel,baseState,legacyBoard} from './fixtures/base';
import {canSlide,isLegalSwap,legalActions} from '../../src/campaign/engine/actions';
import {transition} from '../../src/campaign/engine/turn';
import {pieceAt} from '../../src/campaign/engine/occupancy';
import {parseCampaignState} from '../../src/campaign/schema';
import {isLegalSwap as legacyIsLegalSwap,legalMoves as legacyLegalMoves} from '../../src/core/moves';
import type {CampaignAction,CampaignCrew,CampaignState} from '../../src/campaign/types';
import type {Pos,Tier} from '../../src/core/types';

// Falsification probes for the fixed-station and matching empty-shuttle boarding repair.
type Cell=Tier|'S'|'P'|null;
const quiet:Cell[][]=[[1,2,1,3],[2,1,3,2],[3,2,1,3],[1,3,2,1]];
const neighbors=(at:Pos):Pos[]=>[{r:at.r-1,c:at.c},{r:at.r+1,c:at.c},{r:at.r,c:at.c-1},{r:at.r,c:at.c+1}];
const inside=(at:Pos)=>at.r>=0&&at.r<4&&at.c>=0&&at.c<4;
const stations=(state:CampaignState)=>state.pieces.filter(p=>p.kind==='station');
const touches=(action:CampaignAction,at:Pos)=>action.type==='swap'&&[action.from,action.to].some(p=>p.r===at.r&&p.c===at.c);
function withStations(cells:Pos[],grid=quiet):CampaignState {
 const copy=grid.map(row=>row.slice());for(const at of cells)copy[at.r]![at.c]='S';
 const level=baseLevel(copy),free=[{r:1,c:1},{r:2,c:2},{r:1,c:2}].find(p=>!cells.some(s=>s.r===p.r&&s.c===p.c))!;
 level.crew[0]!.at=free;return baseState(level);
}
// The shared pickup board: a matching slide moves the 1 at (0,3) into (0,2).
function pickupLevel(grid:Cell[][]=[[1,1,'P',1],[2,3,2,3],[3,2,3,2],[1,3,2,'S']]) {
 const level=baseLevel(grid);level.crew[0]!.at={r:0,c:3};return level;
}
const guest=(id:string,at:Pos,extra:Partial<CampaignCrew>={}):CampaignCrew=>({id,at:{...at},status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:null,...extra});

const edgeCells:Pos[]=[{r:0,c:0},{r:0,c:3},{r:3,c:0},{r:3,c:3},{r:0,c:1},{r:1,c:3},{r:3,c:2},{r:2,c:0}];
it.each(edgeCells)('a station on the board edge at %o cannot be swapped in any in-board direction',station=>{
 const state=withStations([station]),before=structuredClone(state);
 expect(canSlide(state,station)).toBe(false);
 expect(legalActions(state).some(a=>touches(a,station))).toBe(false);
 for(const other of neighbors(station).filter(inside))for(const [from,to] of [[station,other],[other,station]] as const){
  expect(isLegalSwap(state,from,to)).toBe(false);
  const result=transition(state,{type:'swap',from,to});
  expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
  expect(result.rejection).toMatch(/Stations stay fixed/);
 }
 expect(state).toEqual(before);
});

it.each([{r:-1,c:0},{r:0,c:-1},{r:4,c:3},{r:3,c:4}])('an off-board swap target %o next to a corner station is rejected without mutation',to=>{
 const station=to.r===-1||to.c===-1?{r:0,c:0}:{r:3,c:3},state=withStations([station]),before=structuredClone(state);
 for(const action of [{type:'swap' as const,from:station,to},{type:'swap' as const,from:to,to:station}]){
  const result=transition(state,action);
  expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
 }
 expect(state).toEqual(before);
});

it('a corner station stays fixed even when sliding it would complete a match of three',()=>{
 const state=baseState((()=>{const l=baseLevel([['S',1,1,3],[1,2,3,2],[3,2,1,3],[1,3,2,1]]);l.crew[0]!.at={r:2,c:2};return l;})());
 const before=structuredClone(state);
 for(const [from,to] of [[{r:0,c:0},{r:1,c:0}],[{r:1,c:0},{r:0,c:0}]] as const){
  const result=transition(state,{type:'swap',from,to});
  expect(result.accepted).toBe(false);expect(result.rejection).toMatch(/Stations stay fixed/);
 }
 expect(state).toEqual(before);
});

it('two adjacent stations cannot be swapped with each other and neither appears in any legal action',()=>{
 const a={r:3,c:2},b={r:3,c:3},state=withStations([a,b]),before=structuredClone(state);
 expect(isLegalSwap(state,a,b)).toBe(false);expect(isLegalSwap(state,b,a)).toBe(false);
 expect(transition(state,{type:'swap',from:a,to:b}).accepted).toBe(false);
 expect(legalActions(state).some(x=>touches(x,a)||touches(x,b))).toBe(false);
 expect(state).toEqual(before);
});

it('every accepted legal action on multi-station boards leaves every existing station identical',()=>{
 const boards:{grid:Cell[][];stations:Pos[]}[]=[
  {grid:[[1,1,2,1],[2,3,1,2],[3,1,2,3],[1,2,3,1]],stations:[{r:0,c:0},{r:3,c:3}]},
  {grid:[[2,1,1,3],[1,3,2,1],[1,2,3,2],[3,1,2,2]],stations:[{r:1,c:3},{r:3,c:0}]},
  {grid:[[1,2,1,1],[3,1,2,3],[2,3,1,2],[1,2,3,1]],stations:[{r:0,c:3},{r:2,c:1}]},
 ];
 let accepted=0;
 for(const board of boards){
  const state=withStations(board.stations,board.grid),fixed=structuredClone(stations(state));
  const actions=legalActions(state);
  for(const action of actions){
   const result=transition(state,action);
   expect(result.accepted).toBe(true);accepted++;
   for(const station of fixed)expect(result.state.pieces.find(p=>p.id===station.id)).toEqual(station);
  }
 }
 expect(accepted).toBeGreaterThan(0);
});

it('wormhole and tractor boosters never relocate a station or a shuttle',()=>{
 const state=withStations([{r:0,c:0}],[[1,2,1,3],[2,1,3,2],[3,2,1,3],[1,'P',2,1]]);
 const fixed=structuredClone(state.pieces.filter(p=>p.kind!=='tile'));
 for(const action of [{type:'booster' as const,kind:'wormhole' as const,at:{r:2,c:2}},{type:'booster' as const,kind:'tractor' as const,at:{r:0,c:0}}]){
  const result=transition(state,action);
  if(action.kind==='wormhole')expect(result.accepted).toBe(true);
  for(const piece of fixed)expect(result.state.pieces.find(p=>p.id===piece.id)).toMatchObject({kind:piece.kind,at:piece.at});
 }
});

it.each(edgeCells)('the legacy board also keeps a station (dome) at %o fixed',station=>{
 const board=legacyBoard(withStations([station],[[1,2,1,3],[2,'P',3,2],[3,2,1,3],[1,3,2,1]]));
 for(const other of neighbors(station).filter(inside)){
  expect(legacyIsLegalSwap(board,station,other)).toBe(false);expect(legacyIsLegalSwap(board,other,station)).toBe(false);
 }
 for(const [a,b] of legacyLegalMoves(board))expect([a,b].some(p=>p.r===station.r&&p.c===station.c)).toBe(false);
});

it('boards every unowned guest stacked on the displaced tile, in stable order, and the result reloads',()=>{
 const level=pickupLevel();level.crew.push(guest('second',{r:2,c:0}));
 const state=baseState(level);state.crew[1]!.at={r:0,c:3};
 const pod=state.pieces.find(p=>p.kind==='pod')!;
 const result=transition(state,{type:'swap',from:{r:0,c:2},to:{r:0,c:3}});
 expect(result.accepted).toBe(true);
 const after=result.state.pieces.find(p=>p.id===pod.id)!;if(after.kind!=='pod')throw Error('Expected shuttle');
 expect([...after.passengerIds].sort()).toEqual(['crew','second']);
 for(const id of ['crew','second'])expect(result.state.crew.find(c=>c.id===id)).toMatchObject({carrierId:pod.id,at:after.at,status:'active'});
 expect(result.events.filter(e=>e.type==='transfer').map(e=>e.type==='transfer'&&e.toCarrierId)).toEqual([pod.id,pod.id]);
 expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
});

it('with two empty shuttles only the shuttle that made the matching slide boards the guest',()=>{
 const level=pickupLevel([[1,1,'P',1],[2,3,2,3],[3,2,3,2],['P',3,2,'S']]);level.crew[0]!.at={r:0,c:3};
 const state=baseState(level),moving=pieceAt(state,{r:0,c:2})!,idle=structuredClone(pieceAt(state,{r:3,c:0})!);
 const result=transition(state,{type:'swap',from:{r:0,c:3},to:{r:0,c:2}});
 expect(result.accepted).toBe(true);
 expect(result.state.pieces.find(p=>p.id===moving.id)).toMatchObject({passengerIds:['crew']});
 expect(result.state.pieces.find(p=>p.id===idle.id)).toEqual(idle);
 expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
});

it.each([false,true])('a corner shuttle boards the guest from an edge tile in a vertical-match slide (reverse=%s)',reverse=>{
 const level=baseLevel([[2,3,1,'P'],[3,2,3,1],[2,3,2,1],[3,2,'S',2]]);level.crew[0]!.at={r:0,c:2};
 const state=baseState(level),pod=pieceAt(state,{r:0,c:3})!,original=structuredClone(state);
 const result=transition(state,{type:'swap',from:reverse?{r:0,c:2}:{r:0,c:3},to:reverse?{r:0,c:3}:{r:0,c:2}});
 expect(result.accepted).toBe(true);
 const after=result.state.pieces.find(p=>p.id===pod.id)!;
 expect(after).toMatchObject({kind:'pod',passengerIds:['crew']});
 expect(result.state.crew[0]).toMatchObject({carrierId:pod.id,at:after.at,status:'active'});
 expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
 expect(state).toEqual(original);
});

it('a housed crew record sharing the displaced tile cell is never boarded',()=>{
 const level=pickupLevel();level.crew.push(guest('home',{r:2,c:1}));
 const state=baseState(level);Object.assign(state.crew[1]!,{at:{r:0,c:3},status:'housed',rescueMoves:null});
 const result=transition(state,{type:'swap',from:{r:0,c:2},to:{r:0,c:3}});
 expect(result.accepted).toBe(true);
 expect(result.state.crew.find(c=>c.id==='home')).toMatchObject({status:'housed',carrierId:null,at:{r:0,c:3}});
 expect(result.state.pieces.find(p=>p.kind==='pod')).toMatchObject({passengerIds:['crew']});
});

it('two adjacent empty shuttles with a guest nearby cannot swap as a free move',()=>{
 const level=baseLevel([[1,'P','P',3],[2,3,2,1],[3,2,3,2],[1,3,2,'S']]);level.crew[0]!.at={r:0,c:0};
 const state=baseState(level),before=structuredClone(state);
 for(const [from,to] of [[{r:0,c:1},{r:0,c:2}],[{r:0,c:2},{r:0,c:1}]] as const){
  const result=transition(state,{type:'swap',from,to});
  expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
 }
 expect(state).toEqual(before);
});

it('a boarding slide spends exactly one limited move and is deterministic',()=>{
 const level=pickupLevel();level.moveLimit=10;const state=baseState(level);
 const action={type:'swap' as const,from:{r:0,c:2},to:{r:0,c:3}};
 const first=transition(state,action),second=transition(state,action);
 expect(first.accepted).toBe(true);expect(first.state.movesRemaining).toBe(9);expect(first.state.turn).toBe(1);
 expect(second).toEqual(first);
});

it('every accepted slide of an empty shuttle with an unowned guest on the other tile boards that guest',()=>{
 const boards:{grid:Cell[][];crew:Pos}[]=[
  {grid:[[1,1,'P',1],[2,3,2,3],[3,2,3,2],[1,3,2,'S']],crew:{r:0,c:3}},
  {grid:[[2,3,1,'P'],[3,2,3,1],[2,3,2,1],[3,2,'S',2]],crew:{r:0,c:2}},
  {grid:[[2,1,3,2],['P',2,1,3],[1,3,2,1],[1,2,3,'S']],crew:{r:1,c:1}},
  {grid:[[3,2,3,2],[2,3,1,3],[1,'P',2,1],[3,1,'S',2]],crew:{r:3,c:1}},
 ];
 let probed=0;
 for(const board of boards){
  const level=baseLevel(board.grid);level.crew[0]!.at=board.crew;const state=baseState(level);
  const pod=state.pieces.find(p=>p.kind==='pod')!;
  for(const action of legalActions(state)){
   if(action.type!=='swap'||![action.from,action.to].some(p=>p.r===pod.at.r&&p.c===pod.at.c))continue;
   const other=[action.from,action.to].find(p=>p.r!==pod.at.r||p.c!==pod.at.c)!;
   if(other.r!==board.crew.r||other.c!==board.crew.c)continue;
   const result=transition(state,action);expect(result.accepted).toBe(true);probed++;
   const after=result.state.pieces.find(p=>p.id===pod.id)!;
   expect(after).toMatchObject({kind:'pod',passengerIds:['crew']});
   expect(result.state.crew[0]).toMatchObject({carrierId:pod.id,at:after.at});
   expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
  }
 }
 expect(probed).toBeGreaterThanOrEqual(2);
});
