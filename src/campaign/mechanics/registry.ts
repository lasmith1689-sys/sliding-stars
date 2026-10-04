import {gravity} from './gravity';
import {keys} from './keys';
import { MECHANIC_IDS,type CampaignLevel,type MechanicModule,type MechanicRuntime } from '../types';
import { CampaignContentError } from '../engine/context';
import { crates } from './crates';
import { ice } from './ice';
import { rovers } from './rovers';
import { reactors } from './reactors';
import { comets } from './comets';
import { exits } from './exits';
import { waves } from './waves';
import { moonwhales } from './moonwhales';
import { pups } from './pups';
import { currents } from './currents';
import { pirates } from './pirates';
import { portals } from './portals';
import { bridges } from './bridges';
import { shelter } from './shelter';
import { gardens } from './gardens';
import { solar } from './solar';
import { jelly } from './jelly';
import { docks } from './docks';
import { phase } from './phase';
import {magnets} from './magnets';
import {relays} from './relays';
import {tethers} from './tethers';
import {repair} from './repair';
import {rendezvous} from './rendezvous';

/** Add implemented modules here. Missing modules fail visibly, never act as no-ops. */
export const campaignModules:readonly MechanicModule[]=[crates,ice,rovers,reactors,comets,exits,waves,moonwhales,pups,currents,pirates,portals,magnets,bridges,shelter,gardens,keys,gravity,solar,jelly,docks,phase,relays,tethers,repair,rendezvous];
export function selectModules(level:CampaignLevel,available:readonly MechanicModule[]=campaignModules):MechanicModule[] {
  if(new Set(available.map(m=>m.id)).size!==available.length)throw new CampaignContentError('duplicate mechanic module');
  return MECHANIC_IDS.filter(id=>level.mechanics.some(m=>m.id===id)).map(id=>{
    const module=available.find(m=>m.id===id);if(!module)throw new CampaignContentError(`mechanic ${id} is not implemented`);
    return module;
  });
}
/** Serialized initial counters, separate from behavior availability. */
export function initialRuntime(id:MechanicRuntime['id']):MechanicRuntime {
  switch(id){
    case 'crates':return {id,openedIds:[]};case 'ice':return {id,thawedIds:[]};case 'rovers':return {id,arrivedIds:[]};
    case 'reactors':return {id,overloadCount:0};case 'comets':return {id,clearedIds:[]};case 'exits':return {id,departedIds:[]};
    case 'waves':return {id,admittedIds:[]};case 'moonwhales':return {id,transferredIds:[]};case 'pups':return {id,arrivedIds:[]};
    case 'currents':return {id,shiftCount:0};case 'pirates':return {id,interceptedIds:[]};case 'portals':return {id,transferredPieceIds:[]};
    case 'bridges':return {id,activatedIds:[]};case 'shelter':return {id,startedCrewIds:[]};case 'gardens':return {id,harvestedIds:[]};
    case 'keys':return {id,unlockedIds:[]};case 'gravity':return {id,toggleCount:0,flippedIds:[]};case 'solar':return {id,activatedIds:[]};
    case 'jelly':return {id,turnsUntilSpread:3,cancelledThisTurn:false};case 'docks':return {id,boardedIds:[]};
    case 'phase':return {id,waitingDoorIds:[]};case 'relays':return {id,nextNode:1};case 'tethers':return {id,releasedIds:[]};
    case 'repair':return {id,completedJobIds:[]};case 'rendezvous':return {id,departed:false};
    case 'magnets':return {id,deliveredIds:[]};
  }
}
