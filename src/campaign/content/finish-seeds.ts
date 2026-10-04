import type {Pos,Tier} from '../../core/types';
import type {CampaignAction,CampaignLevel} from '../types';
import {parseCampaignLevel} from '../schema';
import {teachingAt} from '../schedule';

/** Authored teaching boards: rows and causal controls are deliberately fixed. */
function base(id:number,rows:string[],purpose:string,shape:CampaignLevel['metadata']['shapeFamily']):CampaignLevel {
 const mask=rows.map(row=>[...row].map(ch=>ch!=='.')),cells=mask.flatMap((row,r)=>row.flatMap((on,c)=>on?[{r,c}]:[]));
 const level:CampaignLevel={id,chapter:Math.ceil(id/50),campaignVersion:'2026.1',rulesVersion:'campaign-1',seed:7,geometry:{rows:rows.length,cols:rows[0]!.length,mask,inactiveCells:[],chambers:[{id:'room',cells,directions:['down']}],gravitySegments:[],refillSources:[],routes:[],connections:[],endpoints:[]},pieces:rows.flatMap((row,r)=>[...row].flatMap((ch,c)=>'12345'.includes(ch)?[{id:`tile-${r}-${c}`,at:{r,c},kind:'tile' as const,tier:Number(ch) as Tier}]:[])),crew:[],actors:[],fixtures:[],arrivals:[],mechanics:[],goals:[],moveLimit:null,needMoves:30,presentationId:`lesson-${id}`,lessonId:`lesson-${id}`,rewardId:'campaign-level',metadata:{shapeFamily:shape,difficulty:'teaching',purposeTags:[purpose],failurePolicy:teachingAt(id)?.stage==='demonstration'?'no-failure':undefined,assistedAllowance:0,capOverride:null}};
 for(let c=0;c<level.geometry.cols;c++)for(let r=0;r<level.geometry.rows;r++){if(!mask[r]![c]||r>0&&mask[r-1]![c])continue;const run:Pos[]=[];for(let rr=r;rr<level.geometry.rows&&mask[rr]![c];rr++)run.push({r:rr,c});const segmentId=`column-${c}-${r}`;level.geometry.gravitySegments.push({id:segmentId,cells:run,direction:'down',chamberId:'room'});level.geometry.refillSources.push({id:`source-${c}-${r}`,at:{r,c},segmentId});}
 return level;
}
const swap=(from:Pos,to:Pos):CampaignAction=>({type:'swap',from,to});
const move=(dr:number,dc:number):CampaignAction=>({type:'translate',actorId:'tether-pair',dr,dc});
const guest=(id:string,at:Pos,carrierId:string)=>({id,at,carrierId,status:'active' as const,rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null});
const levels:CampaignLevel[]=[],actions:Record<number,CampaignAction[]>={};
function publish(level:CampaignLevel,route:CampaignAction[]){level.metadata.purposeTags.push(...level.mechanics.map(m=>m.id));levels.push(level);actions[level.id]=route;}

function magnetLesson(id:number,rows:string[],at:Pos,route:Pos[],coil:Pos,proof:CampaignAction[],shape:CampaignLevel['metadata']['shapeFamily'],crate?:Pos){
 const level=base(id,rows,'clear-the-next-winch-cell-with-a-real-match-before-pulling-supplies',shape);
 level.geometry.routes.push({id:'winch-lane',cells:route,loop:false});level.geometry.endpoints.push({id:'supply-dock',kind:'supply-dock',at:route.at(-1)!,active:true});
 level.pieces.push({id:'supply-capsule',kind:'cargo',cargoKind:'capsule',at,destinationId:'supply-dock',passengerIds:[]});level.fixtures.push({id:'magnet-coil',kind:'magnet',at:coil,routeId:'winch-lane',cargoId:'supply-capsule',dockId:'supply-dock'});level.mechanics.push({id:'magnets',fixtureIds:['magnet-coil']});
 const ids=['supply-capsule'];if(crate){level.fixtures.push({id:'supply-crate',kind:'crate',at:crate,hp:1});level.mechanics.push({id:'crates',fixtureIds:['supply-crate']});ids.push('supply-crate');}
 level.goals.push({id:'supplies',type:'recoverSupplies',eligible:{type:'ids',ids}});publish(level,proof);
}
magnetLesson(376,['1212','2131','1212','C131'],{r:3,c:0},[{r:3,c:0},{r:3,c:1}],{r:2,c:1},[swap({r:2,c:2},{r:2,c:1})],'compact-rectangle');
magnetLesson(377,['12121','21312','12121','C1131'],{r:3,c:0},[{r:3,c:0},{r:3,c:1},{r:3,c:2}],{r:2,c:1},[swap({r:2,c:0},{r:2,c:1}),swap({r:0,c:2},{r:1,c:2})],'wide-shelf');
magnetLesson(378,['1212','2131','1212','2131','1212','C113'],{r:5,c:0},[{r:5,c:0},{r:5,c:1},{r:5,c:2}],{r:4,c:1},[swap({r:4,c:0},{r:4,c:1}),swap({r:2,c:2},{r:3,c:2})],'tall-corridor');
magnetLesson(379,['.121.','21312','12121','21312','C113.'],{r:4,c:0},[{r:4,c:0},{r:4,c:1},{r:4,c:2}],{r:3,c:1},[swap({r:2,c:0},{r:2,c:1}),swap({r:3,c:3},{r:3,c:2})],'stepped-terraces');
magnetLesson(380,['.2121','213X2','12121','C1131'],{r:3,c:0},[{r:3,c:0},{r:3,c:1},{r:3,c:2}],{r:2,c:1},[swap({r:2,c:0},{r:2,c:1}),swap({r:0,c:2},{r:1,c:2})],'offset-chambers',{r:1,c:3});

function relayLesson(id:number,rows:string[],nodes:Pos[],proof:CampaignAction[],shape:CampaignLevel['metadata']['shapeFamily'],ice?:Pos){
 const level=base(id,rows,'light-the-numbered-relays-in-order-with-distinct-matches',shape);const entrance=level.pieces.at(-1)!.at;
 level.geometry.endpoints.push({id:'relay-home',kind:'station',at:entrance,active:false});level.fixtures.push(...nodes.map((at,i)=>({id:`relay-${i+1}`,kind:'relay' as const,at,order:i+1,active:false,endpointId:'relay-home'})));level.mechanics.push({id:'relays',fixtureIds:nodes.map((_,i)=>`relay-${i+1}`)});level.goals.push({id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:nodes.map((_,i)=>`relay-${i+1}`)}});
 if(ice){level.fixtures.push({id:'relay-crystal',kind:'ice',at:ice,hp:1});level.mechanics.push({id:'ice',fixtureIds:['relay-crystal']});}
 publish(level,proof);
}
relayLesson(841,['1212','2121','1212','2121'],[{r:2,c:0},{r:2,c:3}],[swap({r:2,c:1},{r:2,c:0}),swap({r:2,c:2},{r:2,c:3})],'compact-rectangle');
relayLesson(842,['12121','21212','12121','21212'],[{r:2,c:4},{r:2,c:0}],[swap({r:2,c:3},{r:2,c:4}),swap({r:2,c:1},{r:2,c:0})],'wide-shelf');
relayLesson(843,['1212','2121','1212','2121','1212','2121'],[{r:4,c:0},{r:4,c:3}],[swap({r:4,c:1},{r:4,c:0}),swap({r:4,c:2},{r:4,c:3})],'tall-corridor');
relayLesson(844,['.121.','21212','12121','21212','.121.'],[{r:2,c:1},{r:2,c:3}],[swap({r:2,c:0},{r:2,c:1}),swap({r:2,c:4},{r:2,c:3})],'stepped-terraces');
relayLesson(845,['12121','21212','12121','21212','12121'],[{r:2,c:0},{r:2,c:4}],[swap({r:2,c:1},{r:2,c:0}),swap({r:2,c:3},{r:2,c:4})],'compact-rectangle',{r:1,c:1});

function tetherLesson(id:number,rows:string[],at:Pos,offset:Pos,proof:CampaignAction[],shape:CampaignLevel['metadata']['shapeFamily'],relay?:Pos){
 const level=base(id,rows,'bring-both-ends-of-the-rigid-rescue-pair-to-safe-habitats-together',shape),ids:['pair-first','pair-second']=['pair-first','pair-second'];
 level.actors.push({id:'tether-pair',kind:'tether',at,offset,passengerIds:ids,released:false});level.crew.push(guest(ids[0],at,'tether-pair'),guest(ids[1],{r:at.r+offset.r,c:at.c+offset.c},'tether-pair'));level.mechanics.push({id:'tethers',actorIds:['tether-pair']});level.goals.push({id:'paired-release',type:'transferCreatures',eligible:{type:'ids',ids}});
 if(relay){level.fixtures.push({id:'pair-relay',kind:'relay',at:relay,order:1,active:false,endpointId:'pair-home'});level.geometry.endpoints.push({id:'pair-home',kind:'station',at:{r:4,c:4},active:false});level.mechanics.push({id:'relays',fixtureIds:['pair-relay']});level.goals.push({id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:['pair-relay']}});}
 publish(level,proof);
}
tetherLesson(881,['1212','2145','3213','1321'],{r:1,c:0},{r:0,c:1},[move(0,1),move(0,1)],'compact-rectangle');
tetherLesson(882,['12121','21454','32132','13213'],{r:1,c:0},{r:0,c:1},[move(0,1),move(0,1)],'wide-shelf');
tetherLesson(883,['1212','2131','1212','2131','1242','2151'],{r:0,c:0},{r:1,c:0},[move(0,1),move(0,1),move(1,0),move(1,0),move(1,0),move(1,0)],'tall-corridor');
tetherLesson(884,['.121.','21312','14521','13213','.213.'],{r:0,c:1},{r:0,c:1},[move(1,0),move(1,0)],'stepped-terraces');
tetherLesson(885,['12121','21212','12121','45212','12121'],{r:0,c:0},{r:0,c:1},[swap({r:2,c:3},{r:2,c:4}),move(1,0),move(1,0),move(1,0)],'compact-rectangle',{r:1,c:4});

function splitJobSources(level:CampaignLevel){const inactive=new Set(level.geometry.inactiveCells.map(p=>`${p.r},${p.c}`)),segments:CampaignLevel['geometry']['gravitySegments']=[];
 for(const source of level.geometry.gravitySegments){let run:Pos[]=[];const flush=()=>{if(run.length){segments.push({...source,id:`${source.id}-part-${segments.length}`,cells:run});run=[];}};for(const p of source.cells){if(inactive.has(`${p.r},${p.c}`)){flush();segments.push({...source,id:`${source.id}-job-${segments.length}`,cells:[p]});}else run.push(p);}flush();}
 level.geometry.gravitySegments=segments;level.geometry.refillSources=segments.map(s=>({id:`feed-${s.id}`,at:s.cells[0]!,segmentId:s.id}));
}
function repairLesson(id:number,rows:string[],kitAt:Pos,track:Pos[],jobs:Pos[],proof:CampaignAction[],shape:CampaignLevel['metadata']['shapeFamily'],ice?:Pos){
 const level=base(id,rows,'lower-the-repair-kit-then-open-each-authored-job-in-order',shape);level.geometry.inactiveCells=jobs;splitJobSources(level);level.geometry.routes.push({id:'repair-track',cells:track,loop:false});level.actors.push({id:'repair-bot',kind:'repair',at:track[0]!,routeId:'repair-track',routeIndex:0,jobs:jobs.map((cell,i)=>({id:`repair-job-${i+1}`,cell})),nextJob:0,kitId:null});level.pieces.push({id:'repair-kit',kind:'cargo',cargoKind:'kit',at:kitAt,destinationId:'repair-bot',passengerIds:[]});level.mechanics.push({id:'repair',actorIds:['repair-bot']});level.goals.push({id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:jobs.map((_,i)=>`repair-job-${i+1}`)}});if(ice){level.fixtures.push({id:'repair-crystal',kind:'ice',at:ice,hp:1});level.mechanics.push({id:'ice',fixtureIds:['repair-crystal']});}publish(level,proof);
}
repairLesson(921,['1212','K131','1212','213B'],{r:1,c:0},[{r:3,c:0},{r:3,c:1},{r:3,c:2}],[{r:3,c:3}],[swap({r:1,c:1},{r:2,c:1})],'compact-rectangle');
repairLesson(922,['12121','K1312','12121','2132B'],{r:1,c:0},[{r:3,c:0},{r:3,c:1},{r:3,c:2},{r:3,c:3}],[{r:3,c:4}],[swap({r:1,c:1},{r:2,c:1})],'wide-shelf');
repairLesson(923,['1212','2131','1212','K131','1212','213B'],{r:3,c:0},[{r:5,c:0},{r:5,c:1},{r:5,c:2}],[{r:5,c:3}],[swap({r:3,c:1},{r:4,c:1})],'tall-corridor');
repairLesson(924,['.213.','21312','K1312','12121','2132B'],{r:2,c:0},[{r:4,c:0},{r:4,c:1},{r:4,c:2},{r:4,c:3}],[{r:4,c:4}],[swap({r:2,c:1},{r:3,c:1})],'stepped-terraces');
repairLesson(925,['.2121','K1312','121B1','213B2'],{r:1,c:0},[{r:3,c:0},{r:3,c:1},{r:3,c:2},{r:3,c:3}],[{r:3,c:3},{r:2,c:3}],[swap({r:1,c:1},{r:2,c:1})],'offset-chambers',{r:3,c:1});

function rendezvousLesson(id:number,rows:string[],start:[Pos,Pos],pads:[Pos,Pos],proof:CampaignAction[],shape:CampaignLevel['metadata']['shapeFamily'],phase?:Pos){
 const level=base(id,rows,'place-both-occupied-shuttles-on-their-numbered-pads-at-the-same-time',shape),ids:['depart-first','depart-second']=['depart-first','depart-second'];
 for(const [i,at] of start.entries()){const podId=`depart-pod-${i+1}`;level.pieces.push({id:podId,kind:'pod',at,passengerIds:[ids[i]!]});level.crew.push(guest(ids[i]!,at,podId));}
 level.geometry.endpoints.push(...pads.map((at,i)=>({id:`departure-pad-${i+1}`,kind:'staging' as const,at,active:true})));level.mechanics.push({id:'rendezvous',endpointIds:['departure-pad-1','departure-pad-2'],passengerIds:ids});level.goals.push({id:'depart-together',type:'simultaneousDepartures',eligible:{type:'ids',ids}});if(phase){level.fixtures.push({id:'departure-phase',kind:'phase-door',at:phase,open:false,closingPending:false});level.mechanics.push({id:'phase',fixtureIds:['departure-phase']});}publish(level,proof);
}
rendezvousLesson(961,['1212','2131','1212','P12P'],[{r:3,c:0},{r:3,c:3}],[{r:3,c:1},{r:3,c:2}],[swap({r:3,c:0},{r:3,c:1}),swap({r:3,c:3},{r:3,c:2})],'compact-rectangle');
rendezvousLesson(962,['12121','21312','12121','P121P'],[{r:3,c:0},{r:3,c:4}],[{r:3,c:2},{r:3,c:3}],[swap({r:3,c:0},{r:3,c:1}),swap({r:3,c:1},{r:3,c:2}),swap({r:3,c:4},{r:3,c:3})],'wide-shelf');
rendezvousLesson(963,['1212','2131','1212','2131','1212','P12P'],[{r:5,c:0},{r:5,c:3}],[{r:5,c:1},{r:5,c:2}],[swap({r:5,c:0},{r:5,c:1}),swap({r:5,c:3},{r:5,c:2})],'tall-corridor');
rendezvousLesson(964,['.121.','21312','12121','21312','.P12P'],[{r:4,c:1},{r:4,c:4}],[{r:4,c:2},{r:4,c:3}],[swap({r:4,c:1},{r:4,c:2}),swap({r:4,c:4},{r:4,c:3})],'stepped-terraces');
rendezvousLesson(965,['12121','21212','12121','21212','P121P'],[{r:4,c:0},{r:4,c:4}],[{r:4,c:1},{r:4,c:3}],[swap({r:1,c:1},{r:1,c:0}),swap({r:4,c:0},{r:4,c:1}),swap({r:4,c:4},{r:4,c:3})],'compact-rectangle',{r:4,c:1});

export const finishLessonSeeds:readonly CampaignLevel[]=levels.map(parseCampaignLevel);
/** Exact first teaching decisions; repair route continuations are committed after replay. */
export const finishTeachingPlans:Readonly<Record<number,readonly CampaignAction[]>>=actions;
