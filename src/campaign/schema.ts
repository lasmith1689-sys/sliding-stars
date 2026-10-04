import {validateGravity,gravityStateError} from './mechanics/gravity';
import {validateKeys,keyStateError} from './mechanics/keys';
import { array,boolean,fail,integer,nullable,object,oneOf,union,type Decoder } from './decode';
import * as value from './schema-values';
import { allAuthoredIds,authoredPieceIds,eligibleIds,goalReferences,layerReferences,mechanicReferences,reference,unique } from './references';
import { first,teachingAt } from './schedule';
import { validateCompatibility } from './compatibility';
import { currents } from './mechanics/currents';
import { pirates } from './mechanics/pirates';
import { validatePortals } from './mechanics/portals';
import { validateBridges,bridgeStateError } from './mechanics/bridges';
import {validateSolar,solarStateError} from './mechanics/solar';
import {jellyStateError} from './mechanics/jelly';
import {validateDocks,dockStateError} from './mechanics/docks';
import {validatePhase,phaseStateError} from './mechanics/phase';
import { shelter,shelterStateError } from './mechanics/shelter';
import { validateGardens,gardenStateError } from './mechanics/gardens';
import { activeCell } from './engine/geometry';
import {validateMagnets,magnetStateError} from './mechanics/magnets';
import {validateRelays,relayStateError} from './mechanics/relays';
import {validateTethers,tetherStateError} from './mechanics/tethers';
import {validateRepair,repairStateError} from './mechanics/repair';
import {validateRendezvous,rendezvousStateError} from './mechanics/rendezvous';
import type { CampaignAction,CampaignEvent,CampaignLevel,CampaignState,CampaignTransition,SolutionTrace,ValidationIssue } from './types';

export function parseCampaignLevel(input:unknown):CampaignLevel{
  const level=value.level(input,'level');
  if(level.chapter!==Math.ceil(level.id/50))fail('level.chapter','does not match level ID');
  if(level.metadata.failurePolicy==='no-failure'){
    if(teachingAt(level.id)?.stage!=='demonstration'||level.metadata.difficulty!=='teaching')fail('level.metadata.failurePolicy','no-failure requires a scheduled demonstration');
    if(level.moveLimit!==null)fail('level.moveLimit','no-failure demonstrations cannot have a moveLimit');
  }
  if(level.metadata.difficulty!=='teaching'&&(level.geometry.rows<4||level.geometry.cols<4))fail('level.geometry','ordinary boards require at least 4 rows and columns');
  layerReferences(level);goalReferences(level);mechanicReferences(level);
  for(const id of allAuthoredIds(level))if(id.startsWith('entity-'))fail('level.entities','entity- prefix is reserved for runtime allocation');
  for(const mechanic of level.mechanics)if(first(mechanic.id)>level.id)fail('level.mechanics',`${mechanic.id} introduced before schedule`);
  if(level.arrivals.some(a=>a.status!=='pending'))fail('level.arrivals','initial arrivals must be pending');
  const caps=level.metadata.capOverride??{activeCrew:6,movingCarriers:2,spreadingSystems:1};
  for(const arrival of level.arrivals){
    if(arrival.crew.length>caps.activeCrew||arrival.crew.some(c=>c.status!=='active'||c.carrierId!==null||c.at.r!==arrival.entry.r||c.at.c!==arrival.entry.c||c.shelterStarted||c.shelterMoves!==null))fail('level.arrivals','scheduled crew must be active, unattached, at entry, with unstarted shelter needs and fit the active cap');
  }
  if(level.crew.filter(c=>c.status==='active').length>caps.activeCrew)fail('level.crew','active crew cap exceeded');
  if(level.actors.filter(a=>a.kind==='rover'||a.kind==='moonwhale'||a.kind==='tether'||a.kind==='repair').length>caps.movingCarriers)fail('level.actors','moving carrier cap exceeded');
  if(level.fixtures.filter(f=>f.kind==='jelly').length>caps.spreadingSystems)fail('level.fixtures','spreading system cap exceeded');
  const conflicts=validateCompatibility(level);if(conflicts.length)fail('level.compatibility',conflicts.map(c=>c.message).join('; '));
  const currentIssues=currents.validate(level);if(currentIssues.length)fail('level.currents',currentIssues.map(issue=>issue.message).join('; '));
  const pirateIssues=pirates.validate(level);if(pirateIssues.length)fail('level.pirates',pirateIssues.map(issue=>issue.message).join('; '));
  const portalIssues=validatePortals(level);if(portalIssues.length)fail('level.portals',portalIssues.map(issue=>issue.message).join('; '));
  const bridgeIssues=validateBridges(level);if(bridgeIssues.length)fail('level.bridges',bridgeIssues.map(issue=>issue.message).join('; '));
  const solarIssues=validateSolar(level);if(solarIssues.length)fail('level.solar',solarIssues.map(issue=>issue.message).join('; '));
  const shelterIssues=shelter.validate(level);if(shelterIssues.length)fail('level.shelter',shelterIssues.map(i=>i.message).join('; '));
  const gardenIssues=validateGardens(level);if(gardenIssues.length)fail('level.gardens',gardenIssues.map(i=>i.message).join('; '));
  const keyIssues=validateKeys(level);if(keyIssues.length)fail('level.keys',keyIssues.map(i=>i.message).join('; '));
  const gravityIssues=validateGravity(level);if(gravityIssues.length)fail('level.gravity',gravityIssues.map(i=>i.message).join('; '));
  const dockIssues=validateDocks(level);if(dockIssues.length)fail('level.docks',dockIssues.map(i=>i.message).join('; '));
  const phaseIssues=validatePhase(level);if(phaseIssues.length)fail('level.phase',phaseIssues.map(i=>i.message).join('; '));
  for(const [id,validate] of [['magnets',validateMagnets],['relays',validateRelays],['tethers',validateTethers],['repair',validateRepair],['rendezvous',validateRendezvous]] as const){const issues=validate(level);if(issues.length)fail(`level.${id}`,issues.map(i=>i.message).join('; '));}
  return level;
}
const action:Decoder<CampaignAction>=union<CampaignAction>('type',{
  swap:object({type:oneOf(['swap']),from:value.pos,to:value.pos}),
  translate:object({type:oneOf(['translate']),actorId:value.id,dr:integer(-1,1),dc:integer(-1,1)}),
  booster:object({type:oneOf(['booster']),kind:oneOf(['demo','wormhole','tractor']),at:value.pos}),
});
export function parseCampaignAction(input:unknown):CampaignAction{
  const parsed=action(input,'action');
  if(parsed.type==='translate'&&Math.abs(parsed.dr)+Math.abs(parsed.dc)!==1)fail('action','translation must be one orthogonal cell');
  if(parsed.type==='swap'&&Math.abs(parsed.from.r-parsed.to.r)+Math.abs(parsed.from.c-parsed.to.c)!==1)fail('action','swap must be adjacent');
  return parsed;
}
const status=oneOf(['playing','won','lost']);
const state:Decoder<CampaignState>=object({
  level:parseCampaignLevel,levelId:integer(1,1000),...value.versions,turn:value.count,nextEntityId:value.positive,rngState:integer(0,0xffffffff),geometry:value.geometry,
  pieces:array(value.piece),crew:array(value.crew),actors:array(value.actor),fixtures:array(value.fixture),arrivals:array(value.arrival),mechanics:array(value.runtime,0,3),
  goalProgress:array(object({goalId:value.id,completedIds:value.ids}),1,2),movesRemaining:nullable(value.count),points:value.count,status,
  transportedThisTurn:value.ids,pendingTransfers:array(object({crewId:value.id,destinationId:value.id})),
});
export function parseCampaignState(input:unknown):CampaignState{
  const parsed=state(input,'state'),level=parsed.level;
  if(parsed.levelId!==level.id)fail('state.levelId','does not match definition');
  if(parsed.campaignVersion!==level.campaignVersion||parsed.rulesVersion!==level.rulesVersion)fail('state.version','does not match definition');
  if(parsed.geometry.rows!==level.geometry.rows||parsed.geometry.cols!==level.geometry.cols||JSON.stringify(parsed.geometry.mask)!==JSON.stringify(level.geometry.mask))fail('state.geometry','authored footprint changed');
  layerReferences(parsed,level);
  const dockError=dockStateError(parsed);if(dockError)fail('state.docks',dockError);
  for(const authored of level.fixtures.filter(f=>f.kind==='portal')){
    const portal=parsed.fixtures.find(f=>f.id===authored.id);
    if(portal?.kind!=='portal'||JSON.stringify(portal)!==JSON.stringify(authored))fail('state.portals','portal endpoint and segment identities must remain authored');
  }
  const portalIssues=validatePortals({id:level.id,geometry:parsed.geometry,fixtures:parsed.fixtures});if(portalIssues.length)fail('state.portals',portalIssues.map(issue=>issue.message).join('; '));
  for(const authored of level.actors.filter(a=>a.kind==='pirate')){
    const original=level.geometry.routes.find(r=>r.id===authored.routeId)!,route=parsed.geometry.routes.find(r=>r.id===authored.routeId),dock=parsed.geometry.endpoints.find(e=>e.id===authored.dockId),originalDock=level.geometry.endpoints.find(e=>e.id===authored.dockId)!;
    if(!route||route.loop!==original.loop||JSON.stringify(route.cells)!==JSON.stringify(original.cells)||route.cells.some(p=>!activeCell(parsed.geometry,p))||!dock||dock.kind!=='supply-dock'||!dock.active||JSON.stringify(dock.at)!==JSON.stringify(originalDock.at))fail('state.pirates','pirate route and dock must retain authored active topology');
    const actor=parsed.actors.find(a=>a.id===authored.id);
    if(actor?.kind==='pirate'&&(actor.routeId!==authored.routeId||actor.dockId!==authored.dockId||actor.distraction===0))fail('state.pirates','pirate route, dock and active distraction identity changed');
    const intercepted=parsed.mechanics.find(m=>m.id==='pirates');
    const returned=intercepted?.id==='pirates'&&intercepted.interceptedIds.includes(authored.id);
    if(returned===!!actor)fail('state.pirates','pirate presence must match its parcel-return ledger');
    if(actor?.kind==='pirate'&&actor.routeIndex===original.cells.length-1&&(parsed.status!=='lost'||level.metadata.failurePolicy==='no-failure'))fail('state.pirates','terminal dock position requires an ordinary lost mission');
  }
  // Current cycles are authored, never rewired by runtime movement. Validate only
  // their topology here: live stations/fixtures may legitimately pause a cycle.
  const current=level.mechanics.find(m=>m.id==='currents');
  for(const id of current?.routeIds??[]){
    const authored=level.geometry.routes.find(route=>route.id===id)!,runtime=parsed.geometry.routes.find(route=>route.id===id);
    if(!runtime||runtime.loop!==authored.loop||JSON.stringify(runtime.cells)!==JSON.stringify(authored.cells)||runtime.cells.some(cell=>!activeCell(parsed.geometry,cell)))
      fail('state.currents',`current route '${id}' must retain its authored active cycle`);
  }
  for(const entity of [...parsed.actors,...parsed.fixtures]){
    const authored=entity.kind==='rover'||entity.kind==='moonwhale'||entity.kind==='pup'||entity.kind==='pirate'||entity.kind==='dock'||entity.kind==='tether'||entity.kind==='repair'?level.actors:level.fixtures;
    if(!authored.some(a=>a.id===entity.id&&a.kind===entity.kind))fail('state.entities','entity reference not declared by authored level');
  }
  const allCrewIds=new Set([...level.crew,...level.arrivals.flatMap(a=>a.crew)].map(c=>c.id));
  for(const c of parsed.crew)reference(c.id,allCrewIds,'state.crew');
  const activeCrewCap=level.metadata.capOverride?.activeCrew??6;
  if(parsed.crew.filter(c=>c.status==='active').length>activeCrewCap)fail('state.crew','active crew cap exceeded');
  unique(parsed.mechanics.map(m=>m.id),'state.mechanics');
  if(parsed.mechanics.length!==level.mechanics.length||parsed.mechanics.some(m=>!level.mechanics.some(def=>def.id===m.id)))fail('state.mechanics','runtime must match declared mechanics');
  const authored=allAuthoredIds(level),known=new Set([...authored,...parsed.pieces.map(p=>p.id),...parsed.crew.map(c=>c.id)]);
  const allocated=(id:string)=>/^entity-[1-9]\d*$/.test(id)&&Number.isSafeInteger(Number(id.slice(7)))&&Number(id.slice(7))<parsed.nextEntityId;
  const permittedPieceIds=authoredPieceIds(level);
  for(const piece of parsed.pieces){
    if(!permittedPieceIds.has(piece.id)&&!allocated(piece.id))fail('state.nextEntityId','piece identity must be authored for the piece layer or precede nextEntityId in reserved entity-N sequence');
    const producer=level.fixtures.find(f=>f.kind==='garden'&&f.harvestId===piece.id);
    if(producer?.kind==='garden'&&(piece.kind!=='cargo'||piece.cargoKind!=='harvest'||piece.destinationId!==producer.exitId))fail('state.pieces','future piece identity must retain its authored harvest kind and destination');
  }
  const departed=parsed.mechanics.flatMap(m=>m.id==='exits'?m.departedIds:[]);
  for(const id of departed){if(!known.has(id)&&!allocated(id))fail('state.mechanics.departedIds','bad allocated reference');known.add(id);}
  const crewIds=new Set([...level.crew,...level.arrivals.flatMap(a=>a.crew)].map(c=>c.id));
  for(const mechanic of parsed.mechanics){
    const definition=level.mechanics.find(m=>m.id===mechanic.id)!;
    let allowed=new Set<string>();
    switch(mechanic.id){
      case 'crates':case 'ice':case 'comets':case 'bridges':case 'keys':case 'gravity':case 'solar':case 'phase':
        allowed=new Set('fixtureIds'in definition?definition.fixtureIds:[]);break;
      case 'rovers':case 'pups':case 'pirates':case 'tethers':
        allowed=new Set('actorIds'in definition?definition.actorIds:[]);break;
      case 'waves':allowed=new Set(level.arrivals.filter(a=>parsed.arrivals.some(p=>p.id===a.id&&p.status==='admitted')).map(a=>a.id));break;
      case 'shelter':allowed=new Set(definition.id==='shelter'?definition.crewIds:[]);break;
      case 'moonwhales':case 'docks':allowed=crewIds;break;
      case 'gardens':allowed=new Set(level.fixtures.flatMap(f=>f.kind==='garden'?[f.harvestId]:[]));break;
      case 'magnets':allowed=new Set(level.fixtures.flatMap(f=>f.kind==='magnet'?[f.cargoId]:[]));break;
      case 'repair':allowed=new Set(level.actors.flatMap(a=>a.kind==='repair'?a.jobs.map(j=>j.id):[]));break;
      case 'exits':allowed=known;break;
      case 'portals':allowed=new Set([...permittedPieceIds,...parsed.pieces.map(p=>p.id),...mechanic.transferredPieceIds.filter(allocated)]);break;
      case 'relays':if(mechanic.nextNode>level.fixtures.filter(f=>f.kind==='relay').length+1)fail('state.mechanics.nextNode','node index exceeds chain');break;
      default:break;
    }
    for(const [key,entries] of Object.entries(mechanic))if(Array.isArray(entries)){
      unique(entries,`state.mechanics.${key}`);for(const id of entries)reference(id,allowed,`state.mechanics.${key}`);
    }
  }
  unique(parsed.goalProgress.map(p=>p.goalId),'state.goalProgress');
  if(parsed.goalProgress.length!==level.goals.length)fail('state.goalProgress','missing goal progress');
  for(const progress of parsed.goalProgress){
    const goal=level.goals.find(g=>g.id===progress.goalId);if(!goal)fail('state.goalProgress','bad goal reference');
    unique(progress.completedIds,'state.goalProgress.completedIds');progress.completedIds.forEach(id=>reference(id,new Set(eligibleIds(goal,level)),'state.goalProgress.completedIds'));
  }
  if((level.moveLimit===null)!==(parsed.movesRemaining===null))fail('state.movesRemaining','limited/unlimited mismatch');
  unique(parsed.transportedThisTurn,'state.transportedThisTurn');
  for(const id of parsed.transportedThisTurn)if(!permittedPieceIds.has(id)&&!allocated(id))fail('state.transportedThisTurn','transport identity must be an authored or previously allocated piece');
  unique(parsed.pendingTransfers.map(t=>t.crewId),'state.pendingTransfers');
  for(const transfer of parsed.pendingTransfers){reference(transfer.crewId,new Set(parsed.crew.map(c=>c.id)),'state.pendingTransfers.crewId');reference(transfer.destinationId,new Set([...parsed.pieces,...parsed.actors,...parsed.geometry.endpoints].map(e=>e.id)),'state.pendingTransfers.destinationId');}
  const expectedArrivals=new Set(level.arrivals.map(a=>a.id));
  if(parsed.arrivals.length!==expectedArrivals.size)fail('state.arrivals','scheduled queue changed');
  for(const arrival of parsed.arrivals){reference(arrival.id,expectedArrivals,'state.arrivals');const original=level.arrivals.find(a=>a.id===arrival.id)!;
    if(arrival.turn!==original.turn||JSON.stringify(arrival.entry)!==JSON.stringify(original.entry)||JSON.stringify(arrival.crew)!==JSON.stringify(original.crew))fail('state.arrivals','authored arrival changed');
    if(arrival.status==='admitted'&&arrival.turn>parsed.turn)fail('state.arrivals','admitted before scheduled turn');
  }
  const bridgeError=bridgeStateError(parsed);if(bridgeError)fail('state.bridges',bridgeError);
  const solarError=solarStateError(parsed);if(solarError)fail('state.solar',solarError);
  const waveRuntime=parsed.mechanics.find(m=>m.id==='waves');
  if(waveRuntime?.id==='waves'&&parsed.arrivals.some(a=>(a.status==='admitted')!==waveRuntime.admittedIds.includes(a.id)))fail('state.arrivals','admitted ledger differs from scheduled queue');
  const shelterError=shelterStateError(parsed);if(shelterError)fail('state.shelter',shelterError);
  const keyError=keyStateError(parsed);if(keyError)fail('state.keys',keyError);
  const gardenError=gardenStateError(parsed);if(gardenError)fail('state.gardens',gardenError);
  const gravityError=gravityStateError(parsed);if(gravityError)fail('state.gravity',gravityError);
  const jellyError=jellyStateError(parsed);if(jellyError)fail('state.jelly',jellyError);
  const phaseError=phaseStateError(parsed);if(phaseError)fail('state.phase',phaseError);
  for(const [id,check] of [['magnets',magnetStateError],['relays',relayStateError],['tethers',tetherStateError],['repair',repairStateError],['rendezvous',rendezvousStateError]] as const){const error=check(parsed);if(error)fail(`state.${id}`,error);}
  return parsed;
}
const envelope={sequenceId:value.count,timingGroup:value.count};
const event:Decoder<CampaignEvent>=union<CampaignEvent>('type',{
  turn:object({...envelope,type:oneOf(['turn']),before:value.count,after:value.count}),
  merge:object({...envelope,type:oneOf(['merge']),mergeId:value.id,pieceIds:array(value.id,3),cells:array(value.pos,3),at:value.pos,before:value.tier,after:oneOf([1,2,3,4,5,'pod','station'])}),
  spawn:object({...envelope,type:oneOf(['spawn']),piece:value.piece}),
  refill:object({...envelope,type:oneOf(['refill']),pieceId:value.id,sourceId:value.id,segmentId:value.id,from:object({r:integer(-1,9),c:integer(-1,7)}),to:value.pos,direction:value.direction}),
  gravity:object({...envelope,type:oneOf(['gravity']),switchId:value.id,chamberId:value.id,mergeId:value.id,at:value.pos,before:value.direction,after:value.direction}),
  terrain:object({...envelope,type:oneOf(['terrain']),pieceId:value.id,at:value.pos,before:value.tier,after:value.tier,causeId:value.id}),
  remove:object({...envelope,type:oneOf(['remove']),piece:value.piece,reason:oneOf(['merge','departure','consumed','booster'])}),
  crew:object({...envelope,type:oneOf(['crew']),crewId:value.id,before:nullable(value.crew),after:nullable(value.crew)}),
  arrival:object({...envelope,type:oneOf(['arrival']),arrivalId:value.id,before:oneOf(['pending']),after:oneOf(['admitted']),crewIds:array(value.id,1)}),
  move:object({...envelope,type:oneOf(['move']),entityId:value.id,from:value.pos,to:value.pos,passengerIds:value.ids}),
  transfer:object({...envelope,type:oneOf(['transfer']),crewId:value.id,fromCarrierId:nullable(value.id),toCarrierId:nullable(value.id),from:value.pos,to:value.pos}),
  fixture:object({...envelope,type:oneOf(['fixture']),fixtureId:value.id,before:nullable(value.fixture),after:nullable(value.fixture)}),
  actor:object({...envelope,type:oneOf(['actor']),actorId:value.id,before:nullable(value.actor),after:nullable(value.actor)}),
  shelter:object({...envelope,type:oneOf(['shelter']),crewId:value.id,phase:oneOf(['started']),allowance:oneOf([20])}),
  need:object({...envelope,type:oneOf(['need']),crewId:value.id,need:oneOf(['rescue','shelter']),before:nullable(value.count),after:nullable(value.count)}),
  goal:object({...envelope,type:oneOf(['goal']),goalId:value.id,before:value.ids,after:value.ids}),
  status:object({...envelope,type:oneOf(['status']),before:status,after:status}),
  points:object({...envelope,type:oneOf(['points']),before:value.count,after:value.count}),
  geometry:object({...envelope,type:oneOf(['geometry']),before:value.geometry,after:value.geometry}),
  mechanic:object({...envelope,type:oneOf(['mechanic']),before:value.runtime,after:value.runtime}),
  bridge:object({...envelope,type:oneOf(['bridge']),bridgeId:value.id,mergeId:value.id,phase:oneOf(['charged','opened']),cells:array(value.pos,1)}),
  solar:object({...envelope,type:oneOf(['solar']),collectorId:value.id,mergeId:value.id,phase:oneOf(['charged','activated']),charge:value.count,quota:value.positive}),
  key:object({...envelope,type:oneOf(['key']),keyId:value.id,lockId:value.id,gateId:value.id,at:value.pos,phase:oneOf(['waiting','opened'])}),
  garden:object({...envelope,type:oneOf(['garden']),gardenId:value.id,mergeId:nullable(value.id),phase:oneOf(['grown','waiting','harvested']),stage:integer(1,3),outputAt:value.pos,harvestId:value.id}),
  current:object({...envelope,type:oneOf(['current']),routeId:value.id,phase:oneOf(['shifted','waiting'])}),
  portal:object({...envelope,type:oneOf(['portal']),portalId:value.id,pieceId:value.id,passengerIds:value.ids,from:value.pos,to:value.pos,phase:oneOf(['transferred','waiting'])}),
  pirate:object({...envelope,type:oneOf(['pirate']),actorId:value.id,parcelId:value.id,dockId:value.id,at:value.pos,phase:oneOf(['distracted','waiting','practice-paused','returned','dock-reached'])}),
  dock:object({...envelope,type:oneOf(['dock']),actorId:value.id,phase:oneOf(['moving','waiting','boarded']),at:value.pos,entrance:value.pos,crewId:(v,p)=>v===undefined?undefined:value.id(v,p)}),
  phase:object({...envelope,type:oneOf(['phase']),doorId:value.id,at:value.pos,phase:oneOf(['opened','closed','pending']),open:boolean,closingPending:boolean}),
  relay:object({...envelope,type:oneOf(['relay']),relayId:value.id,order:value.positive,phase:oneOf(['activated','waiting']),mergeId:value.id}),
  magnet:object({...envelope,type:oneOf(['magnet']),magnetId:value.id,cargoId:value.id,phase:oneOf(['pulled','waiting','delivered']),from:value.pos,to:value.pos,mergeId:value.id}),
  tether:object({...envelope,type:oneOf(['tether']),actorId:value.id,phase:oneOf(['released']),passengerIds:array(value.id,2,2) as Decoder<[string,string]>,cells:array(value.pos,2,2) as Decoder<[{r:number;c:number},{r:number;c:number}]>}),
  repair:object({...envelope,type:oneOf(['repair']),actorId:value.id,phase:oneOf(['collected','waiting','repaired']),jobId:nullable(value.id),kitId:nullable(value.id),at:value.pos}),
  rendezvous:object({...envelope,type:oneOf(['rendezvous']),phase:oneOf(['waiting','departed']),endpointIds:array(value.id,2,2) as Decoder<[string,string]>,passengerIds:array(value.id,2,2) as Decoder<[string,string]>}),
  jelly:object({...envelope,type:oneOf(['jelly']),fixtureId:value.id,phase:oneOf(['preview','coated','cleared','waiting','practice-assisted','practice-waited']),at:nullable(value.pos)}),
});
export function parseCampaignEvent(input:unknown):CampaignEvent{
  const parsed=event(input,'event');
  if(parsed.type==='merge'){unique(parsed.pieceIds,'event.pieceIds');unique(parsed.cells.map(p=>`${p.r},${p.c}`),'event.cells');if(parsed.pieceIds.length!==parsed.cells.length)fail('event.merge','piece/cell counts differ');}
  if(parsed.type==='mechanic'&&parsed.before.id!==parsed.after.id)fail('event.mechanic','discriminator changed');
  if(parsed.type==='crew'||parsed.type==='actor'||parsed.type==='fixture'){
    const id=parsed.type==='crew'?parsed.crewId:parsed.type==='actor'?parsed.actorId:parsed.fixtureId;
    if(!parsed.before&&!parsed.after)fail('event','empty state change');
    if((parsed.before&&parsed.before.id!==id)||(parsed.after&&parsed.after.id!==id))fail('event','entity ID mismatch');
  }
  return parsed;
}
export function parseCampaignEvents(input:unknown):CampaignEvent[]{
  const events=array(parseCampaignEvent)(input,'events');unique(events.map(e=>String(e.sequenceId)),'events.sequenceId');
  if(events.some((e,i)=>i>0&&e.sequenceId<=events[i-1]!.sequenceId))fail('events','sequence IDs must be ordered');return events;
}
export function parseSolutionTrace(input:unknown):SolutionTrace{
  return object<SolutionTrace>({levelId:integer(1,1000),...value.versions,initialHash:value.id,actions:array(parseCampaignAction),finalHash:value.id})(input,'trace');
}
export function parseCampaignChapter(input:unknown,chapter:number):CampaignLevel[]{
  integer(1,20)(chapter,'chapter');const levels=array(parseCampaignLevel,50,50)(input,'chapter');unique(levels.map(l=>String(l.id)),'chapter.levelIds');
  if(levels.some(l=>l.chapter!==chapter)||levels.some((l,i)=>l.id!==(chapter-1)*50+i+1))fail('chapter','must contain 50 consecutive ordered levels');return levels;
}
export function validateLevel(level:CampaignLevel):ValidationIssue[]{
  try{parseCampaignLevel(level);return [];}catch(error){return [{code:'schema',levelId:level.id,message:error instanceof Error?error.message:String(error)}];}
}
export function parseCampaignTransition(input:unknown):CampaignTransition{
  // Rejection is optional in the public contract; decode it separately without admitting extra fields.
  const base=object({accepted:boolean,state:parseCampaignState,events:parseCampaignEvents,rejection:(v:unknown,p:string)=>v===undefined?undefined:value.id(v,p)})(input,'transition');
  if(!base.accepted&&base.events.length)fail('transition.events','rejected actions cannot emit effects');
  if(base.accepted&&base.rejection!==undefined)fail('transition.rejection','accepted action cannot have rejection');
  return base;
}
