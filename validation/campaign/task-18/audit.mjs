import {readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const root=resolve(import.meta.dirname,'../../..'),at=p=>resolve(root,p),hash=b=>createHash('sha256').update(b).digest('hex');
const source=await readFile(at('public/art/campaign/gravity/source.png'));
assert.equal(hash(source),'7389d78bfdc846920c0e67069abe1115acd10f53b8c97a9e93b66c816971e1fe');
assert.deepEqual(await readFile(at('public/art/campaign/gravity/prompt.txt')),await readFile(at('../.superpowers/sdd/2026-09-26-thousand-level-campaign/gravity-sheet-prompt.txt')));
const manifest=JSON.parse(await readFile(at('public/optimized/campaign/manifest.json'),'utf8'));
const frames=manifest.filter(f=>f.id.startsWith('gravity-'));assert.equal(frames.length,4);
for(const frame of frames){
 const bytes=await readFile(at('public/'+frame.deliveryPath)),meta=await sharp(bytes).metadata();
 assert.equal(hash(bytes),frame.deliverySha256);assert.equal(meta.width,256);assert.equal(meta.height,256);assert.equal(meta.hasAlpha,true);
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});let edgeAlpha=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(x===0||y===0||x===255||y===255)edgeAlpha=Math.max(edgeAlpha,data[(y*info.width+x)*4+3]);
 assert.equal(edgeAlpha,0);frame.edgeAlpha=edgeAlpha;
}
async function walk(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);out.push(...(entry.isDirectory()?await walk(path):[path]));}return out;}
const files=await walk(at('dist')),paths=files.map(p=>relative(at('dist'),p).replaceAll('\\','/'));
assert(!paths.some(p=>/^(art|validation)\//.test(p)||/lesson-solutions|proofs\.json/.test(p)));
const sw=await readFile(at('dist/sw.js'),'utf8'),cache=sw.match(/const CACHE="([^"]+)"/)[1];
const cached=JSON.parse(sw.match(/const FILES=(\[[^;]+\]);/)[1]);assert.equal(cached.length,files.length-1);
for(const frame of frames){assert(cached.includes('/'+frame.deliveryPath));assert.equal(hash(await readFile(at('dist/'+frame.deliveryPath))),frame.deliverySha256);}
const bundles=files.filter(p=>p.endsWith('.js')&&!p.endsWith('sw.js'));let bundleBytes=0;
for(const path of bundles){const bytes=await readFile(path);bundleBytes+=bytes.length;const text=bytes.toString();for(const marker of ['676e0b3c53c68694','650cd7b405065b71','lessonTeachingActions','lessonSolutionTraces','phone-615-320'])assert(!text.includes(marker),marker);}
const report={status:'passed',sourceSha256:hash(source),exactOriginalPrompt:true,frames,gravityBytes:frames.reduce((n,f)=>n+f.bytes,0),campaignFrames:manifest.length,campaignBytes:manifest.reduce((n,f)=>n+f.bytes,0),cache,cachedFiles:cached.length,bundleBytes,excluded:['source art','validation/proofs','development solution markers'],scope:'Static build/cache and alpha audit; not an installed offline-device test.'};
await writeFile(at('validation/campaign/task-18/art-bundle-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,frames:frames.map(f=>({id:f.id,bytes:f.bytes,edgeAlpha:f.edgeAlpha}))},null,2));
