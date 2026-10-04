import {stateFixture} from '../fixtures';
import type {CampaignState} from '../../../src/campaign/types';
import {retiredPortalLessonSeeds} from '../../../src/campaign/content/lesson-seeds';
export function getRetiredPortalLevel(id:number){const level=retiredPortalLessonSeeds.find(l=>l.id===id);return level?structuredClone(level):undefined;}
export function portalState():CampaignState {
 const s=stateFixture(),l=s.level;l.id=377;l.chapter=8;l.actors=[];l.geometry.endpoints=[];
 l.geometry.chambers[0]!.cells=l.geometry.mask.flatMap((row,r)=>row.map((_,c)=>({r,c})));
 l.geometry.gravitySegments=[0,1,2].map(c=>({id:`col-${c}`,cells:[0,1,2].map(r=>({r,c})),direction:'down',chamberId:'room'}));
 l.geometry.refillSources=[0,1].map(c=>({id:`source-${c}`,at:{r:0,c},segmentId:`col-${c}`}));
 l.fixtures=[{id:'portal',kind:'portal',at:{r:2,c:0},receiver:{r:0,c:2},segmentId:'col-2'}];
 l.mechanics=[{id:'portals',fixtureIds:['portal']}];
 l.pieces=[{id:'tile-1',kind:'tile',tier:4,at:{r:2,c:0}}];l.crew[0]!.at={r:2,c:0};
 return {...s,levelId:377,geometry:structuredClone(l.geometry),pieces:structuredClone(l.pieces),crew:structuredClone(l.crew),fixtures:structuredClone(l.fixtures),mechanics:[{id:'portals',transferredPieceIds:[]}]};
}
