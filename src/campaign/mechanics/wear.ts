import type { Pos } from '../../core/types';
import type { CampaignEvent,CampaignFixture,TurnContext } from '../types';
import { emit } from '../engine/context';

export function touches(cells:readonly Pos[],event:Extract<CampaignEvent,{type:'merge'}>):boolean {
  return cells.some(at=>event.cells.some(cell=>Math.abs(at.r-cell.r)+Math.abs(at.c-cell.c)<=1));
}
/** Kernel dispatches each real merge once; a multi-cell fixture still takes one hit. */
export function wear(context:TurnContext,fixture:CampaignFixture & {hp:number}):boolean {
  const before=structuredClone(fixture);
  if(fixture.hp===1){
    context.state.fixtures=context.state.fixtures.filter(f=>f.id!==fixture.id);
    emit(context,{type:'fixture',fixtureId:fixture.id,before,after:null});return true;
  }
  fixture.hp--;emit(context,{type:'fixture',fixtureId:fixture.id,before,after:fixture});return false;
}
