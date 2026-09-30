import type { CampaignLevel, CampaignState, GeometryDef, TurnContext } from '../../../src/campaign/types';
import type { BoardState,Tier } from '../../../src/core/types';

export function geometry(rows=4,cols=4):GeometryDef {
  const cells=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>({r,c}))).flat();
  return {rows,cols,mask:Array.from({length:rows},()=>Array<boolean>(cols).fill(true)),inactiveCells:[],
    chambers:[{id:'room',cells,directions:['down','left']}],
    gravitySegments:Array.from({length:cols},(_,c)=>({id:`column-${c}`,cells:cells.filter(p=>p.c===c),direction:'down',chamberId:'room'})),
    refillSources:Array.from({length:cols},(_,c)=>({id:`source-${c}`,at:{r:0,c},segmentId:`column-${c}`})),
    routes:[],connections:[],endpoints:[]};
}
export function baseLevel(grid:(Tier|'S'|'P'|null)[][]=[[1,2,1,3],[2,1,3,2],[3,2,1,3],[1,3,2,'S']]):CampaignLevel {
  return {id:1,chapter:1,campaignVersion:'2026.1',rulesVersion:'campaign-1',seed:7,geometry:geometry(grid.length,grid[0]!.length),
    pieces:grid.flatMap((row,r)=>row.flatMap((value,c)=>value===null?[]:[value==='S'?{id:`piece-${r}-${c}`,at:{r,c},kind:'station' as const,facing:'left' as const}:value==='P'?{id:`piece-${r}-${c}`,at:{r,c},kind:'pod' as const,passengerIds:[]}:{id:`piece-${r}-${c}`,at:{r,c},kind:'tile' as const,tier:value}])),
    crew:[{id:'crew',at:{r:3,c:0},status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:null}],
    fixtures:[],actors:[],arrivals:[],mechanics:[],goals:[{id:'home',type:'homeCrew',eligible:{type:'ids',ids:['crew']}}],
    moveLimit:null,needMoves:20,presentationId:'test',lessonId:null,rewardId:'test',
    metadata:{shapeFamily:'compact-rectangle',difficulty:'teaching',purposeTags:['kernel'],assistedAllowance:0,capOverride:null}};
}
export function baseState(level=baseLevel()):CampaignState {
  return {level:structuredClone(level),levelId:level.id,campaignVersion:level.campaignVersion,rulesVersion:level.rulesVersion,
    geometry:structuredClone(level.geometry),pieces:structuredClone(level.pieces),crew:structuredClone(level.crew),actors:structuredClone(level.actors),fixtures:structuredClone(level.fixtures),arrivals:structuredClone(level.arrivals),
    mechanics:[],turn:0,nextEntityId:1,rngState:level.seed,goalProgress:level.goals.map(g=>({goalId:g.id,completedIds:[]})),movesRemaining:level.moveLimit,points:0,status:'playing',transportedThisTurn:[],pendingTransfers:[]};
}
export function context(state=baseState()):TurnContext {return {state,events:[],processedMergeIds:new Set(),steppedActorIds:new Set()};}
export const mergeSwap={type:'swap' as const,from:{r:0,c:1},to:{r:1,c:1}};

/** Tests alone map the base layers to an equivalent legacy board. */
export function legacyBoard(state:CampaignState):BoardState {
  const grid:BoardState['grid']=Array.from({length:state.geometry.rows},()=>Array(state.geometry.cols).fill(null));
  for(const p of state.pieces)grid[p.at.r]![p.at.c]=p.kind==='station'?{kind:'dome',facing:p.facing}:p.kind==='tile'?{kind:'tile',tier:p.tier}:{kind:'pod'};
  return {rows:state.geometry.rows,cols:state.geometry.cols,mask:structuredClone(state.geometry.mask),grid,overlays:grid.map(row=>row.map(()=>null)),
    survivors:state.crew.map((crew,id)=>({id,r:crew.at.r,c:crew.at.c,state:crew.status==='housed'?'housed':crew.status==='lost'?'lost':crew.carrierId?'inPod':crew.rescueMoves===null?'grounded':'swimming',need:crew.rescueMoves===null?null:{type:'rescue',movesLeft:crew.rescueMoves}})),
    rovers:[],rescued:state.crew.filter(c=>c.status==='housed').length,collected:0,points:state.points,movesLeft:state.movesRemaining,goal:{type:'rescueN',n:state.crew.length},needMoves:state.level.needMoves,rngState:state.rngState,status:state.status};
}
