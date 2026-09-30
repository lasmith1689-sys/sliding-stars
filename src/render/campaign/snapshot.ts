import type {CampaignState,CampaignPiece,CampaignCrew,CampaignActor,CampaignFixture,CampaignEvent,GeometryDef,CampaignArrival} from '../../campaign/types';
import type {Pos} from '../../core/types';
export interface CampaignScene {
 readonly version:'campaign-scene-1';readonly geometry:GeometryDef;
 readonly pieces:readonly CampaignPiece[];readonly crew:readonly CampaignCrew[];
 readonly actors:readonly CampaignActor[];readonly fixtures:readonly CampaignFixture[];
 readonly turn:number;readonly arrivals:readonly CampaignArrival[];readonly activeCrewCap:number;
 readonly departedExitIds:readonly string[];
 readonly arrivedNurseryIds:readonly string[];
 readonly returnedDockIds:readonly string[];
 readonly shelterCrewIds:readonly string[];
 readonly portalsComplete:boolean;
 readonly currentRouteIds:readonly string[];readonly currentsComplete:boolean;
 readonly docksComplete:boolean;
 readonly dockBoarded:boolean;
 readonly entityPositions:Readonly<Record<string,Pos>>;
}
type Source=Pick<CampaignState,'geometry'|'pieces'|'crew'|'actors'|'fixtures'|'turn'|'arrivals'>&{departedExitIds:string[];arrivedNurseryIds:string[];returnedDockIds:string[];activeCrewCap:number;shelterCrewIds:string[];portalsComplete:boolean;currentRouteIds:string[];currentsComplete:boolean;docksComplete:boolean;dockBoarded:boolean};
function sceneOf(source:Source):CampaignScene {
 const copy=structuredClone(source);
 const positions=Object.fromEntries([...copy.pieces,...copy.crew.filter(c=>c.status==='active'),...copy.actors,...copy.fixtures].map(e=>[e.id,{...('kind'in e&&e.kind==='gate'?e.cells[0]!:e.at)}]));
 return {...copy,version:'campaign-scene-1',entityPositions:positions};
}
/** Detached render model: no legacy board/goal adapter and no gameplay resolution. */
export function makeScene(state:CampaignState):CampaignScene {
 const departed=state.mechanics.flatMap(m=>m.id==='exits'?m.departedIds:[]);
 const departedExitIds=[...new Set(departed.flatMap(id=>{const p=state.level.pieces.find(p=>p.id===id);return p?.kind==='cargo'?[p.destinationId]:state.level.fixtures.flatMap(f=>f.kind==='garden'&&f.harvestId===id?[f.exitId]:[]);} ))].sort();
 const arrived=state.mechanics.flatMap(m=>m.id==='pups'?m.arrivedIds:[]),arrivedNurseryIds=[...new Set(state.level.actors.flatMap(a=>a.kind==='pup'&&arrived.includes(a.id)?[a.nurseryId]:[]))].sort();
 const intercepted=state.mechanics.flatMap(m=>m.id==='pirates'?m.interceptedIds:[]),returnedDockIds=[...new Set(state.level.actors.flatMap(a=>a.kind==='pirate'&&intercepted.includes(a.id)?[a.dockId]:[]))].sort();
 const dockBoarded=state.mechanics.some(m=>m.id==='docks'&&m.boardedIds.length>0);
 return sceneOf({shelterCrewIds:state.level.mechanics.flatMap(m=>m.id==='shelter'?m.crewIds:[]),geometry:state.geometry,pieces:state.pieces,crew:state.crew,actors:state.actors,fixtures:state.fixtures,turn:state.turn,arrivals:state.arrivals,activeCrewCap:state.level.metadata.capOverride?.activeCrew??6,departedExitIds,arrivedNurseryIds,returnedDockIds,portalsComplete:state.status==='won',currentRouteIds:state.level.mechanics.flatMap(m=>m.id==='currents'?m.routeIds:[]),currentsComplete:state.status==='won',dockBoarded,docksComplete:state.status==='won'&&dockBoarded});
}
export function applySceneEvents(scene:CampaignScene,events:readonly CampaignEvent[]):CampaignScene {
 const draft:Source={geometry:structuredClone(scene.geometry),pieces:structuredClone([...scene.pieces]),crew:structuredClone([...scene.crew]),actors:structuredClone([...scene.actors]),fixtures:structuredClone([...scene.fixtures]),turn:scene.turn,arrivals:structuredClone([...scene.arrivals]),activeCrewCap:scene.activeCrewCap,shelterCrewIds:[...scene.shelterCrewIds],departedExitIds:[...scene.departedExitIds],arrivedNurseryIds:[...scene.arrivedNurseryIds],returnedDockIds:[...scene.returnedDockIds],portalsComplete:scene.portalsComplete,currentRouteIds:[...scene.currentRouteIds],currentsComplete:scene.currentsComplete,docksComplete:scene.docksComplete,dockBoarded:scene.dockBoarded};
 const replace=<T extends {id:string}>(list:T[],id:string,next:T|null)=>{const i=list.findIndex(e=>e.id===id);if(i>=0)list.splice(i,1);if(next)list.push(structuredClone(next));};
 for(const event of [...events].sort((a,b)=>a.sequenceId-b.sequenceId))switch(event.type){
  case 'turn':draft.turn=event.after;break;
  case 'pirate':if(event.phase==='returned'&&!draft.returnedDockIds.includes(event.dockId)){draft.returnedDockIds.push(event.dockId);draft.returnedDockIds.sort();}break;
  case 'status':draft.portalsComplete=event.after==='won';draft.currentsComplete=event.after==='won';draft.docksComplete=event.after==='won'&&draft.dockBoarded;break;
  case 'dock':if(event.phase==='boarded')draft.dockBoarded=true;break;
  case 'arrival':{const arrival=draft.arrivals.find(a=>a.id===event.arrivalId);if(arrival)arrival.status=event.after;break;}
  case 'move':for(const entity of [...draft.pieces,...draft.crew,...draft.actors])if(entity.id===event.entityId||event.passengerIds.includes(entity.id))entity.at={...event.to};break;
  case 'transfer':{const crew=draft.crew.find(c=>c.id===event.crewId);if(crew){crew.at={...event.to};crew.carrierId=event.toCarrierId;}
   for(const carrier of [...draft.pieces,...draft.actors])if('passengerIds'in carrier&&carrier.kind!=='tether'){
    if(carrier.id===event.fromCarrierId)carrier.passengerIds=carrier.passengerIds.filter(id=>id!==event.crewId);
    if(carrier.id===event.toCarrierId&&!carrier.passengerIds.includes(event.crewId))carrier.passengerIds.push(event.crewId);
   }break;}
  case 'spawn':replace(draft.pieces,event.piece.id,event.piece);break;
  case 'remove':replace(draft.pieces,event.piece.id,null);if(event.reason==='departure'&&event.piece.kind==='cargo'&&!draft.departedExitIds.includes(event.piece.destinationId)){draft.departedExitIds.push(event.piece.destinationId);draft.departedExitIds.sort();}break;
  case 'terrain':{const piece=draft.pieces.find(p=>p.id===event.pieceId);if(piece?.kind==='tile')piece.tier=event.after;break;}
  case 'crew':replace(draft.crew,event.crewId,event.after);
   for(const carrier of [...draft.pieces,...draft.actors])if('passengerIds'in carrier&&carrier.kind!=='tether'){
    const aboard=event.after?.status==='active'&&event.after.carrierId===carrier.id;
    if(!aboard)carrier.passengerIds=carrier.passengerIds.filter(id=>id!==event.crewId);
    else if(!carrier.passengerIds.includes(event.crewId))carrier.passengerIds.push(event.crewId);
   }break;
  case 'actor':replace(draft.actors,event.actorId,event.after);if(event.before?.kind==='pup'&&event.after===null&&!draft.arrivedNurseryIds.includes(event.before.nurseryId)){draft.arrivedNurseryIds.push(event.before.nurseryId);draft.arrivedNurseryIds.sort();}break;
  case 'fixture':replace(draft.fixtures,event.fixtureId,event.after);break;
  case 'geometry':draft.geometry=structuredClone(event.after);break;
  case 'need':{const crew=draft.crew.find(c=>c.id===event.crewId);if(crew){if(event.need==='rescue')crew.rescueMoves=event.after;else crew.shelterMoves=event.after;}break;}
 }
 return sceneOf(draft);
}
