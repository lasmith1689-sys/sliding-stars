import {rolldown} from 'rolldown';
import {readFile,writeFile} from 'node:fs/promises';
const bundle=await rolldown({input:'scripts/campaign/physics-runtime.ts'}),built=await bundle.generate({format:'esm'});await bundle.close();
const code=built.output.find(item=>item.type==='chunk')?.code;if(!code)throw Error('No physics audit bundle');
const api=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const levels=(await Promise.all(Array.from({length:20},(_,i)=>readFile(`src/campaign/content/chapter-${String(i+1).padStart(2,'0')}.json`,'utf8')))).flatMap(JSON.parse);
const old=JSON.parse(await readFile('validation/campaign/generated/proofs.json','utf8'));
const reportPath=process.argv.find(arg=>arg.startsWith('--report='))?.slice('--report='.length)??'validation/physics-audit-2026-10-05.json';
const failures=[],revised=[],proofs=[];
for(const level of levels){
 const prior=old.find(p=>p.levelId===level.id);if(!prior)throw Error(`Missing proof ${level.id}`);
 let state,initialHash,actions=[];
 try{state=api.loadCampaignLevel(level);initialHash=api.hashState(state);for(const action of prior.actions){if(state.status!=='playing')break;const next=api.transition(state,action);if(!next.accepted)break;actions.push(action);state=next.state;}}
 catch(error){failures.push({id:level.id,error:String(error)});continue;}
 if(state.status!=='won'){
  if(!process.argv.includes('--repair')){failures.push({id:level.id,status:state.status,acceptedPrefix:actions.length});continue;}
  console.log(`Searching revised physics route for mission ${level.id}`);
  const solved=api.solveCampaign(level,{maxNodes:30000,maxDepth:18,maxMilliseconds:45000});
  if(solved.status!=='solved'){failures.push({id:level.id,...solved});continue;}
  actions=solved.trace.actions;state=api.loadCampaignLevel(level);for(const action of actions)state=api.transition(state,action).state;
 }
 const trace={...prior,initialHash,actions,finalHash:api.hashState(state)};
 const replay=api.replayTrace(level,trace);if(!replay.won){failures.push({id:level.id,issues:replay.issues});continue;}
 if(JSON.stringify(prior)!==JSON.stringify(trace))revised.push(level.id);proofs.push(trace);
}
// Keep teaching sequences causal when a shorter route skips the featured rule.
// Complete these legal prefixes with the fixed-station solver; boards stay immutable.
const teachingPrefixes={
 471:[[2,0,2,1]],
 713:[[3,1,3,2],[1,0,1,1],[3,2,3,3]],
 714:[[2,3,3,3],[1,1,2,1],[1,1,2,1]],
 715:[[1,1,1,2],[2,2,2,3],[1,1,1,2],[1,2,1,3]],
};
if(!failures.length&&process.argv.includes('--repair'))for(const [key,cells] of Object.entries(teachingPrefixes)){
 const id=Number(key),index=proofs.findIndex(p=>p.levelId===id),prior=proofs[index],level=levels.find(l=>l.id===id);
 const prefix=cells.map(([r,c,toR,toC])=>({type:'swap',from:{r,c},to:{r:toR,c:toC}}));
 if(JSON.stringify(prior.actions.slice(0,prefix.length))===JSON.stringify(prefix))continue;
 try{
  let state=api.loadCampaignLevel(level);
  for(const action of prefix){const next=api.transition(state,action);if(!next.accepted)throw Error(`Teaching prefix ${id} rejected`);state=next.state;}
  console.log(`Completing causal fixed-station teaching route ${id}`);
  const solved=api.solveCampaignState(state,{maxNodes:30000,maxDepth:18,maxMilliseconds:45000});
  if(solved.status!=='solved')throw Error(`Teaching route ${id} unresolved: ${JSON.stringify(solved)}`);
  const trace={...prior,actions:[...prefix,...solved.trace.actions],finalHash:solved.trace.finalHash};
  const replay=api.replayTrace(level,trace);if(!replay.won)throw Error(`Teaching route ${id} failed replay`);
  proofs[index]=trace;if(!revised.includes(id))revised.push(id);
 }catch(error){failures.push({id,error:String(error)});}
}
let lessons,retired,hints,manifest;
const revisedHistorical=[];
function historicalTrace(level,prior,label){
 let state=api.loadCampaignLevel(level),initialHash=api.hashState(state),actions=[];
 for(const action of prior.actions){if(state.status!=='playing')break;const next=api.transition(state,action);if(!next.accepted)break;actions.push(action);state=next.state;}
 if(state.status!=='won'){
  console.log(`Searching fixed-station route for ${label} ${level.id}`);
  const solved=api.solveCampaign(level,{maxNodes:30000,maxDepth:18,maxMilliseconds:45000});
  if(solved.status!=='solved')throw Error(`${label} ${level.id} unresolved: ${JSON.stringify(solved)}`);
  actions=solved.trace.actions;state=api.loadCampaignLevel(level);for(const action of actions)state=api.transition(state,action).state;
 }
 const trace={levelId:level.id,campaignVersion:level.campaignVersion,rulesVersion:level.rulesVersion,initialHash,actions,finalHash:api.hashState(state)};
 const replay=api.replayTrace(level,trace);if(!replay.won)throw Error(`${label} ${level.id} replay failed: ${JSON.stringify(replay.issues)}`);
 if(JSON.stringify(actions)!==JSON.stringify(prior.actions))revisedHistorical.push(`${label}-${level.id}`);
 return trace;
}
if(!failures.length&&process.argv.includes('--repair')){
 try{
  // Verify every current and historical route, and construct hints before any publication.
  lessons=api.lessonSolutionTraces.map(prior=>{
   const level=api.authoredLessonLevels.find(l=>l.id===prior.levelId),release=proofs.find(t=>t.levelId===prior.levelId);
   return release&&api.replayTrace(level,release).won?release:historicalTrace(level,prior,'lesson');
  });
  // Retired 379 taught teleporting the station itself. It is already migrated
  // out of live saves; retain its seed as a parsing fixture, never as a legal route.
  retired=Object.fromEntries(Object.entries(api.retiredPortalTeachingActions).filter(([id])=>Number(id)!==379).map(([id,actions])=>{
   const level=api.retiredPortalLessonSeeds.find(l=>l.id===Number(id));
   return [id,historicalTrace(level,{actions},'retired-portal').actions];
  }));
  hints=api.buildHintRoutes(levels,proofs);
  manifest=JSON.parse(await readFile('validation/campaign/generated/manifest.json','utf8'));
  for(const entry of manifest){entry.proofLength=proofs.find(p=>p.levelId===entry.id).actions.length;entry.contentFingerprint=api.puzzleFingerprint(api.loadCampaignLevel(levels.find(l=>l.id===entry.id)));}
 }catch(error){failures.push({error:String(error)});}
}
await writeFile(reportPath,JSON.stringify({verified:proofs.length,revised,revisedHistorical,failures},null,2)+'\n');
console.log(JSON.stringify({verified:proofs.length,revised:revised.length,revisedHistorical,failures},null,2));
if(failures.length)process.exitCode=1;
else if(process.argv.includes('--repair')){
 // No definition, seed, goal or reward changes.
 await writeFile('validation/campaign/generated/proofs.json',JSON.stringify(proofs)+'\n');
 await writeFile('validation/campaign/generated/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 for(const proof of proofs)await writeFile(`validation/campaign/traces/level-${String(proof.levelId).padStart(4,'0')}.json`,JSON.stringify(proof,null,2)+'\n');
 await writeFile('src/campaign/content/lesson-solutions.dev.ts',`import type {CampaignAction,SolutionTrace} from '../types';\n\n/** Booster-free teaching proofs, revalidated with fixed stations. */\nexport const lessonSolutionTraces:readonly SolutionTrace[]=[\n${lessons.map(t=>'  '+JSON.stringify(t)+',').join('\n')}\n];\nexport const retiredPortalTeachingActions:Readonly<Record<number,readonly CampaignAction[]>>=${JSON.stringify(retired)};\nexport const lessonTeachingActions:Readonly<Record<number,readonly CampaignAction[]>>=Object.fromEntries(lessonSolutionTraces.map(trace=>[trace.levelId,trace.actions]));\n`);
 for(let i=0;i<hints.length;i++)await writeFile(`src/campaign/content/hints-${String(i+1).padStart(2,'0')}.json`,JSON.stringify(hints[i])+'\n');
 console.log(`Published ${proofs.length} replayed proofs and ${hints.reduce((n,h)=>n+Object.keys(h).length,0)} next-move positions`);
}
