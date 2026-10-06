import type {CampaignState} from '../campaign/types';
import {pendingWaves,waveBlocked} from '../campaign/mechanics/waves';
import {whaleLandingSafe} from '../campaign/mechanics/moonwhales';
import {pupNextStep} from '../campaign/mechanics/pups';
import {currentMoves} from '../campaign/mechanics/currents';
import {pirateNextStep} from '../campaign/mechanics/pirates';
import {dockCanStep,dockNextStep} from '../campaign/mechanics/docks';
import {canMoveActor} from '../campaign/engine/transport';
import {sameCell} from '../campaign/engine/geometry';
import {portalReceiverBlocked} from '../campaign/mechanics/portals';
import {terrainName} from '../campaign/terrainLabels';
import {canPullMagnet,magnetTarget} from '../campaign/mechanics/magnets';
import {repairStep} from '../campaign/mechanics/repair';
import {pieceAt} from '../campaign/engine/occupancy';

export function relayCoachCopy(state:CampaignState):string|null {
 if(!state.level.mechanics.some(m=>m.id==='relays'))return null;
 const next=state.fixtures.filter((f):f is Extract<typeof f,{kind:'relay'}>=>f.kind==='relay'&&!f.active).sort((a,b)=>a.order-b.order)[0];
 if(!next)return state.status==='won'?'The numbered relays are glowing. Mission complete.':'All beacons are lit. Bring each guest onto the outlined HOME entrance.';
 return `Match beside NEXT beacon ${next.order}. Light the numbered beacons in order; each separate match lights one. All lights open HOME.`;
}
export function magnetCoachCopy(state:CampaignState):string|null {
 const definition=state.level.mechanics.find(m=>m.id==='magnets');if(!definition)return null;
 const delivered=state.mechanics.find(m=>m.id==='magnets')?.deliveredIds??[];
 const winch=state.fixtures.find(f=>f.kind==='magnet'&&!delivered.includes(f.cargoId));
 if(winch?.kind!=='magnet')return state.status==='won'?'Every marked supply parcel reached its dock.':'Parcels delivered. Finish the remaining mission goal.';
 const next=magnetTarget(state,winch),index=state.geometry.endpoints.filter(e=>e.kind==='supply-dock'&&e.active).findIndex(e=>e.id===winch.dockId)+1;
 if(next&&!canPullMagnet(state,winch))return `BOX ${index} is waiting. Clear row ${next.r+1}, column ${next.c+1}, then match beside its winch again to pull one stop.`;
 return `Match beside the horseshoe winch to pull BOX ${index} one dotted stop toward DOCK ${index}. Parcels cannot slide directly.`;
}
export function tetherCoachCopy(state:CampaignState):string|null {
 if(!state.level.mechanics.some(m=>m.id==='tethers'))return null;
 if(!state.actors.some(a=>a.kind==='tether'))return state.status==='won'?'The paired guests reached safe terrain together.':'The pair is unclipped. Bring each guest home if your mission still needs it.';
 return 'Drag either gold harness to move the pair one square. Both ends need biospheres or habitats together to unclip.';
}
export function repairCoachCopy(state:CampaignState):string|null {
 if(!state.level.mechanics.some(m=>m.id==='repair'))return null;
 const bot=state.actors.find(a=>a.kind==='repair'&&a.nextJob<a.jobs.length);
 if(bot?.kind!=='repair')return state.status==='won'?'The bot restored its route. Mission complete.':'All FIX cells are restored. Finish the remaining rescue.';
 const index=state.actors.filter(a=>a.kind==='repair').findIndex(a=>a.id===bot.id)+1;
 if(!bot.kitId)return `Match below KIT ${index} to lower it beside its bot. The bot collects an adjacent kit; kits cannot slide directly.`;
 const next=repairStep(state,bot);
 if(next&&!canMoveActor(state,bot.id,next))return `Kit aboard! Clear the bot's next stop at row ${next.r+1}, column ${next.c+1}. It is waiting to reach FIX ${bot.nextJob+1}.`;
 return `Kit aboard! Each valid move takes the bot one dotted stop. It repairs neighboring FIX ${bot.nextJob+1} in order.`;
}
export function rendezvousCoachCopy(state:CampaignState):string|null {
 const definition=state.level.mechanics.find(m=>m.id==='rendezvous');if(!definition)return null;
 if(state.mechanics.some(m=>m.id==='rendezvous'&&m.departed))return state.status==='won'?'Both occupied shuttles departed together. Mission complete.':'Both occupied shuttles departed together. Finish the remaining mission goal.';
 const ready=definition.endpointIds.map((id,index)=>{const pad=state.geometry.endpoints.find(e=>e.id===id);return !!pad?.active&&state.pieces.some(p=>p.kind==='pod'&&sameCell(p.at,pad.at)&&p.passengerIds.includes(definition.passengerIds[index]!));});
 const first=ready.findIndex(Boolean);
 if(first>=0)return `SHIP ${first+1} is ready at PAD ${first+1}. Fly SHIP ${2-first} to PAD ${2-first} to launch both together. The first can wait safely.`;
 return 'Fly SHIP 1 to PAD 1 and SHIP 2 to PAD 2. Both occupied shuttles depart together after a move with both pads ready.';
}
export function basicCoachCopy(state:CampaignState):string|null {
 if(state.status!=='playing')return null;
 const reactor=state.fixtures.find(f=>f.kind==='reactor');
 if(reactor)return `Match beside the reactor to cool it. Its eruption countdown ticks with moves, not seconds.`;
 if(state.fixtures.some(f=>f.kind==='comet'))return 'Match beside any part of the comet. Its shared hit count clears the whole frozen shape.';
 if(state.fixtures.some(f=>f.kind==='ice'))return 'Match beside the ice to thaw it. The number shows hits left; then the tile can slide again.';
 if(state.fixtures.some(f=>f.kind==='crate'))return 'Match beside the supply crate to unpack it. Each match removes one hit from its number.';
 if(state.actors.some(a=>a.kind==='rover'))return 'The rover carries its guests one dotted stop per move. Clear its route and guide it to a station door.';
 if(state.pieces.some(p=>p.kind==='pod'&&p.passengerIds.length))return 'Guest aboard! Fly the rescue shuttle one square at a time to a station\'s glowing entrance. Each flight costs a move.';
 if(state.pieces.some(p=>p.kind==='pod'))return 'Empty rescue shuttles need a match to move. Make a four-tile match with a guest to launch a shuttle carrying them home.';
 return null;
}
export function phaseCoachCopy(state:CampaignState):string|null {
 const doors=state.fixtures.filter(f=>f.kind==='phase-door');if(!doors.length)return null;
 if(state.status==='won')return 'The timed passages helped everyone reach safety.';
 const pending=doors.find(door=>door.closingPending);
 if(pending)return `Door at row ${pending.at.r+1}, column ${pending.at.c+1} is waiting to close. Its occupant may leave through the open passage; it closes on the first clear move.`;
 const closed=doors.find(door=>!door.open);
 if(closed)return `Door at row ${closed.at.r+1}, column ${closed.at.c+1} is closed. Make a valid move elsewhere to open it before routing through.`;
 return 'The phase passage is open now. Your next valid move asks it to close; an occupant keeps it open until clear. Plan the route one move ahead.';
}
export function dockCoachCopy(state:CampaignState):string|null {
 const dock=state.actors.find(a=>a.kind==='dock');if(!dock)return null;
 if(state.status==='won'){
  const boarded=state.mechanics.find(m=>m.id==='docks');
  return boarded?.id==='docks'&&state.crew.length>0&&state.crew.every(guest=>boarded.boardedIds.includes(guest.id))
   ?'Every guest boarded through the marked shuttle entrance.':'Everyone accounted for. Mission complete.';
 }
 const next=dockNextStep(state,dock);
 if(!next)return `Shuttle parked: BOARD at row ${dock.entrance.r+1}, column ${dock.entrance.c+1} is its final entrance. Bring each guest onto that safe cell.`;
 if(!dockCanStep(state,dock,next)){
  const entrance={r:next.r+dock.entrance.r-dock.at.r,c:next.c+dock.entrance.c-dock.at.c};
  return [next,entrance].some(at=>pieceAt(state,at)?.kind==='station')
   ?`The station stays fixed, so the shuttle waits here. Bring each guest onto safe BOARD at row ${dock.entrance.r+1}, column ${dock.entrance.c+1}.`
   :'Shuttle waiting: clear its next marked stop. Guests stay on their own tiles.';
 }
 if(state.levelId===756&&state.turn===0)return 'Slide row 1, column 2 DOWN. Watch the shuttle move while the safe guest waits.';
 return `BOARD is the entrance at row ${dock.entrance.r+1}, column ${dock.entrance.c+1}. The shuttle moves one track stop per move; only a guest on that exact safe cell boards.`;
}
export function solarCoachCopy(state:CampaignState):string|null {
 const collectors=state.fixtures.filter(f=>f.kind==='solar');if(!collectors.length)return null;
 const collector=collectors[0]!,entrance=state.geometry.endpoints.find(e=>e.id===collector.endpointId)!;
 if(entrance.active)return state.status==='won'?'The sunny entrance is open and the guest is home.':'The sunny entrance stays open. Bring each guest to its outlined cell.';
 const needed=collector.quota-collector.charge;
 if(state.levelId===661&&state.turn===0)return 'Slide row 1, column 2 DOWN. A Void (tier 1) combination beside the collector opens its marked entrance.';
 return `Match ${terrainName(collector.tier)} (tier ${collector.tier}) beside the collector ${needed} more time${needed===1?'':'s'}. Each real combination fills one ring segment; the outlined entrance opens at ${collector.quota}/${collector.quota}.`;
}
export function gravityCoachCopy(state:CampaignState):string|null {
 const sw=state.fixtures.find(f=>f.kind==='gravity-switch');if(!sw)return null;
 if(state.status==='won')return 'A new direction, a safe arrival! The chamber arrow keeps its final direction.';
 if((state.levelId===611||state.levelId===612)&&state.turn===0)return 'Slide row 2, column 1 RIGHT through the switch. Gravity turns LEFT; the guest rides the gap. Tiles refill from the right.';
 if(state.levelId===612&&state.turn===1)return 'The guest rode left. Guide them onto the fixed station\'s glowing side entrance.';
 const current=sw.direction.toUpperCase(),next=sw.direction==='down'?'LEFT':'DOWN',edge=sw.direction==='down'?'TOP':'RIGHT';
 return `Gravity NOW: ${current}; refill from ${edge}. Match THROUGH the switch for ${next}. ${state.levelId===615?'Clear OUT so its pod can cross and fall. Busy OUT waits.':'Riders follow pieces; fixtures stay put.'}`;
}
export function keyCoachCopy(state:CampaignState):string|null {
 const gates=state.fixtures.filter(f=>f.kind==='gate');if(!gates.length)return null;
 if(state.status==='won')return 'Star route restored! The gate stays open and your guest is home.';
 if(gates.every(g=>g.open))return state.fixtures.some(f=>f.kind==='bridge'&&!f.active)?'The key gate is open. Make two combinations beside the bridge hinge to finish the crew route.':'The star gate stays open. Guide the guest through the new route to the fixed station\'s entrance.';
 if(state.levelId===561&&state.turn===0)return 'Slide row 1, column 3 DOWN. The combination clears below the star key so it falls into LOCK 1.';
 return 'Match beneath the star key to lower it into its numbered lock. The matching gate opens permanently. Keys travel with gravity; they cannot slide directly.';
}
export function gardenCoachCopy(state:CampaignState):string|null {
 const plots=state.fixtures.filter(f=>f.kind==='garden');if(!plots.length)return null;
 if(state.status==='won')return 'Moon harvest delivered! The crop reached its marked exit.';
 const harvested=state.mechanics.find(m=>m.id==='gardens')?.harvestedIds??[];
 if(plots.some(p=>p.stage===3&&!harvested.includes(p.harvestId)))return 'Ripe crop waiting: clear the outlined CROP OUT cell. It waits safely and never replaces a piece or guest.';
 if(plots.every(p=>harvested.includes(p.harvestId)))return 'Your crop is cargo now. Match beneath it to lower it into its numbered exit; it cannot slide directly.';
 if(state.levelId===516&&state.turn===0)return 'Slide row 1, column 2 DOWN to make a combination through the plot. Three distinct combinations grow one crop.';
 if(state.levelId===516&&state.turn===1)return 'A first growth! Slide row 2, column 4 LEFT to make another combination containing the plot.';
 if(state.levelId===516&&state.turn===2)return 'One more growth: slide row 2, column 2 DOWN. Watch the crop leave its planter as cargo.';
 if(state.levelId===517&&state.turn===0)return 'Slide row 2, column 1 RIGHT through the plot. The outlined output is in the left lane; growth and delivery happen in different places.';
 if(state.levelId===517&&state.turn===1)return 'Slide row 1, column 3 DOWN to grow again. Each distinct combination adds only one stage.';
 if(state.levelId===517&&state.turn===2)return 'Slide row 2, column 3 DOWN for the third growth. Then clear the outlined output and deliver down the left lane.';
 return `Make combinations containing the plot: ${plots.map(p=>`${p.stage}/3 growth`).join(', ')}. Adjacent combinations alone do not grow it. Then clear beneath its crop.`;
}
export function bridgeCoachCopy(state:CampaignState):string|null {
 const bridges=state.fixtures.filter(f=>f.kind==='bridge');if(!bridges.length)return null;
 if(state.status==='won')return 'Bridges unfolded! The new cells are open for good.';
 const folded=bridges.filter(b=>!b.active);
 if(!folded.length)return 'The bridge is open. Make a move to carry the waiting rover across, then bring its guest to the station door.';
 if(state.levelId===426&&state.turn===0)return 'Slide row 1, column 2 DOWN. A combination beside the hinge lights its first lamp. Two lights open the marked space.';
 if(state.levelId===426&&folded[0]!.hits===1)return 'One light! Slide row 1, column 1 DOWN to make the second combination and unfold the bridge.';
 if(state.levelId===427&&folded[0]!.hits===1)return 'One more beside the hinge: slide row 2, column 3 RIGHT. Watch both marked panels unfold.';
 return `${folded.length} folded bridge${folded.length===1?'':'s'}: make combinations beside each hinge. ${folded.map(b=>`${b.hits}/2 lights`).join(', ')}. The outlined spaces cannot be entered until they open.`;
}
export function portalCoachCopy(state:CampaignState):string|null {
 const portals=state.fixtures.filter(f=>f.kind==='portal');if(!portals.length)return null;
 if(state.status==='won')return 'Twin-star crossing complete! Mission accomplished.';
 if(state.levelId===376&&state.turn===0)return 'Slide the riding pod LEFT into IN 1. Then swap the two bottom tiles in the right chamber to clear OUT 1.';
 if(state.levelId===377&&state.turn===0)return 'Slide the pod left twice to IN 1, then clear the three-tile column beneath OUT 1.';
 if(portals.some(p=>portalReceiverBlocked(state,p)))return 'Portal waiting: clear the linked OUT cell. The piece at IN keeps its riders and waits; the receiver never refills on its own.';
 return 'The matching numbers link IN and OUT. A clear OUT accepts its piece and riders before refill, then feeds the arrowed lane.';
}
export function pirateCoachCopy(state:CampaignState):string|null {
 const def=state.level.mechanics.find(m=>m.id==='pirates');if(!def)return null;
 const runtime=state.mechanics.find(m=>m.id==='pirates');
 const returned=runtime?.id==='pirates'&&def.actorIds.length>0&&def.actorIds.every(id=>runtime.interceptedIds.includes(id));
 if(state.status==='won')return returned?'Parcel returned! The playful drone has left. Supplies are safe.':'Mission complete! Your goal is met.';
 if(state.status==='lost'){
  const atDock=state.actors.some(a=>a.kind==='pirate'&&state.geometry.endpoints.some(e=>e.id===a.dockId&&sameCell(a.at,e.at)));
  return `${atDock?'The drone reached its dock.':'Mission ended.'} Try again right away; your credits and owned supplies are kept.`;
 }
 const pirate=state.actors.find(a=>a.kind==='pirate');if(pirate?.kind!=='pirate')return 'Parcel returned. Finish the remaining mission goal.';
 const next=pirateNextStep(state,pirate),dock=state.geometry.endpoints.find(e=>e.id===pirate.dockId)!;
 const points=`${pirate.distraction} distraction point${pirate.distraction===1?'':'s'}`;
 if(next&&sameCell(next,dock.at)&&state.level.metadata.failurePolicy==='no-failure')return `Practice pause: the drone waits before its dock. Match beside it to clear ${points}; take as many moves as you need.`;
 if(!next||!canMoveActor(state,pirate.id,next))return `Drone waiting: its route is blocked. Match beside it to clear ${points}; it will never overwrite a passenger or obstacle.`;
 if(sameCell(next,dock.at))return `Dock next! Match beside the drone now to clear ${points}. Dock arrival loses this mission; your possessions are kept.`;
 return `Match beside the drone: ${points}. Next stop: row ${next.r+1}, column ${next.c+1}. Each move advances one route stop.`;
}
export function currentCoachCopy(state:CampaignState):string|null {
 const def=state.level.mechanics.find(m=>m.id==='currents');if(!def)return null;
 if(state.status==='won')return 'Smooth sailing! The current helped everyone home.';
 if(def.routeIds.some(id=>currentMoves(state,state.geometry.routes.find(r=>r.id===id)!)===null))return 'Current waiting: an obstacle or blocked rider pauses its whole loop. Clear movable obstructions to let pieces and riders shift together. Stations stay fixed.';
 if(state.levelId===276&&state.turn===0)return 'Slide row 1, column 2 DOWN. Watch the current carry the guest one arrow to the station door.';
 if(state.levelId===277&&state.turn===0)return 'Match terrain to advance the current. Guide the guest to the fixed station\'s glowing side entrance.';
 if(state.levelId===280)return 'Match beside the whale to queue a hop. The current shifts after the whale. Then bring the guest home.';
 return 'Plan one arrow ahead. After all creatures step, every piece and its riders shift together; the closing arrow returns to the first cell.';
}
export function pupCoachCopy(state:CampaignState):string|null {
 if(!state.level.mechanics.some(m=>m.id==='pups'))return null;
 if(state.status==='won')return 'Happy paws! Every pup reached its nursery.';
 const pup=state.actors.find(a=>a.kind==='pup');if(pup?.kind!=='pup')return 'Pups are cozy. Finish the remaining crew rescue.';
 const next=pupNextStep(state,pup);if(!next)return 'Pup waiting: build a connected safe path to the nursery. Biospheres and habitats are safe; shuttles, stations and occupied cells block paws.';
 if(state.levelId===231&&state.turn===0)return 'Slide row 1, column 2 DOWN. Each move lets the pup take one safe step toward its nursery.';
 return `Next paw step: row ${next.r+1}, column ${next.c+1}. Make a move to walk there; the pup takes the shortest safe route.`;
}
export function moonwhaleCoachCopy(state:CampaignState):string|null {
 const whale=state.actors.find(a=>a.kind==='moonwhale');if(whale?.kind!=='moonwhale')return null;
 if(state.status==='won')return 'A happy hop! The marked transfer is complete.';
 if(!whale.passengerIds.length)return 'The guest is safely ashore. Finish the remaining rescue.';
 const mark=`row ${whale.landing.r+1}, column ${whale.landing.c+1}`;
 if(whale.transferRequested)return whaleLandingSafe(state,whale)?`Hop queued at ${mark}. Take a move to arrive safely.`:`Hop queued. Keep ${mark} safe or place a rescue shuttle there; the whale circles until it can land beside the mark.`;
 if(state.levelId===186)return 'Slide row 1, column 2 DOWN. The nearby match asks the whale to hop to the marked safe landing.';
 return `Match beside the whale to request a hop. Its marked landing is ${mark}; each move advances one loop stop.`;
}
export function waveCoachCopy(state:CampaignState):string|null {
 if(!state.level.mechanics.some(m=>m.id==='waves'))return null;
 if(state.status==='won')return 'A warm welcome! All required travelers are accounted for.';
 if(state.levelId===146)return state.turn===0?'Make a terrain match to welcome the shuttle. Guide the arriving guest to the fixed station\'s entrance.':'Guide the arriving guest onto the fixed station\'s glowing side entrance.';
 if(state.levelId===147)return 'Two guests arrive together. Guide each guest onto a fixed station\'s glowing side entrance.';
 if(state.levelId===149)return 'A busy entry makes the next shuttle wait. Guide the waiting guest to the station entrance to free the entry.';
 if(state.levelId===150)return 'Let the capsule depart, then make room for the incoming guest. Both goals matter.';
 return 'Prepare safe terrain before the shuttle arrives, then bring each guest to a station door.';
}
export function evacuationCopy(state:CampaignState):string|null {
 if(!state.level.mechanics.some(m=>m.id==='exits'))return null;
 if(state.status==='won')return 'A safe departure! Every marked traveler is on the way home.';
 if(state.levelId===111&&state.turn===0)return 'Slide the upper-right Void DOWN to match below the capsule. Crew stay safe aboard.';
 if(state.levelId===112&&state.turn===0)return 'Try row 2, column 3 DOWN. Watch the matches lower the capsule to Exit 1.';
 if(state.levelId===115)return 'Thaw the ice beside the descent lane, then match beneath the capsule.';
 return 'Match beneath capsules to lower them into their numbered exits. Passengers stay safe aboard.';
}
/** View-only finite-arrival preview; never admits crew or advances a clock. */
export function futureWaveCopy(state:Pick<CampaignState,'arrivals'|'turn'>&Partial<Pick<CampaignState,'geometry'|'crew'|'actors'|'fixtures'|'pieces'|'level'>>):string|null {
 const wave=pendingWaves(state.arrivals)[0];if(!wave)return null;
 const blocked=state.geometry&&state.crew&&state.actors&&state.fixtures&&state.pieces?waveBlocked({geometry:state.geometry,crew:state.crew,actors:state.actors,fixtures:state.fixtures,pieces:state.pieces},wave,state.level?.metadata.capOverride?.activeCrew??6):false;
 const due=Math.max(0,wave.turn-state.turn),phase=due?`${due} move${due===1?'':'s'}`:blocked?'0 moves · Waiting · free entry / crew space':'0 moves · ready at turn end';
 return `Next wave: ${wave.crew.length} crew · ${phase} · row ${wave.entry.r+1}, column ${wave.entry.c+1}`;
}

export function shelterCoachCopy(state:CampaignState):string|null {
 const def=state.level.mechanics.find(m=>m.id==='shelter');if(!def)return null;
 if(state.status==='won')return 'Cozy at last! Every guest is home and both needs are cleared.';
 const waiting=pendingWaves(state.arrivals)[0];
 if(waiting&&waiting.turn<=state.turn&&waveBlocked(state,waiting))return 'Shuttle waiting: the safe entry is busy. Bring the first guest home to welcome the next request.';
 const guests=state.crew.filter(c=>def.crewIds.includes(c.id)&&c.status==='active'),urgent=guests.some(c=>[c.rescueMoves,c.shelterMoves].some(n=>n!==null&&n<=5));
 if(urgent)return 'A guest needs help soon! The label shows the earlier oxygen or home deadline. Safety clears oxygen; only a station finishes the home request.';
 if(state.levelId===471&&state.turn===0)return 'Slide row 3, column 1 RIGHT to grow safe ground. Watch the little house request start with twenty moves.';
 if(state.levelId===471&&state.turn===1)return 'Safe ground starts the home request. Guide the guest to the fixed station\'s glowing side entrance. This practice clock pauses.';
 if(state.levelId===474&&state.turn===0)return 'One guest awaits home; the other needs safe ground first. Slide row 3, column 3 RIGHT to start the second request.';
 if(guests.some(c=>!c.shelterStarted))return 'A little house marks a future request. Reach safe terrain to start its twenty moves once; then find a station door.';
 return 'Safe is the beginning. Guide each little-house guest to a fixed station\'s entrance. Twenty moves are granted once; leaving safety never renews them.';
}
