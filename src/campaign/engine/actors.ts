import type { MechanicModule,TurnContext } from '../types';
import { ACTOR_MECHANIC } from '../references';

/** Snapshot IDs at turn start. Removed/new actors cannot gain an extra scheduled step. */
export function stepActors(context:TurnContext,modules:readonly MechanicModule[],turnStartIds:readonly string[]):void {
  for(const id of [...turnStartIds].sort()){
    if(context.steppedActorIds.has(id))continue;
    const actor=context.state.actors.find(a=>a.id===id);if(!actor)continue;
    const module=modules.find(m=>m.id===ACTOR_MECHANIC[actor.kind]);
    context.steppedActorIds.add(id);
    module?.transferActor?.(context,id);
    if(context.state.actors.some(a=>a.id===id))module?.stepActor?.(context,id);
  }
}
