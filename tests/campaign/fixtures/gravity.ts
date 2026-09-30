import {stateFixture} from '../fixtures';
import type {CampaignEvent,CampaignState} from '../../../src/campaign/types';
export function gravityState():CampaignState {
 const s=stateFixture(),l=s.level;l.id=612;l.chapter=13;
 l.geometry.chambers=[{id:'room',cells:l.geometry.mask.flatMap((row,r)=>row.map((_,c)=>({r,c}))),directions:['down','left']}];
 l.geometry.gravitySegments=[0,1,2].map(c=>({id:`col-${c}`,cells:[0,1,2].map(r=>({r,c})),direction:'down',chamberId:'room'}));
 l.geometry.refillSources=[0,1,2].map(c=>({id:`source-${c}`,at:{r:0,c},segmentId:`col-${c}`}));
 l.fixtures=[{id:'switch',kind:'gravity-switch',at:{r:1,c:1},chamberId:'room',direction:'down'}];l.mechanics=[{id:'gravity',fixtureIds:['switch']}];
 l.pieces=[{id:'rider-tile',kind:'tile',tier:4,at:{r:1,c:2}},{id:'station-1',kind:'station',facing:'left',at:{r:2,c:2}}];l.crew[0]!.at={r:1,c:2};
 return {...s,levelId:l.id,geometry:structuredClone(l.geometry),pieces:structuredClone(l.pieces),crew:structuredClone(l.crew),fixtures:structuredClone(l.fixtures),mechanics:[{id:'gravity',toggleCount:0,flippedIds:[]}]};
}
export function gravityMerge(id='one'):Extract<CampaignEvent,{type:'merge'}>{return {type:'merge',sequenceId:0,timingGroup:0,mergeId:id,pieceIds:['a','b','c'],cells:[{r:1,c:0},{r:1,c:1},{r:1,c:2}],at:{r:1,c:1},before:1,after:2};}
