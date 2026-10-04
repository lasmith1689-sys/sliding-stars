import {rolldown} from 'rolldown';
import {readFile,writeFile} from 'node:fs/promises';
const bundle=await rolldown({input:'scripts/campaign/qc-play.ts'}),built=await bundle.generate({format:'esm'});await bundle.close();
const code=built.output.find(item=>item.type==='chunk')?.code;if(!code)throw Error('No QC bundle');
const {QC_SAMPLE_IDS,auditHintPlay}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const levels=(await Promise.all(Array.from({length:20},(_,i)=>readFile(`src/campaign/content/chapter-${String(i+1).padStart(2,'0')}.json`,'utf8')))).flatMap(JSON.parse);
const proofs=JSON.parse(await readFile('validation/campaign/generated/proofs.json','utf8'));
const started=Date.now(),missions=[];
for(const id of QC_SAMPLE_IDS){
 const result=auditHintPlay(levels[id-1],proofs[id-1],12,{});missions.push(result);
 console.log(`${id}: ${result.outcome}, ${result.moves} moves, null=${result.hintNull}, repeats=${result.repeatLayouts}, maxHint=${result.maxHintMs.toFixed(1)}ms`);
}
const times=missions.flatMap(m=>m.steps.map(step=>step.hintMs)).sort((a,b)=>a-b);
const summary={sampleCount:missions.length,maxMovesPerMission:12,elapsedMs:Date.now()-started,
 mechanics:[...new Set(missions.flatMap(m=>m.mechanics))],won:missions.filter(m=>m.outcome==='won').length,lost:missions.filter(m=>m.outcome==='lost').length,stillPlaying:missions.filter(m=>m.outcome==='still-playing').length,
 hintNullIds:missions.filter(m=>m.hintNull).map(m=>m.id),illegalHintIds:missions.filter(m=>m.illegal).map(m=>m.id),mutatedStateIds:missions.filter(m=>m.mutatedState).map(m=>m.id),repeatedLayoutIds:missions.filter(m=>m.repeatLayouts>0).map(m=>m.id),
 proofsPassBeforeAndAfter:missions.every(m=>m.proofBefore.won&&m.proofAfter.won&&m.definitionUnchanged),hintMedianMs:times[Math.floor(times.length/2)],hintP95Ms:times[Math.floor(times.length*.95)],hintMaximumMs:times.at(-1)};
await writeFile('validation/campaign/fallback-hints-after.json',JSON.stringify({summary,limitations:['This audit uses only the direct, one-turn heuristic; verified route maps and the asynchronous detour search are deliberately excluded.','Timing measures this desktop process, not iPhone latency.','Known proofs are replayed independently before and after advice to verify that the audit cannot alter the definitions.','A heuristic suggestion is not a proof of reachability; still-playing samples identify its limits. This is not representative human playtesting.'],missions},null,2)+'\n');
console.log(JSON.stringify(summary));
if(!summary.proofsPassBeforeAndAfter||summary.illegalHintIds.length||summary.mutatedStateIds.length)process.exitCode=1;

