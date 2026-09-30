import {rolldown} from 'rolldown';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const through=Number(process.argv.find(arg=>arg.startsWith('--through='))?.split('=')[1]??1000);
const seed=Number(process.argv.find(arg=>arg.startsWith('--seed='))?.split('=')[1]??20260930);
const attempts=Number(process.argv.find(arg=>arg.startsWith('--attempts='))?.split('=')[1]??180);
const bundle=await rolldown({input:'src/campaign/generation.ts'}),built=await bundle.generate({format:'esm'});await bundle.close();
const code=built.output.find(item=>item.type==='chunk')?.code;if(!code)throw Error('No generator bundle');
const {generateCampaign,GENERATOR_VERSION}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const started=Date.now();
const result=generateCampaign({seed,throughLevel:through,maxAttemptsPerLevel:attempts,onProgress:(done,r)=>console.log(`${done}/${through}: ${r.levels.length} proved, ${r.unresolved.length} unresolved`)});
const out='validation/campaign/generated';await mkdir(out,{recursive:true});
const report={generatorVersion:GENERATOR_VERSION,seed,through,maxAttemptsPerLevel:attempts,elapsedMs:Date.now()-started,generated:result.levels.length,authored:result.manifest.filter(m=>m.source==='authored').length,uniquePuzzles:new Set(result.manifest.map(m=>m.contentFingerprint)).size,uniqueMasks:new Set(result.levels.map(l=>JSON.stringify(l.geometry.mask))).size,shapes:[...new Set(result.manifest.map(m=>m.shape))],boardSizes:[...new Set(result.manifest.map(m=>`${m.rows}x${m.cols}`))],mechanics:[...new Set(result.manifest.flatMap(m=>m.mechanics))],rejections:result.rejections,unresolved:result.unresolved,limitations:['Proofs establish at least one winning booster-free path, not subjective balance or all-path safety.','Variations reuse authored mechanics and objective structures; terrain and optional horizontal mirroring vary.','Difficulty labels estimate proof length; human playtesting is still needed.','No new mechanics beyond the 20 implemented nonportal mechanics are claimed.']};
await writeFile(`${out}/report${through===1000?'':`-${through}`}.json`,JSON.stringify(report,null,2)+'\n');
if(result.unresolved.length){console.log(JSON.stringify(report));process.exitCode=1;}
else if(through===1000){
 for(let chapter=1;chapter<=20;chapter++)await writeFile(`src/campaign/content/chapter-${String(chapter).padStart(2,'0')}.json`,JSON.stringify(result.levels.filter(l=>l.chapter===chapter))+'\n');
 await writeFile(`${out}/proofs.json`,JSON.stringify(result.proofs)+'\n');
 await writeFile(`${out}/manifest.json`,JSON.stringify(result.manifest,null,2)+'\n');
 const hash=createHash('sha256').update(JSON.stringify(result.levels)).digest('hex');console.log(`Published 1000 proof-checked boards; SHA-256 ${hash}`);
}
console.log(JSON.stringify({generated:report.generated,uniquePuzzles:report.uniquePuzzles,uniqueMasks:report.uniqueMasks,seconds:report.elapsedMs/1000,unresolved:report.unresolved}));
