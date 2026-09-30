import type { Pos } from '../../core/types';
import type { CampaignActor,CampaignCrew,CampaignFixture,CampaignState } from '../types';
import { sameCell } from './geometry';
export const pieceAt=(state:Pick<CampaignState,'pieces'>,at:Pos)=>state.pieces.find(p=>sameCell(p.at,at));
export const crewAt=(state:Pick<CampaignState,'crew'>,at:Pos)=>state.crew.filter(c=>c.status==='active'&&sameCell(c.at,at));
export function actorFootprint(actor:CampaignActor,at=actor.at):Pos[] {
  return actor.kind==='tether'&&!actor.released?[at,{r:at.r+actor.offset.r,c:at.c+actor.offset.c}]:[at];
}
export const actorAt=(state:Pick<CampaignState,'actors'>,at:Pos)=>state.actors.find(a=>actorFootprint(a).some(p=>sameCell(p,at)));
export function fixtureCells(f:CampaignFixture):Pos[] {return f.kind==='comet'?f.cells:[f.at];}
export function fixtureBlocks(f:CampaignFixture):boolean {
  return f.kind==='crate'||f.kind==='ice'||f.kind==='reactor'||f.kind==='comet'||(f.kind==='phase-door'&&!f.open);
}
export function blocksTerrain(state:Pick<CampaignState,'fixtures'>,at:Pos):boolean {
  return state.fixtures.some(f=>f.kind==='jelly'?f.coatedCells.some(p=>sameCell(p,at)):fixtureBlocks(f)&&fixtureCells(f).some(p=>sameCell(p,at)));
}
/** Actor tracks exclude fixtures, including trigger fixtures that terrain can pass under. */
export function blocksActor(state:Pick<CampaignState,'fixtures'>,at:Pos):boolean {
  return state.fixtures.some(f=>(f.kind!=='phase-door'||!f.open)&&fixtureCells(f).some(p=>sameCell(p,at)));
}
export const blocksMatch=blocksTerrain;
export function pieceRiders(state:Pick<CampaignState,'pieces'|'crew'>,pieceId:string):CampaignCrew[] {
  const piece=state.pieces.find(p=>p.id===pieceId);if(!piece)return [];
  return state.crew.filter(c=>c.status==='active'&&(c.carrierId===pieceId||(c.carrierId===null&&sameCell(c.at,piece.at))));
}
