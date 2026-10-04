import type { CampaignLevel,MechanicId } from './types';
import type { TEACHING_STAGES } from './schedule';
import { teachingAt } from './schedule';
import { authoredLessonSeeds } from './content/lesson-seeds';
export interface CampaignLesson {
  id:string;levelId:number;mechanicId:MechanicId|null;
  stage:'foundation'|typeof TEACHING_STAGES[number];title:string;instruction:string;
  artId:'terrain'|'canister'|'crystal'|'rover'|'reactor'|'comet'|'exit'|'wave'|'whale'|'pup'|'current'|'pirate'|'portal'|'bridge'|'shelter'|'garden'|'key'|'gravity'|'solar'|'jelly'|'dock'|'phase'|'magnet'|'relay'|'tether'|'repair'|'rendezvous';
}
const teachingCopy={
  magnets:{title:'A little magnetic winch',instruction:'Make a real combination beside the coil and clear the next marked lane cell. The winch pulls its own supply capsule one stop toward the matching dock before new terrain falls in. A full or blocked cell waits. Supply capsules cannot slide directly.',artId:'magnet'},
  relays:{title:'A little signal chain',instruction:'Light the numbered relays in order. A real combination beside the NEXT relay lights one node; later nodes wait for their turn. Each separate combination lights at most one node, even in a big match. Finish the chain to open its rescue entrance.',artId:'relay'},
  tethers:{title:'Two friends, one tether',instruction:'Drag either friend one cell to move both together. Their short tether keeps the same direction, and both destination cells must hold ordinary ground. Bring both friends onto biospheres or habitats at the same time to release them safely. A blocked end keeps the pair still.',artId:'tether'},
  repair:{title:'A little repair delivery',instruction:'Match beneath the repair kit to lower it beside the bot. The bot collects only its own kit, then moves one marked track stop after each real move. It repairs its numbered broken cells in order when beside them, opening new ground. A blocked stop waits safely.',artId:'repair'},
  rendezvous:{title:'A departure together',instruction:'Drag the occupied shuttles onto their matching numbered pads. The first shuttle waits safely until both exact guests are on their own pads at the same time. Then both depart together automatically. An empty shuttle or the wrong guest cannot complete the departure.',artId:'rendezvous'},
  phase:{title:'The patient phase door',instruction:'The passage opens and closes after valid moves. A guest or special piece in it keeps the door open with an amber WAIT cue; it closes on the first move after they leave. Ordinary ground beneath it stays in place. Closed doors open on the next valid move. Boosters and rejected gestures never change its phase.',artId:'phase'},
  docks:{title:'The visiting shuttle',instruction:'The shuttle moves one marked track stop each move. Its glowing BOARD square is the real entrance. Guests wait on their own safe terrain until that exact square reaches them; the shuttle never pulls tiles or guests along. A blocked stop waits, and the shuttle can meet a current as its lane turns.',artId:'dock'},
  jelly:{title:'A friendly space jelly',instruction:'Every third move the jelly coats one neighboring ordinary tile. The outlined cell is its next eligible target; a warm outline means spreading is due next move. A combination beside a coating clears it and stops spreading on that move. Crew, special pieces, cargo and important pathways stay safe.',artId:'jelly'},
  solar:{title:'Wake the sunny beacon',instruction:'Make a real combination of the requested terrain tier beside the collector. Each combination gives one charge, even a big one. Fill its lights to open the marked rescue entrance; the ready beacon stays open for later guests.',artId:'solar'},
  gravity:{title:'A little change of direction',instruction:'Make a combination containing the switch to turn its chamber between DOWN and LEFT. Its arrow shows the current fall; new tiles enter from the opposite edge. Riders follow their pieces, while switches and stations stay anchored. Another containing combination turns it back. A portal OUT stays unsourced.',artId:'gravity'},
  keys:{title:'A star opens the way',instruction:'Match beneath the star key to lower it onto its numbered lock. Only that exact key opens the matching gate. The route stays open for the station; keys cannot slide directly. A different key waits safely.',artId:'key'},
  gardens:{title:'A little moon harvest',instruction:'Make three distinct combinations containing the plot. Each grows one stage, even in a big match. The ripe crop waits until its outlined output cell clears, then falls as cargo to its numbered exit. Match beneath it to deliver; crops cannot be slid directly.',artId:'garden'},
  shelter:{title:'A cozy home request',instruction:'Guests marked with a little house ask for a station after their first safe arrival. They get twenty subsequent moves once, even if they leave and return to safety. In danger oxygen resumes too; the earlier deadline is shown. A station clears both requests.',artId:'shelter'},
  bridges:{title:'Unfold a little more space',instruction:'Make two combinations beside the hinge to unfold its marked cells. Each combination adds one light. The bridge stays open, new terrain falls in, and waiting rovers can cross.',artId:'bridge'},
  portals:{title:'Across the twin stars',instruction:'Slide a piece into IN, then clear its linked OUT. Pieces and their riders transfer before refill and fall along the receiving arrow. A busy receiver waits. Each piece travels at most once per move; the receiver has no ordinary refill.',artId:'portal'},
  pirates:{title:'A playful parcel return',instruction:'Make two combinations beside the drone to distract it. Each move it follows one route stop toward the supply dock; at zero points it returns its parcel and leaves. A blocked route waits. Reaching the dock loses an ordinary mission; possessions remain safe.',artId:'pirate'},
  currents:{title:'A gentle orbital current',instruction:'After each move and every creature step, all pieces and their riders travel one arrow along the current together. The closing arrow returns to the first cell. A station or a blocked rider makes the entire loop wait.',artId:'current'},
  pups:{title:'Little paws, safe paths',instruction:'Each move lets a moon-pup take one shortest step over safe biospheres and habitats to its nursery. Low terrain, stations, pods and occupied cells block the route. Build or clear a safe path when it waits.',artId:'pup'},
  moonwhales:{title:'A moonwhale hello',instruction:'Match beside the whale to ask for a hop. It circles one stop each move and waits to release its guest until its marked landing is beside it and safe, or holds a pod.',artId:'whale'},
  waves:{title:'A warm welcome',instruction:'Watch the finite shuttle queue. Crew arrive after the shown moves; a busy entry waits. Keep their landing safe, then slide a station door beside them.',artId:'wave'},
  exits:{title:'A gentle departure',instruction:'Match beneath a capsule to lower it into its marked exit. Passengers stay safe aboard; capsules move with gravity.',artId:'exit'},
  crates:{title:'Supply crates',instruction:'Make three combinations beside a crate to recover its supplies.',artId:'canister'},
  ice:{title:'Thaw the crystals',instruction:'Match beside ice to thaw it. Frozen terrain stays still until it clears.',artId:'crystal'},
  rovers:{title:'A safe ride home',instruction:'Each move lets the rover carry its crew one step toward a station door.',artId:'rover'},
  reactors:{title:'Cool the reactor',instruction:'Match beside the reactor to cool it. Its fuse counts moves; an eruption lowers neighboring terrain.',artId:'reactor'},
  comets:{title:'One connected comet',instruction:'Match beside any part to weaken the whole comet. All its cells clear together.',artId:'comet'},
} as const;
const foundationCopy=[
  'Welcome, Commander. Your stranded explorer needs a home. Slide the bottom flowering habitat left to join three habitats and build a rescue station.',
  'Build a way home. Match three biospheres to grow a flowering habitat, then three habitats to make a station.',
  'Rescue our botanist and the drifter. Raise terrain beneath crew or make a pod. Your first greenhouse is almost earned.',
];
export const authoredLessonLevels=authoredLessonSeeds;
const stageCopy={
  demonstration:'Try it together. Take as many moves as you need; this introduction cannot fail.',
  guided:'Follow the teaching moves across this wider board.',
  'independent-1':'Find the route through this taller board yourself.',
  'independent-2':'Plan around the missing corners and find a fresh approach.',
  combination:'Bring the rules together and complete every rescue and supply goal.',
} as const;
export const campaignLessons:readonly CampaignLesson[]=authoredLessonLevels.map(level=>{
  const teaching=teachingAt(level.id);
  if(teaching&&teaching.mechanicId in teachingCopy){
    const id=teaching.mechanicId;
    const copy=teachingCopy[id as keyof typeof teachingCopy];
    return {id:level.lessonId!,levelId:level.id,mechanicId:id,stage:teaching.stage,...copy,instruction:`${copy.instruction} ${stageCopy[teaching.stage]}`};
  }
  return {id:level.lessonId!,levelId:level.id,mechanicId:null,stage:'foundation',title:level.id===3?'Our first botanist':'Build a way home',instruction:foundationCopy[level.id-1]!,artId:'terrain'};
});
export function getAuthoredLessonLevel(id:number):CampaignLevel|undefined {
  const level=authoredLessonLevels.find(l=>l.id===id);return level?structuredClone(level):undefined;
}
