import {stateFixture} from '../fixtures';
import type {CampaignEvent,CampaignState} from '../../../src/campaign/types';
export function bridgeState():CampaignState {
 const s=stateFixture(),l=s.level;l.id=427;l.chapter=9;l.crew=[];l.geometry.endpoints=[];
 l.geometry.chambers[0]!.cells=l.geometry.mask.flatMap((row,r)=>row.map((_,c)=>({r,c})));
 l.geometry.gravitySegments=[0,1,2].map(c=>({id:`col-${c}`,cells:[0,1,2].map(r=>({r,c})),direction:'down',chamberId:'room'}));
 l.geometry.refillSources=[0,1,2].map(c=>({id:`source-${c}`,at:{r:0,c},segmentId:`col-${c}`}));
 l.geometry.inactiveCells=[{r:2,c:1}];
 l.geometry.connections=[{id:'bridge-link',from:{r:2,c:0},to:{r:2,c:1},active:false}];
 l.fixtures=[{id:'bridge',kind:'bridge',at:{r:1,c:1},cells:[{r:2,c:1}],hits:0,active:false,connectionIds:['bridge-link']}];
 l.mechanics=[{id:'bridges',fixtureIds:['bridge']}];l.goals=[{id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:['bridge']}}];
 return {...s,levelId:427,geometry:structuredClone(l.geometry),pieces:structuredClone(l.pieces),crew:[],fixtures:structuredClone(l.fixtures),mechanics:[{id:'bridges',activatedIds:[]}],goalProgress:[{goalId:'restore',completedIds:[]}]};
}
export function bridgeMerge(id='one'):Extract<CampaignEvent,{type:'merge'}>{return {type:'merge',sequenceId:0,timingGroup:0,mergeId:id,pieceIds:['a','b','c'],cells:[{r:0,c:0},{r:0,c:1},{r:0,c:2}],at:{r:0,c:1},before:1,after:2};}
