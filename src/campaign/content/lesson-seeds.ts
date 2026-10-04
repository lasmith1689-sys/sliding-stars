import type { Pos,Tier } from '../../core/types';
import type { CampaignFixture,CampaignLevel,GeometryDef,MechanicDef } from '../types';
import { parseCampaignLevel } from '../schema';
import { teachingAt } from '../schedule';
import {gravityTopology} from '../mechanics/gravity';
import {finishLessonSeeds} from './finish-seeds';

interface Seed {id:number;phase?:{at:Pos;open:boolean};dock?:{route:Pos[];entrance:Pos};jelly?:Pos;jellyCoated?:Pos[];gravity?:{at:Pos;minColumn?:number};rightStations?:boolean;keys?:{keyAt:Pos;lockAt:Pos;at:Pos;cells:Pos[]}[];gardens?:{at:Pos;outputAt:Pos;exitAt:Pos}[];shelter?:string[];bridges?:{at:Pos;cells:Pos[]}[];solar?:{at:Pos;entrance:Pos;tier:Tier;quota:number};rows:string[];portals?:{at:Pos;receiver:Pos}[];pirateRoute?:Pos[];currents?:Pos[][];whaleHome?:boolean;pups?:{at:Pos;nursery:Pos}[];crew?:Pos[];fixtures?:CampaignFixture[];rover?:Pos;route?:Pos[];whale?:{route:Pos[];landing:Pos};seed?:number;exits?:{at:Pos;capsuleAt:Pos}[];waves?:{id:string;turn:number;entry:Pos;count:number}[];purpose?:string;shape?:CampaignLevel['metadata']['shapeFamily']}
// Fixed authored rows, not a level generator. A dot is a mask gap, X an empty crate cell,
interface Seed {leftGravity?:boolean}
// S a left-facing station. Every contiguous gravity segment has an explicit source.
function expand(seed:Seed):CampaignLevel {
  const mask=seed.rows.map(row=>[...row].map(ch=>ch!=='.'));
  const cells=mask.flatMap((row,r)=>row.flatMap((yes,c)=>yes?[{r,c}]:[]));
  const geometry:GeometryDef={rows:mask.length,cols:mask[0]!.length,mask,inactiveCells:[],refillSources:[],gravitySegments:[],
    chambers:[{id:'room',cells,directions:['down']}],routes:[],connections:[],endpoints:[]};
  for(let c=0;c<geometry.cols;c++)for(let r=0;r<geometry.rows;r++){
    if(!mask[r]![c]||(r>0&&mask[r-1]![c]))continue;
    const run:Pos[]=[];for(let rr=r;rr<geometry.rows&&mask[rr]![c];rr++)run.push({r:rr,c});
    const id=`column-${c}-${r}`;geometry.gravitySegments.push({id,cells:run,direction:'down',chamberId:'room'});
    geometry.refillSources.push({id:`source-${c}-${r}`,at:{r,c},segmentId:id});
  }
  if(seed.route)geometry.routes.push({id:'rescue-route',cells:seed.route,loop:false});
  const tiers:Record<string,Tier>={'1':1,'2':2,'3':3,'4':4,'5':5};
  const pieces:CampaignLevel['pieces']=seed.rows.flatMap((row,r)=>[...row].flatMap((ch,c)=>{
    if(ch==='.'||ch==='X'||ch==='C'||ch==='B'||ch==='K')return [];
    return [ch==='S'?{id:`tile-${r}-${c}`,at:{r,c},kind:'station' as const,facing:'left' as const}:ch==='P'?{id:`tile-${r}-${c}`,at:{r,c},kind:'pod' as const,passengerIds:[]}:{id:`tile-${r}-${c}`,at:{r,c},kind:'tile' as const,tier:tiers[ch]!}];
  }));
  const fixtures=seed.fixtures??[],mechanics:MechanicDef[]=[];
  if(seed.phase){fixtures.push({id:'phase-0',kind:'phase-door',at:seed.phase.at,open:seed.phase.open,closingPending:false});mechanics.push({id:'phase',fixtureIds:['phase-0']});}
  if(seed.jelly){fixtures.push({id:'jelly-0',kind:'jelly',at:seed.jelly,coatedCells:seed.jellyCoated??[],preview:null});mechanics.push({id:'jelly',fixtureIds:['jelly-0']});}
  if(seed.rightStations)for(const p of pieces)if(p.kind==='station')p.facing='right';
  if(seed.gravity){
    const min=seed.gravity.minColumn??0,switched=cells.filter(p=>p.c>=min),outside=cells.filter(p=>p.c<min);
    geometry.chambers=[...(outside.length?[{id:'room',cells:outside,directions:['down' as const]}]:[]),{id:'switched',cells:switched,directions:['down','left']}];
    for(const s of geometry.gravitySegments)if(s.cells[0]!.c>=min)s.chamberId='switched';
    fixtures.push({id:'gravity-0',kind:'gravity-switch',at:seed.gravity.at,chamberId:'switched',direction:'down'});mechanics.push({id:'gravity',fixtureIds:['gravity-0']});
  }
  for(const [kind,id] of [['crate','crates'],['ice','ice'],['reactor','reactors'],['comet','comets']] as const){
    const fixtureIds=fixtures.filter(f=>f.kind===kind).map(f=>f.id);if(fixtureIds.length)mechanics.push({id,fixtureIds});
  }
  if(seed.portals){
    for(const [i,p] of seed.portals.entries()){
      const segment=geometry.gravitySegments.find(s=>s.cells[0]!.r===p.receiver.r&&s.cells[0]!.c===p.receiver.c)!;
      fixtures.push({id:`portal-${i}`,kind:'portal',at:p.at,receiver:p.receiver,segmentId:segment.id});
      geometry.refillSources=geometry.refillSources.filter(s=>s.segmentId!==segment.id);
    }
    mechanics.push({id:'portals',fixtureIds:fixtures.filter(f=>f.kind==='portal').map(f=>f.id)});
  }
  const crew:CampaignLevel['crew']=(seed.crew??[]).map((at,i)=>({id:`crew-${i}`,at,status:'active' as const,carrierId:seed.rover&&i===0?'rover':null,rescueMoves:seed.id===3?25:20,shelterMoves:null,shelterStarted:false,vipId:seed.id===3&&i===0?'botanist':null}));
  const actors:CampaignLevel['actors']=seed.rover?[{id:'rover',kind:'rover',at:seed.rover,routeId:seed.route?'rescue-route':null,routeIndex:0,passengerIds:['crew-0']}]:[];
  if(actors.length)mechanics.push({id:'rovers',actorIds:['rover']});
  const goals:CampaignLevel['goals']=crew.length?[{id:'home',type:'homeCrew',eligible:{type:'ids',ids:crew.map(c=>c.id)}}]:[];
  if(seed.solar){
    fixtures.push({id:'solar-0',kind:'solar',at:seed.solar.at,tier:seed.solar.tier,quota:seed.solar.quota,charge:0,endpointId:'solar-home'});
    geometry.endpoints.push({id:'solar-home',kind:'station',at:seed.solar.entrance,active:false});
    mechanics.push({id:'solar',fixtureIds:['solar-0']});
    goals.push({id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:['solar-0']}});
  }
  if(seed.bridges){
    for(const [i,b] of seed.bridges.entries()){
      const id=`bridge-${i}`,connectionIds=b.cells.map((_,j)=>`${id}-link-${j}`);
      fixtures.push({id,kind:'bridge',at:b.at,cells:b.cells,connectionIds,hits:0,active:false});geometry.inactiveCells.push(...b.cells);
      for(const [j,cell] of b.cells.entries())geometry.connections.push({id:connectionIds[j]!,from:j?b.cells[j-1]!:b.at,to:cell,active:false});
    }
    mechanics.push({id:'bridges',fixtureIds:fixtures.filter(f=>f.kind==='bridge').map(f=>f.id)});
    goals.push({id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:fixtures.filter(f=>f.kind==='bridge').map(f=>f.id)}});
  }
  if(seed.keys){
    for(const [i,k] of seed.keys.entries()){
      const id='gate-'+i,lockId='lock-'+i,keyId='key-'+i,connectionIds=k.cells.map((_,j)=>id+'-link-'+j);
      fixtures.push({id,kind:'gate',at:k.at,cells:k.cells,connectionIds,open:false},{id:lockId,kind:'lock',at:k.lockAt,gateId:id,keyId});
      pieces.push({id:keyId,kind:'cargo',cargoKind:'key',at:k.keyAt,destinationId:lockId,passengerIds:[]});
      geometry.inactiveCells.push(...k.cells);
      for(const [j,cell] of k.cells.entries())geometry.connections.push({id:connectionIds[j]!,from:j?k.cells[j-1]!:k.at,to:cell,active:false});
    }
    mechanics.push({id:'keys',fixtureIds:fixtures.filter(f=>f.kind==='gate'||f.kind==='lock').map(f=>f.id)});
    const restore=goals.find(g=>g.type==='restoreInfrastructure');const ids=fixtures.filter(f=>f.kind==='gate').map(f=>f.id);
    if(restore?.eligible.type==='ids')restore.eligible.ids.push(...ids);else goals.push({id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids}});
  }
  if(seed.pirateRoute){
    geometry.routes.push({id:'parcel-route',cells:seed.pirateRoute,loop:false});geometry.endpoints.push({id:'supply-dock',kind:'supply-dock',at:seed.pirateRoute.at(-1)!,active:true});
    actors.push({id:'pirate-0',kind:'pirate',at:seed.pirateRoute[0]!,routeId:'parcel-route',routeIndex:0,dockId:'supply-dock',distraction:2,parcelId:'parcel-0'});
    mechanics.push({id:'pirates',actorIds:['pirate-0']});goals.push({id:'intercept',type:'interceptDrones',eligible:{type:'ids',ids:['pirate-0']}});
  }
  if(seed.currents){for(const [i,cells] of seed.currents.entries())geometry.routes.push({id:`current-${i}`,cells,loop:true});mechanics.push({id:'currents',routeIds:seed.currents.map((_,i)=>`current-${i}`)});}
  if(seed.dock){const at=seed.dock.route[0]!;
    geometry.routes.push({id:'shuttle-track',cells:seed.dock.route,loop:false});geometry.endpoints.push({id:'shuttle-entrance',kind:'station',at:{...seed.dock.entrance},active:true});
    actors.push({id:'visiting-shuttle',kind:'dock',at,routeId:'shuttle-track',routeIndex:0,entrance:{...seed.dock.entrance},endpointId:'shuttle-entrance'});
    mechanics.push({id:'docks',actorIds:['visiting-shuttle']});
  }
  if(seed.pups){for(const [i,pup] of seed.pups.entries()){
    geometry.endpoints.push({id:`nursery-${i}`,kind:'nursery',at:pup.nursery,active:true});
    actors.push({id:`pup-${i}`,kind:'pup',at:pup.at,nurseryId:`nursery-${i}`});
  }mechanics.push({id:'pups',actorIds:seed.pups.map((_,i)=>`pup-${i}`)});goals.push({id:'pups',type:'guideCreatures',eligible:{type:'ids',ids:seed.pups.map((_,i)=>`pup-${i}`)}});}
  if(seed.whale){const at=seed.whale.route[0]!;
    geometry.routes.push({id:'whale-loop',cells:seed.whale.route,loop:true});
    actors.push({id:'moonwhale',kind:'moonwhale',at,routeId:'whale-loop',routeIndex:0,passengerIds:['whale-guest'],landing:seed.whale.landing,transferRequested:false});
    crew.push({id:'whale-guest',at,status:'active',carrierId:'moonwhale',rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null});
    mechanics.push({id:'moonwhales',actorIds:['moonwhale']});goals.push({id:'transfer',type:'transferCreatures',eligible:{type:'ids',ids:['whale-guest']}});
    if(seed.whaleHome)goals.push({id:'home',type:'homeCrew',eligible:{type:'ids',ids:['whale-guest']}});
  }
  if(seed.exits){
    for(const [i,exit] of seed.exits.entries()){
      const id=`capsule-${i}`,crewId=`traveler-${i}`,destinationId=`exit-${i}`;
      geometry.endpoints.push({id:destinationId,kind:'exit',at:exit.at,active:true});
      pieces.push({id,kind:'cargo',cargoKind:'capsule',at:exit.capsuleAt,destinationId,passengerIds:[crewId]});
      crew.push({id:crewId,at:exit.capsuleAt,status:'active',carrierId:id,rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null});
    }
    mechanics.push({id:'exits',endpointIds:geometry.endpoints.filter(e=>e.kind==='exit').map(e=>e.id)});
    goals.push({id:'evacuate',type:'evacuate',eligible:{type:'ids',ids:seed.exits.map((_,i)=>`traveler-${i}`)}});
  }
  const boxes=fixtures.filter(f=>f.kind==='crate');if(boxes.length)goals.push({id:'supplies',type:'recoverSupplies',eligible:{type:'ids',ids:boxes.map(f=>f.id)}});
  const arrivals:CampaignLevel['arrivals']=(seed.waves??[]).map(w=>({id:w.id,turn:w.turn,entry:w.entry,status:'pending',crew:Array.from({length:w.count},(_,i)=>({id:`${w.id}-crew-${i}`,at:{...w.entry},status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:null}))}));
  if(arrivals.length){mechanics.push({id:'waves',arrivalIds:arrivals.map(a=>a.id)});goals.push({id:'wave-home',type:'homeCrew',eligible:{type:'sources',sourceIds:arrivals.map(a=>a.id),target:arrivals.reduce((n,a)=>n+a.crew.length,0)}});}
  if(seed.shelter)mechanics.push({id:'shelter',crewIds:seed.shelter,allowance:20});
  if(seed.gardens){
    for(const [i,plot] of seed.gardens.entries()){
      const id=`garden-${i}`,exitId=`harvest-exit-${i}`,harvestId=`harvest-${i}`;
      fixtures.push({id,kind:'garden',at:plot.at,outputAt:plot.outputAt,exitId,harvestId,stage:0});
      geometry.endpoints.push({id:exitId,kind:'exit',at:plot.exitAt,active:true});
    }
    mechanics.push({id:'gardens',fixtureIds:seed.gardens.map((_,i)=>`garden-${i}`)},{id:'exits',endpointIds:seed.gardens.map((_,i)=>`harvest-exit-${i}`)});
    goals.push({id:'harvest',type:'growDeliverHarvest',eligible:{type:'ids',ids:seed.gardens.map((_,i)=>`harvest-${i}`)}});
  }
  if(seed.leftGravity){const sw=fixtures.find(f=>f.kind==='gravity-switch')!;Object.assign(geometry,gravityTopology({geometry,fixtures},sw,'left'));sw.direction='left';}
  return parseCampaignLevel({id:seed.id,chapter:Math.ceil(seed.id/50),campaignVersion:'2026.1',rulesVersion:'campaign-1',seed:seed.seed??7,geometry,pieces,crew,actors,fixtures,arrivals,mechanics,goals,moveLimit:null,needMoves:seed.id===3?25:20,
    presentationId:`lesson-${seed.id}`,lessonId:`lesson-${seed.id}`,rewardId:seed.id===3?'botanist-greenhouse':'campaign-level',
    metadata:{shapeFamily:seed.shape??(seed.rows.some(r=>r.includes('.'))?'diamond':geometry.rows>geometry.cols?'tall-corridor':geometry.cols>geometry.rows?'wide-shelf':'compact-rectangle'),difficulty:'teaching',purposeTags:[seed.purpose??'foundation',...(mechanics.map(m=>m.id))],failurePolicy:teachingAt(seed.id)?.stage==='demonstration'?'no-failure':undefined,assistedAllowance:0,capOverride:null}});
}

const seeds:Seed[]=[
 {id:801,rows:['.121.','21312','13.31','32323','.434.','.545.'],crew:[{r:5,c:1}],phase:{at:{r:5,c:2},open:false},purpose:'make-a-preparation-match-to-open-the-only-home-corridor',shape:'diamond'},
 {id:802,rows:['1213','2132','3213','132S'],crew:[{r:2,c:1}],phase:{at:{r:2,c:1},open:true},purpose:'let-an-occupied-door-wait-then-close-after-the-guest-leaves',shape:'wide-shelf'},
 {id:803,rows:['121','213','321','45S','213'],crew:[{r:3,c:0}],phase:{at:{r:3,c:1},open:false},purpose:'time-a-tall-narrow-rescue-through-a-reopened-passage',shape:'tall-corridor'},
 {id:804,rows:['.121','3213','4321','214S','.121'],crew:[{r:3,c:0}],phase:{at:{r:3,c:2},open:false},purpose:'choose-a-valid-wait-move-around-offset-corners-then-cross',shape:'stepped-terraces'},
 {id:805,rows:['K21.','112.','23..','4BBS'],crew:[{r:3,c:0}],keys:[{keyAt:{r:0,c:0},lockAt:{r:1,c:0},at:{r:2,c:1},cells:[{r:3,c:1},{r:3,c:2}]}],phase:{at:{r:3,c:0},open:true},purpose:'let-the-guest-leave-a-waiting-phase-door-as-the-exact-key-opens-the-permanent-gate',shape:'l'},
 {id:756,rows:['121S','2132','1324'],crew:[{r:2,c:3}],dock:{route:[{r:1,c:0},{r:1,c:1},{r:1,c:2},{r:1,c:3}],entrance:{r:2,c:0}},purpose:'watch-a-guest-wait-until-the-entrance-reaches-their-own-safe-tile'},
 {id:757,rows:['1213','2S32','1342','2131'],crew:[{r:2,c:2}],dock:{route:[{r:1,c:0},{r:1,c:1},{r:1,c:2}],entrance:{r:2,c:0}},purpose:'slide-a-blocking-station-away-before-the-entrance-continues'},
 {id:758,rows:['.121.','21P22','12341','21321','.121.'],crew:[{r:2,c:3}],dock:{route:[{r:1,c:0},{r:1,c:1},{r:1,c:2},{r:1,c:3}],entrance:{r:2,c:0}},purpose:'clear-a-middle-stop-then-board-a-guest-on-the-tall-safe-shelf',shape:'stepped-terraces'},
 {id:759,rows:['S2131','21321','14514','21321'],crew:[{r:2,c:1},{r:2,c:4}],dock:{route:[{r:1,c:0},{r:1,c:1},{r:1,c:2},{r:1,c:3},{r:1,c:4}],entrance:{r:2,c:0}},purpose:'board-two-separated-guests-on-distinct-entrance-stops'},
 {id:760,rows:['.S213','21321','13244','21321','.121.'],crew:[{r:2,c:4}],dock:{route:[{r:1,c:0},{r:1,c:1},{r:1,c:2},{r:1,c:3}],entrance:{r:2,c:0}},currents:[[{r:2,c:3},{r:2,c:4}]],purpose:'current-brings-a-waiting-guest-onto-the-shuttle-entrance',shape:'stepped-terraces'},
 {id:711,rows:['1...','1223','2132','3213','132S'],crew:[{r:0,c:0}],jelly:{r:2,c:2},seed:9,purpose:'watch-a-spread-then-clear-it-before-the-rescue'},
 {id:712,rows:['...1.','12121','21312','32131','132S1'],crew:[{r:0,c:3}],jelly:{r:2,c:1},jellyCoated:[{r:2,c:2}],seed:83,purpose:'clear-the-left-lane-then-use-its-tile-to-rescue'},
 {id:713,rows:['1...','3121','2123','2312','312S','1231'],crew:[{r:0,c:0}],jelly:{r:3,c:1},seed:1,purpose:'choose-a-different-tall-board-route-after-a-spread'},
 {id:714,rows:['...3.','.312.','12313','31232','21311','.23S.'],crew:[{r:0,c:3}],jelly:{r:3,c:2},jellyCoated:[{r:4,c:2}],seed:44,purpose:'time-the-third-turn-clear-before-crossing-the-open-cell',shape:'stepped-terraces'},
 {id:715,rows:['1...','3213','X131','3113','132S','2132','1321'],crew:[{r:0,c:0}],jelly:{r:3,c:2},fixtures:[{id:'jelly-reactor',kind:'reactor',at:{r:2,c:0},hp:3,fuse:3,period:3}],seed:35,purpose:'cool-an-erupting-reactor-while-clearing-a-new-coating'},
 {id:661,rows:['121','213','324'],crew:[{r:2,c:1}],solar:{at:{r:1,c:1},entrance:{r:2,c:1},tier:1,quota:1},purpose:'one-nearby-one-tier-merge-wakes-the-waiting-entrance'},
 {id:662,rows:['1213','2132','3241'],crew:[{r:2,c:1}],solar:{at:{r:1,c:1},entrance:{r:2,c:1},tier:2,quota:1},purpose:'ignore-the-easy-wrong-tier-merge-to-charge-the-requested-two'},
 {id:663,rows:['121','213','324','132'],crew:[{r:2,c:1}],solar:{at:{r:1,c:1},entrance:{r:2,c:1},tier:1,quota:2},purpose:'two-distinct-nearby-merges-are-needed-for-two-lights'},
 {id:664,rows:['.121','3213','1321','.213'],crew:[{r:2,c:2}],solar:{at:{r:1,c:2},entrance:{r:2,c:2},tier:1,quota:2},purpose:'charge-the-collector-around-missing-corners',shape:'stepped-terraces'},
 {id:665,rows:['1213','2132','3241','1321'],crew:[{r:2,c:1}],solar:{at:{r:1,c:1},entrance:{r:2,c:1},tier:1,quota:2},fixtures:[{id:'solar-reactor',kind:'reactor',at:{r:2,c:3},hp:1,fuse:4,period:4}],purpose:'charge-the-collector-while-cooling-a-familiar-reactor'},
 {id:611,rows:['213','121','S14'],crew:[{r:2,c:2}],rightStations:true,gravity:{at:{r:1,c:1}},purpose:'turn-left-to-carry-the-guest-into-the-station-door'},
 {id:612,rows:['2132','1213','S114'],crew:[{r:2,c:3}],rightStations:true,gravity:{at:{r:1,c:1}},purpose:'open-a-sideways-gap-then-meet-the-rider-on-the-wider-shelf'},
 {id:613,rows:['324','213','121','S14','231'],crew:[{r:3,c:2},{r:0,c:2}],rightStations:true,gravity:{at:{r:2,c:1}},purpose:'rescue-two-guests-at-different-heights-with-a-shared-switch'},
 {id:614,rows:['.421','3212','.11S'],crew:[{r:0,c:1}],leftGravity:true,gravity:{at:{r:1,c:2}},purpose:'start-left-and-turn-down-around-the-missing-corners',shape:'stepped-terraces'},
 {id:615,rows:['213.121','121.213','P21.S14'],crew:[{r:2,c:0}],rightStations:true,gravity:{at:{r:0,c:5},minColumn:4},portals:[{at:{r:2,c:0},receiver:{r:0,c:6}}],purpose:'turn-the-unsourced-portal-lane-to-bring-a-riding-pod-home',shape:'linked-lobes'},
 {id:561,rows:['K21.','112.','23..','4BBS'],crew:[{r:3,c:0}],keys:[{keyAt:{r:0,c:0},lockAt:{r:1,c:0},at:{r:2,c:1},cells:[{r:3,c:1},{r:3,c:2}]}],purpose:'lower-the-star-key-to-open-the-only-station-route',shape:'l'},
 {id:562,rows:['1K23.','2121.','121..','4BBBS'],crew:[{r:3,c:0}],keys:[{keyAt:{r:0,c:1},lockAt:{r:2,c:1},at:{r:2,c:2},cells:[{r:3,c:2},{r:3,c:1},{r:3,c:3}]}],purpose:'clear-the-middle-key-shaft-and-slide-through-the-wide-door',shape:'wide-shelf'},
 {id:563,rows:['K21.','112.','K21.','112.','23..','4BBS'],crew:[{r:5,c:0}],keys:[{keyAt:{r:0,c:0},lockAt:{r:1,c:0},at:{r:4,c:1},cells:[{r:5,c:1}]},{keyAt:{r:2,c:0},lockAt:{r:3,c:0},at:{r:5,c:3},cells:[{r:5,c:2}]}],purpose:'deliver-two-specific-keys-to-two-independent-locks-before-bringing-home',shape:'tall-corridor'},
 {id:564,rows:['.K23.','3213.','132..','4BBBS'],crew:[{r:3,c:0}],keys:[{keyAt:{r:0,c:1},lockAt:{r:2,c:1},at:{r:2,c:2},cells:[{r:3,c:2},{r:3,c:1},{r:3,c:3}]}],purpose:'find-the-key-descent-around-missing-corners',shape:'stepped-terraces'},
 {id:565,rows:['K2132','1121.','21B..','4BBBS'],crew:[{r:3,c:0}],keys:[{keyAt:{r:0,c:0},lockAt:{r:2,c:0},at:{r:2,c:1},cells:[{r:3,c:1}]}],bridges:[{at:{r:1,c:2},cells:[{r:2,c:2},{r:3,c:2},{r:3,c:3}]}],purpose:'deliver-a-key-and-charge-an-independent-bridge-to-free-the-station',shape:'offset-chambers'},
 {id:516,rows:['1213','2132','3241','1321'],gardens:[{at:{r:1,c:1},outputAt:{r:0,c:1},exitAt:{r:3,c:1}}],purpose:'three-distinct-combinations-grow-one-crop-then-clear-beneath-it'},
 {id:517,rows:['12132','21321','32413'],gardens:[{at:{r:1,c:1},outputAt:{r:0,c:0},exitAt:{r:2,c:0}}],purpose:'grow-in-the-center-but-route-the-fruit-down-the-left-shelf'},
 {id:518,rows:['121','213','324','132','213'],gardens:[{at:{r:2,c:1},outputAt:{r:0,c:1},exitAt:{r:4,c:1}}],purpose:'grow-the-middle-plot-and-clear-the-tall-delivery-shaft'},
 {id:519,rows:['.121','3213','1321','.213'],gardens:[{at:{r:1,c:2},outputAt:{r:0,c:2},exitAt:{r:3,c:2}}],purpose:'harvest-around-missing-corners-with-an-offset-growth-cell',shape:'stepped-terraces'},
 {id:520,rows:['12132','21321','32X13','13212'],gardens:[{at:{r:1,c:1},outputAt:{r:0,c:2},exitAt:{r:3,c:2}}],fixtures:[{id:'crop-crate',kind:'crate',at:{r:2,c:2},hp:3}],purpose:'open-the-supply-crate-before-delivering-the-garden-crop'},
 {id:471,rows:['3...','3431','2321','121S'],crew:[{r:0,c:0}],shelter:['crew-0'],purpose:'grow-safe-ground-to-start-the-request-then-bring-the-door',shape:'compact-rectangle'},
 {id:472,rows:['1213','2132','451S'],crew:[{r:2,c:0}],shelter:['crew-0'],purpose:'safe-is-only-the-start-bring-a-station-door-before-the-deadline',shape:'wide-shelf'},
 {id:473,rows:['121','213','324','P31','12S'],crew:[{r:3,c:0}],shelter:['crew-0'],purpose:'carry-a-requesting-guest-by-pod-without-renewing-the-clock',shape:'tall-corridor'},
 {id:474,rows:['...3.','.123.','23321','4541S','12.21'],crew:[{r:3,c:0},{r:0,c:3}],shelter:['crew-0','crew-1'],purpose:'one-guest-needs-safety-while-the-other-awaits-home-then-clear-both-doors',shape:'linked-lobes'},
 {id:475,rows:['12132','21321','4512S'],waves:[{id:'wave-a',turn:1,entry:{r:2,c:0},count:1},{id:'wave-b',turn:2,entry:{r:2,c:0},count:1}],shelter:['wave-a-crew-0','wave-b-crew-0'],purpose:'a-busy-safe-entry-waits-finish-the-first-request-to-welcome-the-next',shape:'wide-shelf'},
 {id:426,rows:['121','213','3B.'],bridges:[{at:{r:1,c:1},cells:[{r:2,c:1}]}],purpose:'two-combinations-light-the-hinge-and-open-a-new-cell',shape:'stepped-terraces'},
 {id:427,rows:['1213','2132','4BB.'],bridges:[{at:{r:1,c:1},cells:[{r:2,c:1},{r:2,c:2}]}],purpose:'choose-a-second-combination-beside-the-wide-span',shape:'wide-shelf'},
 {id:428,rows:['121','213','324','4B.','5B.'],bridges:[{at:{r:2,c:1},cells:[{r:3,c:1},{r:4,c:1}]}],purpose:'work-down-the-tall-shaft-to-feed-its-lower-hinge',shape:'tall-corridor'},
 {id:429,rows:['.121.','32132','4B.B4'],bridges:[{at:{r:1,c:1},cells:[{r:2,c:1}]},{at:{r:1,c:3},cells:[{r:2,c:3}]}],purpose:'charge-two-separate-hinges-around-the-missing-center',shape:'u'},
 {id:430,rows:['12132','21321','32413','4BB1S'],bridges:[{at:{r:2,c:1},cells:[{r:3,c:1},{r:3,c:2}]}],rover:{r:3,c:0},crew:[{r:3,c:0}],route:[{r:3,c:0},{r:3,c:1},{r:3,c:2},{r:3,c:3}],purpose:'open-the-absent-rover-route-before-the-safe-ride-home',shape:'compact-rectangle'},
 {id:376,rows:['12.12','21.1S','2P.21'],crew:[{r:2,c:1}],portals:[{at:{r:2,c:0},receiver:{r:0,c:3}}],purpose:'slide-a-pod-to-entry-then-clear-the-waiting-receiver',shape:'linked-lobes'},
 {id:377,rows:['....12','123.1S','12P.21'],crew:[{r:2,c:2}],portals:[{at:{r:2,c:0},receiver:{r:0,c:4}}],purpose:'route-a-riding-pod-across-the-bottom-shelf-before-release',shape:'offset-chambers'},
 {id:378,rows:['12.21','21.1S','32.12','12.23','2P.32'],crew:[{r:4,c:1}],portals:[{at:{r:4,c:0},receiver:{r:0,c:3}}],purpose:'clear-the-tall-receiver-by-moving-its-head-outward',shape:'tall-corridor'},
 {id:379,rows:['12.241','21.131','2S.312'],crew:[{r:0,c:4}],portals:[{at:{r:2,c:0},receiver:{r:0,c:5}}],purpose:'send-the-station-through-to-a-waiting-guest',shape:'linked-lobes'},
 {id:380,rows:['C21.121','112..12','213....'],portals:[{at:{r:1,c:0},receiver:{r:0,c:4}}],exits:[{capsuleAt:{r:0,c:0},at:{r:0,c:4}}],purpose:'lower-a-capsule-into-entry-and-clear-its-remote-exit',shape:'offset-chambers'},
 {id:326,rows:['121','213','324'],pirateRoute:[{r:2,c:0},{r:2,c:1},{r:2,c:2},{r:1,c:2},{r:0,c:2}],purpose:'practice-two-adjacent-combinations-with-a-visible-dock-pause'},
 {id:327,rows:['1213','2132','1432','2143'],pirateRoute:[{r:3,c:0},{r:3,c:1},{r:3,c:2},{r:3,c:3},{r:2,c:3},{r:1,c:3},{r:0,c:3}],purpose:'follow-a-moving-parcel-with-two-distinct-adjacent-matches'},
 {id:328,rows:['121','213','324','454','543'],pirateRoute:[{r:3,c:0},{r:4,c:0},{r:4,c:1},{r:4,c:2},{r:3,c:2},{r:2,c:2},{r:1,c:2},{r:0,c:2}],purpose:'intercept-around-the-bottom-turn-of-a-tall-route'},
 {id:329,rows:['.121','3213','4321','2143','.121'],pirateRoute:[{r:3,c:1},{r:3,c:2},{r:3,c:3},{r:2,c:3},{r:1,c:3},{r:0,c:3}],purpose:'time-adjacent-combinations-between-missing-corners',shape:'stepped-terraces'},
 {id:330,rows:['12132','21321','13212','21431'],pirateRoute:[{r:3,c:1},{r:3,c:2},{r:3,c:3},{r:3,c:4},{r:2,c:4},{r:1,c:4},{r:0,c:4}],fixtures:[{id:'cool-reactor',kind:'reactor',at:{r:2,c:0},hp:1,fuse:4,period:4}],purpose:'one-adjacent-match-cools-the-reactor-and-distracts-the-drone'},
 {id:276,rows:['121','213','45S'],crew:[{r:2,c:0}],currents:[[{r:2,c:0},{r:2,c:1}]],purpose:'ride-the-closing-edge-to-the-station'},
 {id:277,rows:['1213','2132','1432','214S'],crew:[{r:2,c:1}],currents:[[{r:2,c:1},{r:2,c:2},{r:3,c:2},{r:3,c:1}]],purpose:'anticipate-two-stops-before-the-door'},
 {id:278,rows:['121','213','324','454','54S'],crew:[{r:3,c:0}],currents:[[{r:3,c:0},{r:3,c:1},{r:4,c:1},{r:4,c:0}]],purpose:'bring-a-rider-up-the-tall-loop'},
 {id:279,rows:['.121','3213','4321','214S','.121'],crew:[{r:2,c:0},{r:3,c:0}],currents:[[{r:2,c:0},{r:2,c:1},{r:2,c:2},{r:3,c:2},{r:3,c:1},{r:3,c:0}]],purpose:'time-two-riders-around-one-door',shape:'stepped-terraces'},
 {id:280,rows:['121','213','14S','123'],whale:{route:[{r:1,c:0},{r:1,c:1},{r:0,c:1},{r:0,c:0}],landing:{r:2,c:0}},whaleHome:true,currents:[[{r:2,c:0},{r:2,c:1}]],purpose:'current-prepares-a-whale-landing-then-carries-the-guest-home'},
 {id:231,rows:['121','213','454'],pups:[{at:{r:2,c:0},nursery:{r:2,c:2}}],purpose:'one-safe-step-per-merge'},
 {id:232,rows:['1213','2132','4454'],pups:[{at:{r:2,c:0},nursery:{r:2,c:3}}],purpose:'a-longer-safe-walk'},
 {id:233,rows:['121','213','345','454'],pups:[{at:{r:3,c:0},nursery:{r:2,c:2}}],purpose:'safe-detour-around-low-terrain'},
 {id:234,rows:['.121','3213','3454','.454'],pups:[{at:{r:3,c:1},nursery:{r:2,c:3}}],purpose:'preserve-a-route-through-missing-corners',shape:'stepped-terraces'},
 {id:235,rows:['1213','2132','4545','454S'],pups:[{at:{r:3,c:0},nursery:{r:2,c:3}}],crew:[{r:3,c:1}],rover:{r:3,c:1},purpose:'share-safe-terrain-with-a-familiar-rover'},
 {id:186,rows:['121','213','432'],whale:{route:[{r:1,c:0},{r:1,c:1},{r:0,c:1},{r:0,c:0}],landing:{r:2,c:0}},purpose:'match-beside-a-whale-for-a-safe-hop'},
 {id:187,rows:['1213','2132','3241','423.'],whale:{route:[{r:1,c:0},{r:1,c:1},{r:2,c:1},{r:2,c:0}],landing:{r:3,c:0}},purpose:'queue-a-request-then-meet-the-mark',shape:'stepped-terraces'},
 {id:188,rows:['121','213','132','323'],whale:{route:[{r:1,c:0},{r:1,c:1},{r:2,c:1},{r:2,c:0}],landing:{r:3,c:1}},purpose:'build-the-marked-safe-landing',shape:'tall-corridor'},
 {id:189,rows:['.121','2132','1321','.P23'],whale:{route:[{r:1,c:1},{r:1,c:2},{r:2,c:2},{r:2,c:1}],landing:{r:3,c:1}},purpose:'meet-a-pod-at-the-mark',shape:'stepped-terraces'},
 {id:190,rows:['1213','2132','3241','451S'],crew:[{r:3,c:1}],rover:{r:3,c:1},whale:{route:[{r:1,c:0},{r:1,c:1},{r:2,c:1},{r:2,c:0}],landing:{r:3,c:0}},purpose:'transfer-and-a-familiar-rover-rescue'},
 {id:146,rows:['121','213','45S'],waves:[{id:'wave-a',turn:1,entry:{r:2,c:0},count:1}],purpose:'welcome-then-slide-the-station'},
 {id:147,rows:['1213','2132','451S'],waves:[{id:'wave-a',turn:1,entry:{r:2,c:0},count:2}],purpose:'one-group-two-independent-guests'},
 {id:148,rows:['121','213','321','45S'],waves:[{id:'wave-a',turn:2,entry:{r:0,c:0},count:1}],purpose:'prepare-safety-before-the-second-turn'},
 {id:149,rows:['.121','2132','3213','451S'],waves:[{id:'wave-a',turn:1,entry:{r:3,c:0},count:1},{id:'wave-b',turn:1,entry:{r:3,c:0},count:1}],purpose:'free-the-entry-for-the-next-wave',shape:'stepped-terraces'},
 {id:150,rows:['C213','112S','.45.'],exits:[{capsuleAt:{r:0,c:0},at:{r:1,c:0}}],waves:[{id:'wave-a',turn:1,entry:{r:1,c:0},count:1}],purpose:'departures-make-room-for-arrivals',shape:'stepped-terraces'},
 {id:111,rows:['C21','112'],exits:[{capsuleAt:{r:0,c:0},at:{r:1,c:0}}],purpose:'clear-below-the-capsule'},
 {id:112,rows:['1C21','2121','1212'],exits:[{capsuleAt:{r:0,c:1},at:{r:2,c:1}}],purpose:'cascade-descent'},
 {id:113,rows:['C213','1121','2132','121.'],exits:[{capsuleAt:{r:0,c:0},at:{r:3,c:0}}],purpose:'choose-merge-anchor',shape:'stepped-terraces'},
 {id:114,rows:['C21.C21','112.112'],exits:[{capsuleAt:{r:0,c:0},at:{r:1,c:0}},{capsuleAt:{r:0,c:4},at:{r:1,c:4}}],purpose:'two-designated-departures',shape:'wide-shelf'},
 {id:115,rows:['C213','1212','1121','2132'],exits:[{capsuleAt:{r:0,c:0},at:{r:3,c:0}}],fixtures:[{id:'exit-ice',kind:'ice',at:{r:1,c:0},hp:1}],purpose:'thaw-the-descent-lane'},
 {id:1,rows:['512','534','251'],crew:[{r:1,c:1}]},
 {id:2,rows:['.121.','21312','13.31','32323','.434.','.545.'],crew:[{r:3,c:2}],seed:11},
 {id:3,rows:['31213','21312','13.31','32323','.434.','.545.'],crew:[{r:3,c:2},{r:1,c:2}],seed:11},
 {id:4,rows:['1213','X132','3213','132S'],fixtures:[{id:'box',kind:'crate',at:{r:1,c:0},hp:3}]},
 {id:5,rows:['12121','213X2','32133','132S1'],fixtures:[{id:'box',kind:'crate',at:{r:1,c:3},hp:3}]},
 {id:6,rows:['1321','X123','2312','312S','1231'],fixtures:[{id:'box',kind:'crate',at:{r:1,c:0},hp:3}],seed:11},
 {id:7,rows:['.312.','123X3','31212','213S1','.231.'],fixtures:[{id:'box',kind:'crate',at:{r:1,c:3},hp:3}],seed:19},
 {id:8,rows:['1213','X132','3213','132S','2132','1321'],crew:[{r:3,c:0}],fixtures:[{id:'box',kind:'crate',at:{r:1,c:0},hp:3}],seed:23},
 {"id":16,"rows":["1...","1213","2132","3213","132S"],"crew":[{"r":0,"c":0}],"fixtures":[{"id":"ice","kind":"ice","at":{"r":0,"c":0},"hp":1}]},
 {"id":17,"rows":["...1.","12121","21312","32133","132S1"],"crew":[{"r":0,"c":3}],"fixtures":[{"id":"ice","kind":"ice","at":{"r":0,"c":3},"hp":1}]},
 {"id":18,"rows":["1...","1321","2123","2312","312S","1231"],"crew":[{"r":0,"c":0}],"fixtures":[{"id":"ice","kind":"ice","at":{"r":0,"c":0},"hp":2}],"seed":11},
 {"id":19,"rows":["...1.",".312.","12313","31212","213S1",".231."],"crew":[{"r":0,"c":3}],"fixtures":[{"id":"ice","kind":"ice","at":{"r":0,"c":3},"hp":2}],"seed":19},
 {"id":20,"rows":["1...","1213","X132","3213","132S","2132","1321"],"crew":[{"r":0,"c":0}],"fixtures":[{"id":"box","kind":"crate","at":{"r":2,"c":0},"hp":3},{"id":"ice","kind":"ice","at":{"r":0,"c":0},"hp":1}],"seed":23},
 {id:31,rows:['1213','2132','3213','132S'],crew:[{r:3,c:0}],rover:{r:3,c:0}},
 {id:32,rows:['13211','21232','23123','312S1'],crew:[{r:2,c:0}],rover:{r:2,c:0},route:[{r:2,c:0},{r:3,c:0},{r:3,c:1},{r:3,c:2}]},
 {id:33,rows:['2312','1231','3121','213S','1231'],crew:[{r:1,c:0}],rover:{r:1,c:0},seed:19},
 {id:34,rows:['.212.','21313','32132','132S1','.231.'],crew:[{r:0,c:3}],rover:{r:0,c:3},route:[{r:0,c:3},{r:1,c:3},{r:2,c:3},{r:2,c:2},{r:3,c:2}]},
 {id:35,rows:['1213','X132','3213','132S','2132','1321'],crew:[{r:3,c:0}],rover:{r:3,c:0},fixtures:[{id:'box',kind:'crate',at:{r:1,c:0},hp:3}],seed:23},
 {"id":56,"rows":["1...","1213","2132","3213","132S"],"crew":[{"r":0,"c":0}],"fixtures":[{"id":"reactor","kind":"reactor","at":{"r":0,"c":0},"hp":1,"fuse":4,"period":4}]},
 {"id":57,"rows":["...1.","12121","21312","32133","132S1"],"crew":[{"r":0,"c":3}],"fixtures":[{"id":"reactor","kind":"reactor","at":{"r":0,"c":3},"hp":2,"fuse":3,"period":3}]},
 {"id":58,"rows":["1...","1321","2123","2312","312S","1231"],"crew":[{"r":0,"c":0}],"fixtures":[{"id":"reactor","kind":"reactor","at":{"r":0,"c":0},"hp":2,"fuse":2,"period":3}],"seed":11},
 {"id":59,"rows":["...1.",".312.","12313","31212","213S1",".231."],"crew":[{"r":0,"c":3}],"fixtures":[{"id":"reactor","kind":"reactor","at":{"r":0,"c":3},"hp":3,"fuse":1,"period":3}],"seed":19},
 {"id":60,"rows":["1...","1213","X132","3213","132S","2132","1321"],"crew":[{"r":0,"c":0}],"fixtures":[{"id":"box","kind":"crate","at":{"r":2,"c":0},"hp":3},{"id":"reactor","kind":"reactor","at":{"r":0,"c":0},"hp":2,"fuse":3,"period":3}],"seed":23},
 {"id":81,"rows":["1...","2...","1213","2132","3213","132S"],"crew":[{"r":0,"c":0}],"fixtures":[{"id":"comet","kind":"comet","at":{"r":0,"c":0},"cells":[{"r":0,"c":0},{"r":1,"c":0}],"hp":1}]},
 {"id":82,"rows":["...1.","...2.","12121","21312","32133","132S1"],"crew":[{"r":0,"c":3}],"fixtures":[{"id":"comet","kind":"comet","at":{"r":0,"c":3},"cells":[{"r":0,"c":3},{"r":1,"c":3}],"hp":1}]},
 {"id":83,"rows":["1...","2...","1321","2123","2312","312S","1231"],"crew":[{"r":0,"c":0}],"fixtures":[{"id":"comet","kind":"comet","at":{"r":0,"c":0},"cells":[{"r":0,"c":0},{"r":1,"c":0}],"hp":2}],"seed":11},
 {"id":84,"rows":["...1.","...2.",".312.","12313","31212","213S1",".231."],"crew":[{"r":0,"c":3}],"fixtures":[{"id":"comet","kind":"comet","at":{"r":0,"c":3},"cells":[{"r":0,"c":3},{"r":1,"c":3}],"hp":2}],"seed":19},
 {"id":85,"rows":["1...","2..1","1213","2132","3213","132S","2132","1321"],"crew":[{"r":0,"c":0},{"r":1,"c":3}],"fixtures":[{"id":"comet","kind":"comet","at":{"r":0,"c":0},"cells":[{"r":0,"c":0},{"r":1,"c":0}],"hp":2},{"id":"ice","kind":"ice","at":{"r":1,"c":3},"hp":1}],"seed":23},
];
export const authoredLessonSeeds:readonly CampaignLevel[]=seeds.filter(seed=>seed.id<376||seed.id>380).map(expand).concat(finishLessonSeeds).sort((a,b)=>a.id-b.id);
/** Compatibility fixtures preserve exact retired definitions for save migration. */
export const retiredPortalLessonSeeds:readonly CampaignLevel[]=seeds.filter(seed=>seed.id>=376&&seed.id<=380||seed.id===615).map(expand).sort((a,b)=>a.id-b.id);
