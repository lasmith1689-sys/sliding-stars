import type {Pos} from '../core/types';
import type {CampaignState} from '../campaign/types';
import {canSlide} from '../campaign/engine/actions';
import {actorFootprint} from '../campaign/engine/occupancy';
import {canMoveActor} from '../campaign/engine/transport';

/** A visual swap follows displacement, independently of whether it makes a match. */
export function dragFrame(state:CampaignState,from:Pos,dx:number,dy:number,pitch:number){
 const horizontal=Math.abs(dx)>=Math.abs(dy),distance=horizontal?dx:dy;
 const to={r:from.r+(horizontal?0:Math.sign(distance)),c:from.c+(horizontal?Math.sign(distance):0)};
 const actor=state.actors.find(a=>a.kind==='tether'&&!a.released&&actorFootprint(a).some(p=>p.r===from.r&&p.c===from.c));
 if(actor){const movable=distance!==0&&canMoveActor(state,actor.id,{r:actor.at.r+to.r-from.r,c:actor.at.c+to.c-from.c});return {from,to,progress:movable?Math.min(1,Math.abs(distance)/pitch):0,movable};}
 const movable=distance!==0&&canSlide(state,from)&&canSlide(state,to)&&
  [from,to].every(at=>state.pieces.find(p=>p.at.r===at.r&&p.at.c===at.c)?.kind!=='cargo');
 return {from,to,progress:movable?Math.min(1,Math.abs(distance)/pitch):0,movable};
}
