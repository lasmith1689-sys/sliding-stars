import type {CampaignState,MechanicId} from '../campaign/types';

/** Only teach rules present on this board. Future mechanics stay out of the guide. */
const topics:Partial<Record<MechanicId,{title:string;body:string}>>={
 crates:{title:'Supply crates',body:'Make matches beside a crate to unpack it. The number shows hits left; each separate match removes one hit.'},
 ice:{title:'Ice crystals',body:'Match beside ice to thaw it. Its number shows hits left. Frozen cells cannot slide until cleared.'},
 rovers:{title:'Rescue rovers',body:'The rover follows its dotted route one stop per move, carrying its guests. Clear blocked stops so it can continue.'},
 reactors:{title:'Cool the reactor',body:'Match beside the reactor to remove its cooling hits. Its countdown ticks with moves; an eruption lowers nearby terrain.'},
 comets:{title:'Frozen comets',body:'Match beside any part of a comet to chip away at its shared hit count. Clear it to open the whole footprint.'},
 exits:{title:'Capsule departures',body:'Match beneath a capsule to lower it into its numbered exit. Capsules cannot slide directly; passengers stay safe aboard.'},
 waves:{title:'Incoming travelers',body:'The arrival counter shows moves until the next group lands. Keep their entry clear, prepare safe terrain, then guide them home.'},
 moonwhales:{title:'Moonwhale hops',body:'Match beside the whale to request a hop. It moves one loop stop each turn. Keep its marked LAND square clear and safe; the request waits until the whale reaches it.'},
 pups:{title:'Moon-pup nursery',body:'Build a connected path of biospheres or habitats to the nursery. Each move lets the pup take one safe step. Pods, stations and occupied cells block paws.'},
 currents:{title:'Orbital currents',body:'Plan one marked step ahead. After each move, the loop carries terrain and riders together. Amber means something blocks the whole loop; clear the lane to restart it.'},
 pirates:{title:'Playful pirate drones',body:'Make two matches beside the drone to return its parcel before it reaches the dock. It advances one route stop per move. You can retry freely; losing never takes your saved possessions.'},
 bridges:{title:'Fold-out bridges',body:'Make two separate matches beside the hinge to light both lamps. The outlined gap becomes playable terrain, letting waiting rovers cross.'},
 shelter:{title:'A home after safety',body:'A little house marks a guest who needs shelter. First reaching safe ground starts a 20-move home request. Only a station finishes it; leaving safety does not renew the clock.'},
 gardens:{title:'Moon gardens',body:'Make three separate matches that include the plot itself. The ripe crop waits for CROP OUT to clear, then becomes cargo. Match underneath to deliver it through its numbered exit.'},
 keys:{title:'Star keys and gates',body:'Match beneath a key to lower it into its matching numbered lock. The gate opens for good. Keys cannot slide directly.'},
 gravity:{title:'Gravity switches',body:'A match through the switch turns gravity between DOWN and LEFT. Terrain and riders fall toward the arrow; new tiles enter from the opposite edge. Fixtures and stations stay anchored.'},
 solar:{title:'Solar collectors',body:'Match the requested terrain beside the collector. Each separate match fills one ring segment. Fill the ring to open the glowing entrance, then bring a guest onto it.'},
 jelly:{title:'Friendly space jelly',body:'Jelly coats a neighboring tile every third move. Match beside a coating to clear it and pause that turn’s spreading. Its outlined square shows the next target.'},
 docks:{title:'Visiting shuttle',body:'The shuttle moves one track stop per move. Bring a guest onto the safe BOARD square at its side. That entrance moves with the shuttle; blocked stops make it wait.'},
 phase:{title:'Phase doors',body:'The passage alternates open and closed after valid moves. An occupant holds an open door until the cell clears. Make a move elsewhere to reopen a closed passage.'},
};
export function campaignGuideTopics(state:Pick<CampaignState,'level'>){
 return state.level.mechanics.flatMap(mechanic=>{
  const topic=topics[mechanic.id];return topic?[{id:mechanic.id,...topic}]:[];
 });
}
