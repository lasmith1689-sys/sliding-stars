/** Offline authoring only. Never import this module into the game entry point. */
import {createRng} from '../core/rng';
import type {CampaignAction,CampaignLevel,CampaignState,MechanicId,SolutionTrace} from './types';
import {authoredLessonSeeds} from './content/lesson-seeds';
import {lessonSolutionTraces} from './content/lesson-solutions.dev';
import {first} from './schedule';
import {loadCampaignLevel} from './engine/load';
import {transition} from './engine/turn';
import {hashState} from './engine/hash';

const EXCLUDED=new Set<MechanicId>(['portals','relays','tethers','repair','rendezvous']);
export const GENERATOR_VERSION='terrain-replay-1';
export interface GeneratedManifestEntry {
 id:number;seed:number;templateId:number;source:'authored'|'generated';proofLength:number;
 mechanics:MechanicId[];shape:string;rows:number;cols:number;activeCells:number;
 difficulty:CampaignLevel['metadata']['difficulty'];contentFingerprint:string;attempts:number;mirrored:boolean;changedTiles:number;
}
export interface GenerationResult {
 levels:CampaignLevel[];proofs:SolutionTrace[];manifest:GeneratedManifestEntry[];
 unresolved:{id:number;attempts:number;reason:string}[];rejections:Record<string,number>;
}
function stable(value:unknown):string {
 if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
 if(value&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
 return JSON.stringify(value);
}
function fingerprint(value:string):string {
 let hash=0xcbf29ce484222325n;
 for(const byte of new TextEncoder().encode(value))hash=BigInt.asUintN(64,(hash^BigInt(byte))*0x100000001b3n);
 return hash.toString(16).padStart(16,'0');
}
/** Compare the actual board, never title, mission number, RNG, clocks or entity names.
 * References become spatial identities so renaming a tile cannot create novelty. */
export function puzzleFingerprint(state:CampaignState):string {
 const refs=new Map<string,string>();
 for(const entity of [...state.pieces,...state.actors,...state.crew,...state.fixtures,...state.arrivals]){
  const at='at'in entity?entity.at:entity.entry;
  refs.set(entity.id,`${'kind'in entity?entity.kind:'status'in entity?'crew':'arrival'}@${at.r},${at.c}`);
 }
 for(const [kind,items] of Object.entries({segment:state.geometry.gravitySegments,chamber:state.geometry.chambers,route:state.geometry.routes,connection:state.geometry.connections,endpoint:state.geometry.endpoints,source:state.geometry.refillSources}))
  for(const item of items)refs.set(item.id,`${kind}:${stable('cells'in item?item.cells:'at'in item?item.at:{from:item.from,to:item.to})}`);
 const clean=(value:unknown):unknown=>{
  if(typeof value==='string')return refs.get(value)??value;
  if(Array.isArray(value))return value.map(clean);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['id','rescueMoves','shelterMoves','vipId'].includes(key)).map(([key,item])=>[key,clean(item)]));
  return value;
 };
 const sorted=(items:unknown[])=>items.map(clean).sort((a,b)=>stable(a).localeCompare(stable(b)));
 return fingerprint(stable({geometry:clean(state.geometry),pieces:sorted(state.pieces),crew:sorted(state.crew),actors:sorted(state.actors),fixtures:sorted(state.fixtures),arrivals:sorted(state.arrivals),goals:clean(state.level.goals)}));
}
function mirror<T>(value:T,cols:number):T {
 if(Array.isArray(value))return value.map(item=>mirror(item,cols)) as T;
 if(value&&typeof value==='object'){
  const object=value as Record<string,unknown>;
  if(typeof object.r==='number'&&typeof object.c==='number')return {...object,c:cols-1-object.c} as T;
  return Object.fromEntries(Object.entries(object).map(([key,item])=>[key,key==='facing'?(item==='left'?'right':'left'):mirror(item,cols)])) as T;
 }return value;
}
function replay(level:CampaignLevel,actions:readonly CampaignAction[]):{trace:SolutionTrace;initial:CampaignState}|null {
 const initial=loadCampaignLevel(level);
 // No opening auto-match/reshuffle: the puzzle being admitted is the authored layout.
 if(initial.status!=='playing'||initial.pieces.length!==level.pieces.length||initial.pieces.some(piece=>!level.pieces.some(p=>p.id===piece.id&&p.kind===piece.kind&&p.at.r===piece.at.r&&p.at.c===piece.at.c&&(!(p.kind==='tile'&&piece.kind==='tile')||p.tier===piece.tier))))return null;
 let state=initial;
 for(const action of actions){
  if(action.type==='booster'||state.status!=='playing')return null;
  const next=transition(state,action);if(!next.accepted)return null;state=next.state;
 }
 if(state.status!=='won')return null;
 return {initial,trace:{levelId:level.id,campaignVersion:level.campaignVersion,rulesVersion:level.rulesVersion,initialHash:hashState(initial),actions:structuredClone([...actions]),finalHash:hashState(state)}};
}
export function generateCampaign(options:{seed:number;throughLevel?:number;maxAttemptsPerLevel?:number;onProgress?:(done:number,result:GenerationResult)=>void}):GenerationResult {
 const through=options.throughLevel??1000,maxAttempts=options.maxAttemptsPerLevel??180;
 if(!Number.isInteger(through)||through<1||through>1000||!Number.isInteger(maxAttempts)||maxAttempts<1)throw Error('Invalid generation limits');
 const templates=authoredLessonSeeds.filter(level=>level.id<=805&&!level.mechanics.some(m=>EXCLUDED.has(m.id)));
 const authored=new Map(templates.map(level=>[level.id,level])),proofs=new Map(lessonSolutionTraces.map(trace=>[trace.levelId,trace]));
 const result:GenerationResult={levels:[],proofs:[],manifest:[],unresolved:[],rejections:{}};
 const reject=(reason:string)=>{result.rejections[reason]=(result.rejections[reason]??0)+1;};
 // Reserve authored fingerprints before generating, including future lessons.
 const reserved=new Map(templates.map(level=>[puzzleFingerprint(loadCampaignLevel(level)),level.id]));
 const seen=new Set(reserved.keys());
 for(let id=1;id<=through;id++){
  const fixed=authored.get(id),rng=createRng((options.seed^Math.imul(id,0x9e3779b1))>>>0);
  const available=templates.filter(level=>level.id<id&&level.geometry.rows>=4&&level.geometry.cols>=4&&level.mechanics.every(m=>first(m.id)+4<id));
  const newest=Math.max(0,...available.flatMap(level=>level.mechanics.map(m=>first(m.id))));
  const recent=available.filter(level=>level.mechanics.some(m=>first(m.id)>=newest-60));
  let accepted=false,lastReason='No eligible templates';
  for(let attempt=1;attempt<=(fixed?1:maxAttempts);attempt++){
   const pool=id%6===0||!recent.length?available:recent;
   const template=fixed??pool[rng.nextInt(pool.length)];if(!template)break;
   let level=structuredClone(template),actions=structuredClone(proofs.get(template.id)!.actions),mirrored=false,changedTiles=0;
   if(!fixed){
    level.id=id;level.chapter=Math.ceil(id/50);level.seed=rng.nextInt(0x100000000);level.lessonId=null;
    level.presentationId=`generated-${id}`;level.rewardId=`mission-${id}`;
    const proofLength=actions.length;
    level.metadata.difficulty=proofLength<=4?'gentle':'standard';delete level.metadata.failurePolicy;
    level.metadata.purposeTags=['seeded-terrain-variation',`template-${template.id}`,id%6===0?'familiar-rest':'recent-mechanic-practice'];
    level.needMoves=Math.max(30,template.needMoves);level.moveLimit=template.moveLimit===null?null:Math.max(30,proofLength*4);
    for(const crew of [...level.crew,...level.arrivals.flatMap(arrival=>arrival.crew)])if(crew.rescueMoves!==null)crew.rescueMoves=Math.max(30,crew.rescueMoves);
    if(rng.next()<0.5&&level.geometry.chambers.every(chamber=>chamber.directions.every(direction=>direction==='down'))&&!level.mechanics.some(m=>m.id==='gravity')){
     level=mirror(level,level.geometry.cols);level.geometry.mask=level.geometry.mask.map(row=>[...row].reverse());
     actions=mirror(actions,level.geometry.cols);mirrored=true;
    }
    const blocked=new Set([...level.crew,...level.actors,...level.fixtures].map(entity=>`${entity.at.r},${entity.at.c}`));
    const tiles=level.pieces.filter(p=>p.kind==='tile'&&p.tier<=3&&!blocked.has(`${p.at.r},${p.at.c}`));
    const changes=1+rng.nextInt(3);
    for(let j=0;j<changes&&tiles.length;j++){
     const piece=tiles.splice(rng.nextInt(tiles.length),1)[0]!;
     if(piece.kind==='tile'){piece.tier=(1+(piece.tier+rng.nextInt(2))%3) as 1|2|3;changedTiles++;}
    }
    if(!changedTiles){reject('no-mutable-terrain');continue;}
   }
   try{
    const checked=replay(level,actions);
    if(!checked){lastReason='proof-rejected';reject(lastReason);continue;}
    const key=puzzleFingerprint(checked.initial);
    if(!fixed&&seen.has(key)){lastReason='duplicate-board';reject(lastReason);continue;}
    if(fixed&&reserved.get(key)!==id){lastReason='duplicate-authored-board';reject(lastReason);continue;}
    seen.add(key);result.levels.push(level);result.proofs.push(checked.trace);
    result.manifest.push({id,seed:level.seed,templateId:template.id,source:fixed?'authored':'generated',proofLength:checked.trace.actions.length,mechanics:level.mechanics.map(m=>m.id),shape:level.metadata.shapeFamily,rows:level.geometry.rows,cols:level.geometry.cols,activeCells:level.geometry.mask.flat().filter(Boolean).length,difficulty:level.metadata.difficulty,contentFingerprint:key,attempts:attempt,mirrored,changedTiles});
    accepted=true;break;
   }catch(error){lastReason=error instanceof Error?error.message:'invalid-content';reject(lastReason.split(':')[0]!);}
  }
  if(!accepted)result.unresolved.push({id,attempts:fixed?1:maxAttempts,reason:lastReason});
  if(id%50===0||id===through)options.onProgress?.(id,result);
 }
 return result;
}
