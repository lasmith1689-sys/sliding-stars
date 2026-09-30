import type {CampaignAction,CampaignState} from './types';
import {hashState} from './engine/hash';
import {transition} from './engine/turn';

// Player-facing advice is packaged separately from offline proof/solver tooling.
const files=import.meta.glob<Record<string,CampaignAction>>('./content/hints-*.json',{import:'default'});
const pending=new Map<number,Promise<Record<string,CampaignAction>>>();
export async function getRouteHint(state:CampaignState):Promise<CampaignAction|null>{
 if(state.status!=='playing')return null;
 const chapter=Math.ceil(state.levelId/50),load=files[`./content/hints-${String(chapter).padStart(2,'0')}.json`];
 if(!load)return null;
 try{
  let request=pending.get(chapter);if(!request){request=load();pending.set(chapter,request);}
  const action=(await request)[hashState(state)];
  if(!action||action.type==='booster')return null;
  const result=transition(state,action);
  return result.accepted&&result.state.status!=='lost'?structuredClone(action):null;
 }catch{pending.delete(chapter);return null;}
}
