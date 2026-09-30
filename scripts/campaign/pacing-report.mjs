import {readFile,writeFile} from 'node:fs/promises';
export function pacingMetrics(manifest,levels){
 const introductions=new Map();
 for(const entry of manifest)for(const mechanic of entry.mechanics)if(!introductions.has(mechanic))introductions.set(mechanic,entry.id);
 const primary=entry=>[...entry.mechanics].sort((a,b)=>introductions.get(b)-introductions.get(a))[0]??'foundation';
 const count=items=>Object.fromEntries([...new Set(items)].map(item=>[item,items.filter(x=>x===item).length]));
 const windows=Array.from({length:Math.ceil(manifest.length/50)},(_,index)=>{
  const entries=manifest.slice(index*50,index*50+50),families=count(entries.map(primary)),templates=count(entries.map(e=>e.templateId));
  return {from:index*50+1,to:entries.at(-1)?.id,templates:Object.keys(templates).length,mechanicFamilies:Object.keys(families).length,families,dominantFamilyShare:Math.max(...Object.values(families))/entries.length,proofHistogram:count(entries.map(e=>e.proofLength)),meanProofLength:entries.reduce((n,e)=>n+e.proofLength,0)/entries.length};
 });
 let longestTemplateRun=1,run=1,adjacentTemplateRepeats=0,adjacentMaskRepeats=0;
 for(let i=1;i<manifest.length;i++){
  const repeat=manifest[i].templateId===manifest[i-1].templateId;if(repeat)adjacentTemplateRepeats++;
  run=repeat?run+1:1;longestTemplateRun=Math.max(longestTemplateRun,run);
  if(JSON.stringify(levels[i].geometry.mask)===JSON.stringify(levels[i-1].geometry.mask))adjacentMaskRepeats++;
 }
 return {adjacentTemplateRepeats,longestTemplateRun,adjacentMaskRepeats,proofHistogram:count(manifest.map(e=>e.proofLength)),windows};
}
if(process.argv[1]?.endsWith('pacing-report.mjs')){
 const base='validation/campaign/generated';
 const manifest=JSON.parse(await readFile(`${base}/manifest.json`,'utf8'));
 const levels=(await Promise.all(Array.from({length:20},(_,i)=>readFile(`src/campaign/content/chapter-${String(i+1).padStart(2,'0')}.json`,'utf8')))).flatMap(JSON.parse);
 const metrics=pacingMetrics(manifest,levels),name=process.argv[2]??'pacing';
 await writeFile(`${base}/${name}.json`,JSON.stringify(metrics,null,2)+'\n');
 console.log(JSON.stringify({...metrics,windows:metrics.windows.slice(16)}));
}
