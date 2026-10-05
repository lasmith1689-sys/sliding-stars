import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {fallPieces,refillPieces,resolveTerrainMatches} from '../../src/campaign/engine/settle';
import {gravitySegments} from '../../src/campaign/engine/geometry';
import {pieceAt} from '../../src/campaign/engine/occupancy';
import {applySceneEvents,makeScene} from '../../src/render/campaign/snapshot';
import {baseState,context} from './fixtures/base';

it('mission 3 drops the existing tile and its person through the permanent gap when the tile below merges',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(3)!),ctx=context(state);
 const rider=state.crew.find(c=>c.at.r===1&&c.at.c===2)!,tile=pieceAt(state,rider.at)!;
 // Reproduce the photographed column: a gap at (2,2), with a low tile
 // immediately below it. Merge that tile to a different column.
 state.crew=state.crew.filter(c=>c===rider);
 for(const at of [{r:3,c:1},{r:3,c:2},{r:3,c:3}])Object.assign(pieceAt(state,at)!,{kind:'tile',tier:1});
 expect(resolveTerrainMatches(ctx,{r:3,c:1},[])).toBe(true);
 const beforeFall=ctx.events.length;
 expect(fallPieces(ctx)).toBe(true);
 expect(tile.at).toEqual({r:3,c:2});
 expect(rider.at).toEqual(tile.at);
 expect(pieceAt(state,{r:2,c:2})).toBeUndefined();
 expect(ctx.events.slice(beforeFall)).toContainEqual(expect.objectContaining({type:'move',entityId:tile.id,from:{r:1,c:2},to:{r:3,c:2},passengerIds:[rider.id]}));
 refillPieces(ctx);
 expect(pieceAt(state,{r:3,c:2})?.id).toBe(tile.id);
 expect(pieceAt(state,{r:2,c:2})).toBeUndefined();
});

it('joins only permanent gaps in one chamber and never bridges a closed cell or a chamber boundary',()=>{
 const state=baseState();state.crew=[];
 state.geometry.mask[1]![0]=false;
 state.geometry.chambers[0]!.cells=state.geometry.chambers[0]!.cells.filter(p=>p.r!==1||p.c!==0);
 const column=state.geometry.gravitySegments.find(s=>s.id==='column-0')!;
 column.cells=[{r:0,c:0}];state.geometry.gravitySegments.push({...column,id:'lower',cells:[{r:2,c:0},{r:3,c:0}]});
 state.geometry.refillSources.push({id:'lower-source',at:{r:2,c:0},segmentId:'lower'});
 expect(gravitySegments(state).filter(s=>s.cells[0]!.c===0).map(s=>s.cells)).toEqual([[{r:0,c:0},{r:2,c:0},{r:3,c:0}]]);
 state.geometry.gravitySegments.at(-1)!.chamberId='other';
 expect(gravitySegments(state).filter(s=>s.cells[0]!.c===0)).toHaveLength(2);
 state.geometry.gravitySegments.at(-1)!.chamberId='room';state.geometry.mask[1]![0]=true;state.geometry.inactiveCells=[{r:1,c:0}];
 expect(gravitySegments(state).filter(s=>s.cells[0]!.c===0)).toHaveLength(2);
});

it.each(['down','left'] as const)('ordinary %s refills enter upstream and travel to vacancies before any new tile can appear there',direction=>{
 const state=baseState();state.crew=[];
 state.pieces=state.pieces.filter(p=>direction==='down'?p.at.c!==0:p.at.r!==0);
 if(direction==='left'){
  state.geometry.gravitySegments=Array.from({length:4},(_,r)=>({id:`row-${r}`,cells:Array.from({length:4},(_,i)=>({r,c:3-i})),direction,chamberId:'room'}));
  state.geometry.refillSources=state.geometry.gravitySegments.map(s=>({id:`${s.id}-source`,at:s.cells[0]!,segmentId:s.id}));
 }
 const scene=makeScene(state),ctx=context(state);refillPieces(ctx);
 const dest=direction==='down'?{r:3,c:0}:{r:0,c:0},piece=pieceAt(state,dest)!;
 expect(ctx.events).toContainEqual(expect.objectContaining({type:'refill',pieceId:piece.id,direction,from:direction==='down'?{r:-1,c:0}:{r:0,c:4}}));
 expect(ctx.events.find(e=>e.type==='spawn'&&e.piece.id===piece.id)).toMatchObject({piece:{at:direction==='down'?{r:0,c:0}:{r:0,c:3}}});
 expect(ctx.events).toContainEqual(expect.objectContaining({type:'move',entityId:piece.id,to:dest}));
 expect(applySceneEvents(scene,ctx.events).pieces).toEqual(makeScene(state).pieces);
});

it('a tile carrying crew cannot be replaced by a random refill below an occupied actor',()=>{
 const state=baseState();state.pieces=state.pieces.filter(p=>p.at.c!==0||p.at.r===0||p.at.r===1);
 state.crew[0]!.at={r:0,c:0};
 state.actors=[{id:'blocking-rover',kind:'rover',at:{r:1,c:0},routeId:null,routeIndex:0,passengerIds:[]}];
 const tile=pieceAt(state,{r:0,c:0})!,ctx=context(state);fallPieces(ctx);refillPieces(ctx);
 expect(pieceAt(state,{r:0,c:0})?.id).toBe(tile.id);
 expect(pieceAt(state,{r:2,c:0})).toBeUndefined();
 expect(ctx.events.some(e=>e.type==='spawn'&&e.piece.at.c===0)).toBe(false);
});
