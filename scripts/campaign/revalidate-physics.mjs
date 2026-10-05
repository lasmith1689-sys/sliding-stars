import {rolldown} from 'rolldown';
import {readFile,writeFile} from 'node:fs/promises';
const bundle=await rolldown({input:'scripts/campaign/physics-runtime.ts'}),built=await bundle.generate({format:'esm'});await bundle.close();
const code=built.output.find(item=>item.type==='chunk')?.code;if(!code)throw Error('No physics audit bundle');
const api=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const levels=(await Promise.all(Array.from({length:20},(_,i)=>readFile(`src/campaign/content/chapter-${String(i+1).padStart(2,'0')}.json`,'utf8')))).flatMap(JSON.parse);
const old=JSON.parse(await readFile('validation/campaign/generated/proofs.json','utf8'));
const failures=[],revised=[],proofs=[];
for(const level of levels){
 const prior=old.find(p=>p.levelId===level.id);if(!prior)throw Error(`Missing proof ${level.id}`);
 let state=api.loadCampaignLevel(level),initialHash=api.hashState(state),actions=[];
 try{for(const action of prior.actions){if(state.status!=='playing')break;const next=api.transition(state,action);if(!next.accepted)break;actions.push(action);state=next.state;}}
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
await writeFile('validation/physics-audit-2026-10-05.json',JSON.stringify({verified:proofs.length,revised,failures},null,2)+'\n');
console.log(JSON.stringify({verified:proofs.length,revised:revised.length,failures},null,2));
if(failures.length)process.exitCode=1;
else if(process.argv.includes('--repair')){
 // Publish only a fully revalidated set. No definition, seed, goal or reward changes.
 await writeFile('validation/campaign/generated/proofs.json',JSON.stringify(proofs)+'\n');
 const manifest=JSON.parse(await readFile('validation/campaign/generated/manifest.json','utf8'));
 for(const entry of manifest){entry.proofLength=proofs.find(p=>p.levelId===entry.id).actions.length;entry.contentFingerprint=api.puzzleFingerprint(api.loadCampaignLevel(levels.find(l=>l.id===entry.id)));}
 await writeFile('validation/campaign/generated/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 for(const proof of proofs)await writeFile(`validation/campaign/traces/level-${String(proof.levelId).padStart(4,'0')}.json`,JSON.stringify(proof,null,2)+'\n');
 const lessons=api.lessonSolutionTraces.map(prior=>{
  const level=api.authoredLessonLevels.find(l=>l.id===prior.levelId);
  const release=proofs.find(t=>t.levelId===prior.levelId);if(release&&!level.mechanics.some(m=>m.id==='portals'))return release;
  let state=api.loadCampaignLevel(level);const initialHash=api.hashState(state);
  for(const action of prior.actions)state=api.transition(state,action).state;
  if(state.status!=='won')throw Error(`Historical lesson ${prior.levelId} needs a revised route`);
  return {...prior,initialHash,finalHash:api.hashState(state)};
 });
 await writeFile('src/campaign/content/lesson-solutions.dev.ts',`import type {CampaignAction,SolutionTrace} from '../types';\n\n/** Booster-free teaching proofs, revalidated after the gravity correction. */\nexport const lessonSolutionTraces:readonly SolutionTrace[]=[\n${lessons.map(t=>'  '+JSON.stringify(t)+',').join('\n')}\n];\nexport const retiredPortalTeachingActions:Readonly<Record<number,readonly CampaignAction[]>>=${JSON.stringify(api.retiredPortalTeachingActions)};\nexport const lessonTeachingActions:Readonly<Record<number,readonly CampaignAction[]>>=Object.fromEntries(lessonSolutionTraces.map(trace=>[trace.levelId,trace.actions]));\n`);
 const hints=api.buildHintRoutes(levels,proofs);
 for(let i=0;i<hints.length;i++)await writeFile(`src/campaign/content/hints-${String(i+1).padStart(2,'0')}.json`,JSON.stringify(hints[i])+'\n');
 console.log(`Published ${proofs.length} replayed proofs and ${hints.reduce((n,h)=>n+Object.keys(h).length,0)} next-move positions`);
}
