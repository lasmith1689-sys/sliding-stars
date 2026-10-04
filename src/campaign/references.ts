import type { Pos } from '../core/types';
import type { CampaignLevel,CampaignActor,CampaignCrew,CampaignPiece,CampaignFixture,CampaignArrival,GeometryDef,CampaignGoal,MechanicDef } from './types';
import { fail } from './decode';
export const cellKey=(p:Pos)=>`${p.r},${p.c}`;
export function unique(values:readonly string[],path:string):void {
  if(new Set(values).size!==values.length)fail(path,'duplicate ID or cell');
}
export function reference(value:string,ids:ReadonlySet<string>,path:string):void {
  if(!ids.has(value))fail(path,`bad reference '${value}'`);
}
export function geometryReferences(g:GeometryDef,path='geometry'):void {
  if(g.mask.length!==g.rows||g.mask.some(row=>row.length!==g.cols))fail(path,'mask dimensions differ');
  if(!g.mask.some(row=>row.some(Boolean)))fail(path,'no playable cells');
  const check=cellChecker(g),chambers=new Map(g.chambers.map(c=>[c.id,c])),segments=new Map(g.gravitySegments.map(s=>[s.id,s]));
  unique([...g.refillSources,...g.chambers,...g.gravitySegments,...g.routes,...g.connections,...g.endpoints].map(e=>e.id),path);
  unique(g.inactiveCells.map(cellKey),`${path}.inactiveCells`);g.inactiveCells.forEach(p=>check(p,'inactiveCells',true));
  for(const chamber of g.chambers){unique(chamber.cells.map(cellKey),'chamber.cells');unique(chamber.directions,'chamber.directions');chamber.cells.forEach(p=>check(p,'chamber.cells',true));}
  for(const segment of g.gravitySegments){
    reference(segment.chamberId,new Set(chambers.keys()),'segment.chamberId');
    const chamber=chambers.get(segment.chamberId)!;
    if(!chamber.directions.includes(segment.direction))fail('segment.direction','not allowed by chamber');
    unique(segment.cells.map(cellKey),'segment.cells');
    for(const [i,p] of segment.cells.entries()){
      check(p,'segment.cells',true);
      if(!chamber.cells.some(cell=>cellKey(cell)===cellKey(p)))fail('segment.cells','cell outside chamber');
      if(i>0){const prior=segment.cells[i-1]!;if(segment.direction==='down'?(p.r!==prior.r+1||p.c!==prior.c):(p.c!==prior.c-1||p.r!==prior.r))fail('segment.cells','cells must follow directed gravity');}
    }
  }
  for(const source of g.refillSources){
    check(source.at,'refill.at',true);reference(source.segmentId,new Set(segments.keys()),'refill.segmentId');
    if(cellKey(segments.get(source.segmentId)!.cells[0]!)!==cellKey(source.at))fail('refill.at','cell must be segment head');
  }
  for(const route of g.routes){unique(route.cells.map(cellKey),'route.cells');route.cells.forEach(p=>check(p,'route.cells',true));}
  for(const connection of g.connections){check(connection.from,'connection.from',!connection.active);check(connection.to,'connection.to',!connection.active);}
  for(const endpoint of g.endpoints)check(endpoint.at,'endpoint.at',!endpoint.active);
}
export function cellChecker(g:GeometryDef){
  const inactive=new Set(g.inactiveCells.map(cellKey));
  return(p:Pos,path:string,allowInactive=false)=>{
    if(!Number.isInteger(p.r)||!Number.isInteger(p.c)||!g.mask[p.r]?.[p.c])fail(path,'cell outside permitted footprint');
    if(!allowInactive&&inactive.has(cellKey(p)))fail(path,'cell is inactive');
  };
}
export interface Layers {geometry:GeometryDef;pieces:CampaignPiece[];crew:CampaignCrew[];actors:CampaignActor[];fixtures:CampaignFixture[];arrivals:CampaignArrival[]}
export function authoredPieceIds(level:CampaignLevel):Set<string>{
  return new Set([...level.pieces.map(p=>p.id),...level.fixtures.flatMap(f=>f.kind==='garden'?[f.harvestId]:[])]);
}
export function allAuthoredIds(level:CampaignLevel):Set<string>{
  return new Set([...level.pieces,...level.crew,...level.actors,...level.fixtures,...level.arrivals,
    ...level.arrivals.flatMap(a=>a.crew),...level.geometry.endpoints,...level.actors.flatMap(a=>a.kind==='repair'?a.jobs:[]),
    ...level.actors.flatMap(a=>a.kind==='pirate'?[{id:a.parcelId}]:[]),
    ...level.fixtures.flatMap(f=>f.kind==='garden'?[{id:f.harvestId}]:[])].map(e=>e.id));
}
export function layerReferences(layers:Layers,definition?:CampaignLevel):void {
  const {geometry:g,pieces,crew,actors,fixtures,arrivals}=layers,check=cellChecker(g);
  geometryReferences(g);
  const waiting=arrivals.filter(a=>a.status==='pending').flatMap(a=>a.crew),allCrew=[...crew,...waiting];
  const all=[...pieces,...allCrew,...actors,...fixtures,...arrivals,...g.endpoints,...actors.flatMap(a=>a.kind==='repair'?a.jobs:[])];
  unique(all.map(e=>e.id),'entities');
  const gardens=fixtures.filter(f=>f.kind==='garden'),pirates=actors.filter(a=>a.kind==='pirate');
  const reservedIds=[...gardens.map(f=>f.harvestId),...pirates.map(a=>a.parcelId)];
  unique(reservedIds,'reserved identities');
  if(!definition)unique([...all.map(e=>e.id),...reservedIds],'entities and reserved identities');
  else {
    for(const garden of gardens){
      if(!definition.fixtures.some(f=>f.kind==='garden'&&f.id===garden.id&&f.harvestId===garden.harvestId))fail('garden.harvestId','authored output identity changed');
    }
    for(const pirate of pirates){
      if(!definition.actors.some(a=>a.kind==='pirate'&&a.id===pirate.id&&a.parcelId===pirate.parcelId))fail('pirate.parcelId','authored held-item identity changed');
    }
    // A produced harvest is the one permitted live entity sharing a producer's output reference.
    for(const id of reservedIds){
      const garden=gardens.find(f=>f.harvestId===id);
      for(const entity of all.filter(e=>e.id===id)){
        if(!garden||!pieces.some(p=>p===entity&&p.kind==='cargo'&&p.cargoKind==='harvest'&&p.destinationId===garden.exitId))fail('reserved identities','duplicate identity across layers');
      }
    }
  }
  unique(pieces.map(p=>cellKey(p.at)),'pieces.cells');
  // Authored crew start separately; a real merge/tractor can stack them on shared terrain.
  if(!definition)unique(crew.filter(c=>c.status==='active'&&!c.carrierId).map(c=>cellKey(c.at)),'crew.cells');
  unique(actors.flatMap(a=>a.kind==='tether'&&!a.released?[cellKey(a.at),cellKey({r:a.at.r+a.offset.r,c:a.at.c+a.offset.c})]:[cellKey(a.at)]),'actors.cells');
  unique(fixtures.flatMap(f=>f.kind==='comet'?f.cells.map(cellKey):[cellKey(f.at)]),'fixtures.cells');
  for(const crate of fixtures.filter(f=>f.kind==='crate'))if(pieces.some(p=>cellKey(p.at)===cellKey(crate.at))||crew.some(c=>c.status==='active'&&cellKey(c.at)===cellKey(crate.at)))fail('crate.at','crate cell cannot contain terrain or crew');
  const blockingFixtures=new Set(fixtures.filter(f=>f.kind!=='phase-door'||!f.open).flatMap(f=>f.kind==='comet'?f.cells.map(cellKey):[cellKey(f.at)]));
  for(const actor of actors){const occupied=actor.kind==='tether'&&!actor.released?[actor.at,{r:actor.at.r+actor.offset.r,c:actor.at.c+actor.offset.c}]:[actor.at];if(occupied.some(p=>blockingFixtures.has(cellKey(p))))fail('actor.at','actor overlaps a blocking fixture');}
  const crewIds=new Set(allCrew.map(e=>e.id));
  // Retain semantic kinds from authored history when an entity has been consumed or removed.
  const knownFixtures=[...(definition?.fixtures??[]),...fixtures],knownPieces=[...(definition?.pieces??[]),...pieces],knownActors=[...(definition?.actors??[]),...actors];
  const endpoints=new Map(g.endpoints.map(e=>[e.id,e])),routes=new Map(g.routes.map(r=>[r.id,r]));
  const endpointIds=(kind:GeometryDef['endpoints'][number]['kind'])=>new Set(g.endpoints.filter(e=>e.kind===kind).map(e=>e.id));
  const fixtureIds=(kind:CampaignFixture['kind'])=>new Set(knownFixtures.filter(f=>f.kind===kind).map(f=>f.id));
  const cargoIds=(kind:Extract<CampaignPiece,{kind:'cargo'}>['cargoKind'])=>new Set(knownPieces.filter(p=>p.kind==='cargo'&&p.cargoKind===kind).map(p=>p.id));
  const carriers=[...pieces.filter(p=>p.kind==='pod'||p.kind==='cargo'),...actors.filter(a=>'passengerIds'in a)];
  const carrierIds=new Set(carriers.map(c=>c.id)),passengers=new Set<string>();
  for(const p of pieces){check(p.at,'piece.at');if(p.kind==='cargo'){
    const destinations=p.cargoKind==='key'?fixtureIds('lock'):p.cargoKind==='kit'?new Set(knownActors.filter(a=>a.kind==='repair').map(a=>a.id)):new Set([...endpointIds('exit'),...knownFixtures.flatMap(f=>f.kind==='magnet'&&f.cargoId===p.id?[f.dockId]:[])]);
    reference(p.destinationId,destinations,'cargo.destinationId');
    if(p.cargoKind!=='capsule'&&p.passengerIds.length)fail('cargo.passengerIds','only capsules carry crew');
  }}
  for(const carrier of carriers){if(!('passengerIds'in carrier))continue;unique(carrier.passengerIds,'carrier.passengerIds');
    for(const passengerId of carrier.passengerIds){reference(passengerId,crewIds,'carrier.passengerIds');
      if(passengers.has(passengerId))fail('carrier.passengerIds','duplicate passenger ownership');passengers.add(passengerId);
      const passenger=allCrew.find(c=>c.id===passengerId)!;
      if(passenger.carrierId!==carrier.id||passenger.status!=='active')fail('carrier.passengerIds','passenger ownership mismatch');
      const positionMatches=cellKey(passenger.at)===cellKey(carrier.at)||('kind'in carrier&&carrier.kind==='tether'&&cellKey(passenger.at)===cellKey({r:carrier.at.r+carrier.offset.r,c:carrier.at.c+carrier.offset.c}));
      if(!positionMatches)fail('carrier.passengerIds','passenger position mismatch');
    }
  }
  for(const c of allCrew){check(c.at,'crew.at');if(c.carrierId!==null){reference(c.carrierId,carrierIds,'crew.carrierId');if(!passengers.has(c.id))fail('crew.carrierId','missing reciprocal passenger reference');}
    if(!c.shelterStarted&&c.shelterMoves!==null)fail('crew.shelterMoves','shelter counter without started request');
  }
  for(const a of actors){check(a.at,'actor.at');if('routeId'in a&&a.routeId!==null){reference(a.routeId,new Set(routes.keys()),'actor.routeId');const route=routes.get(a.routeId)!;if(a.routeIndex>=route.cells.length||cellKey(a.at)!==cellKey(route.cells[a.routeIndex]!))fail('actor.routeIndex','actor does not occupy route index');}
    if(a.kind==='moonwhale')check(a.landing,'actor.landing');
    if(a.kind==='pup'){reference(a.nurseryId,new Set(endpoints.keys()),'pup.nurseryId');if(endpoints.get(a.nurseryId)!.kind!=='nursery')fail('pup.nurseryId','wrong endpoint kind');}
    if(a.kind==='pirate')reference(a.dockId,endpointIds('supply-dock'),'pirate.dockId');
    if(a.kind==='dock'){check(a.entrance,'dock.entrance');reference(a.endpointId,endpointIds('station'),'dock.endpointId');}
    if(a.kind==='tether'){if(Math.abs(a.offset.r)+Math.abs(a.offset.c)!==1)fail('tether.offset','must occupy adjacent cells');check({r:a.at.r+a.offset.r,c:a.at.c+a.offset.c},'tether.secondCell');}
    if(a.kind==='repair'){if(a.nextJob>a.jobs.length)fail('repair.nextJob','job index out of range');a.jobs.forEach(job=>check(job.cell,'repair.job',true));if(a.kitId!==null)reference(a.kitId,cargoIds('kit'),'repair.kitId');}
  }
  for(const f of fixtures){check(f.at,'fixture.at');
    if('cells'in f)f.cells.forEach(p=>check(p,'fixture.cells',f.kind==='bridge'||f.kind==='gate'));
    if(f.kind==='portal'){check(f.receiver,'portal.receiver');reference(f.segmentId,new Set(g.gravitySegments.map(s=>s.id)),'portal.segmentId');}
    if(f.kind==='garden')reference(f.exitId,endpointIds('exit'),'garden.exitId');
    if(f.kind==='lock'){reference(f.gateId,fixtureIds('gate'),'lock.gateId');reference(f.keyId,cargoIds('key'),'lock.keyId');}
    if(f.kind==='gravity-switch'){reference(f.chamberId,new Set(g.chambers.map(c=>c.id)),'gravity.chamberId');if(!g.chambers.find(c=>c.id===f.chamberId)!.directions.includes(f.direction))fail('gravity.direction','not allowed by chamber');}
    if(f.kind==='solar'){reference(f.endpointId,endpointIds('station'),'solar.endpointId');if(f.charge>f.quota)fail('solar.charge','charge exceeds quota');}
    if(f.kind==='relay')reference(f.endpointId,endpointIds('station'),'relay.endpointId');
    if(f.kind==='magnet'){reference(f.routeId,new Set(routes.keys()),'magnet.routeId');reference(f.cargoId,cargoIds('capsule'),'magnet.cargoId');reference(f.dockId,endpointIds('supply-dock'),'magnet.dockId');}
    if(f.kind==='jelly'){unique(f.coatedCells.map(cellKey),'jelly.coatedCells');f.coatedCells.forEach(p=>check(p,'jelly.coatedCell'));if(f.preview)check(f.preview,'jelly.preview');}
    if(f.kind==='reactor'&&f.fuse>f.period)fail('reactor.fuse','fuse exceeds period');
  }
  for(const a of arrivals){check(a.entry,'arrival.entry');unique(a.crew.map(c=>c.id),'arrival.crew');if(a.status==='admitted')for(const c of a.crew)reference(c.id,new Set(crew.map(c=>c.id)),'arrival.admittedCrew');}
}
export function eligibleIds(goal:CampaignGoal,level:CampaignLevel):string[]{
  return goal.eligible.type==='ids'?goal.eligible.ids:goal.eligible.sourceIds.flatMap(id=>level.arrivals.find(a=>a.id===id)?.crew.map(c=>c.id)??[id]);
}
export function goalReferences(level:CampaignLevel):void {
  unique(level.goals.map(g=>g.id),'goals');const all=allAuthoredIds(level);
  for(const goal of level.goals){const sourceIds=goal.eligible.type==='ids'?goal.eligible.ids:goal.eligible.sourceIds;
    unique(sourceIds,'goal.eligible');sourceIds.forEach(id=>reference(id,all,'goal.eligible'));
    const expanded=eligibleIds(goal,level);unique(expanded,'goal.eligible');
    if(goal.eligible.type==='sources'&&goal.eligible.target>expanded.length)fail('goal.target','target exceeds finite eligible population');
    const crew=new Set([...level.crew,...level.arrivals.flatMap(a=>a.crew)].map(c=>c.id));
    const allowed=new Set(goal.type==='homeCrew'||goal.type==='transferCreatures'||goal.type==='simultaneousDepartures'?crew:
      goal.type==='guideCreatures'?level.actors.filter(a=>a.kind==='pup').map(a=>a.id):
      goal.type==='interceptDrones'?level.actors.filter(a=>a.kind==='pirate').map(a=>a.id):
      goal.type==='growDeliverHarvest'?[...level.fixtures.flatMap(f=>f.kind==='garden'?[f.harvestId]:[]),...level.pieces.filter(p=>p.kind==='cargo'&&p.cargoKind==='harvest').map(p=>p.id)]:
      goal.type==='evacuate'?[...crew,...level.pieces.filter(p=>p.kind==='cargo').map(p=>p.id)]:
      goal.type==='recoverSupplies'?[...level.fixtures.filter(f=>f.kind==='crate').map(f=>f.id),...level.pieces.filter(p=>p.kind==='cargo').map(p=>p.id)]:
      [...level.fixtures.filter(f=>['bridge','gate','solar','relay'].includes(f.kind)).map(f=>f.id),...level.actors.flatMap(a=>a.kind==='repair'?a.jobs.map(j=>j.id):[])]);
    expanded.forEach(id=>reference(id,allowed,'goal.eligible kind'));
  }
}
export const FIXTURE_MECHANIC:Record<CampaignFixture['kind'],MechanicDef['id']>={crate:'crates',ice:'ice',reactor:'reactors',comet:'comets',portal:'portals',magnet:'magnets',bridge:'bridges',garden:'gardens',gate:'keys',lock:'keys','gravity-switch':'gravity',solar:'solar',jelly:'jelly','phase-door':'phase',relay:'relays'};
export const ACTOR_MECHANIC:Record<CampaignActor['kind'],MechanicDef['id']>={rover:'rovers',moonwhale:'moonwhales',pup:'pups',pirate:'pirates',dock:'docks',tether:'tethers',repair:'repair'};
export function mechanicReferences(level:CampaignLevel):void{
  unique(level.mechanics.map(m=>m.id),'mechanics');
  const active=new Set(level.mechanics.map(m=>m.id));
  for(const f of level.fixtures)if(!active.has(FIXTURE_MECHANIC[f.kind]))fail('fixture.kind','mechanic not declared');
  for(const a of level.actors)if(!active.has(ACTOR_MECHANIC[a.kind]))fail('actor.kind','mechanic not declared');
  for(const f of level.fixtures)if(!level.mechanics.some(m=>'fixtureIds'in m&&m.fixtureIds.includes(f.id)))fail('fixture.id','fixture reference not declared by mechanic');
  for(const a of level.actors)if(!level.mechanics.some(m=>'actorIds'in m&&m.actorIds.includes(a.id)))fail('actor.id','actor reference not declared by mechanic');
  if(level.arrivals.length&&!active.has('waves'))fail('arrivals','waves mechanic not declared');
  for(const m of level.mechanics){
    if('fixtureIds'in m){unique(m.fixtureIds,'mechanic.fixtureIds');m.fixtureIds.forEach(id=>reference(id,new Set(level.fixtures.filter(f=>FIXTURE_MECHANIC[f.kind]===m.id).map(f=>f.id)),'mechanic.fixtureIds'));}
    if('actorIds'in m){unique(m.actorIds,'mechanic.actorIds');m.actorIds.forEach(id=>reference(id,new Set(level.actors.filter(a=>ACTOR_MECHANIC[a.kind]===m.id).map(a=>a.id)),'mechanic.actorIds'));}
    if(m.id==='exits'||m.id==='rendezvous'){unique(m.endpointIds,'mechanic.endpointIds');m.endpointIds.forEach(id=>reference(id,new Set(level.geometry.endpoints.filter(e=>e.kind===(m.id==='exits'?'exit':'staging')).map(e=>e.id)),'mechanic.endpointIds'));}
    if(m.id==='waves'){unique(m.arrivalIds,'waves.arrivalIds');m.arrivalIds.forEach(id=>reference(id,new Set(level.arrivals.map(a=>a.id)),'waves.arrivalIds'));if(m.arrivalIds.length!==level.arrivals.length)fail('waves.arrivalIds','all arrivals must be declared');}
    if(m.id==='currents'){unique(m.routeIds,'currents.routeIds');m.routeIds.forEach(id=>reference(id,new Set(level.geometry.routes.filter(r=>r.loop).map(r=>r.id)),'currents.routeIds'));}
    if(m.id==='shelter'||m.id==='rendezvous'){const ids=m.id==='shelter'?m.crewIds:m.passengerIds;unique(ids,'mechanic.crewIds');ids.forEach(id=>reference(id,new Set([...level.crew,...level.arrivals.flatMap(a=>a.crew)].map(c=>c.id)),'mechanic.crewIds'));}
  }
}
