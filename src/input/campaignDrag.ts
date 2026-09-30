import type {Pos} from '../core/types';
import type {CampaignState} from '../campaign/types';
import {canSlide} from '../campaign/engine/actions';

/** A visual swap follows displacement, independently of whether it makes a match. */
export function dragFrame(state:CampaignState,from:Pos,dx:number,dy:number,pitch:number){
 const horizontal=Math.abs(dx)>=Math.abs(dy),distance=horizontal?dx:dy;
 const to={r:from.r+(horizontal?0:Math.sign(distance)),c:from.c+(horizontal?Math.sign(distance):0)};
 const movable=distance!==0&&canSlide(state,from)&&canSlide(state,to)&&
  [from,to].every(at=>state.pieces.find(p=>p.at.r===at.r&&p.at.c===at.c)?.kind!=='cargo');
 return {from,to,progress:movable?Math.min(1,Math.abs(distance)/pitch):0,movable};
}
