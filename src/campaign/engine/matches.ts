import { findMatchesInBoard } from '../../core/match';
import type { CampaignState } from '../types';
import { activeCell } from './geometry';
import { actorAt,blocksMatch,pieceAt } from './occupancy';

export function terrainMatches(state:CampaignState){
  return findMatchesInBoard(state.geometry.rows,state.geometry.cols,(r,c)=>{
    const at={r,c},piece=pieceAt(state,at);
    return activeCell(state.geometry,at)&&!blocksMatch(state,at)&&actorAt(state,at)?.kind!=='tether'&&piece?.kind==='tile'?piece.tier:null;
  });
}
