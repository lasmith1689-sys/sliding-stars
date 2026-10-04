import {cp,readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
for(const name of ['optimized','font-licenses','manifest.webmanifest','icon-192.png','icon-512.png','icon-512-maskable.png','apple-touch-icon.png','privacy.html','support.html'])await cp(resolve(root,'public',name),resolve(dist,name),{recursive:true});
async function walk(dir){const out=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,item.name);if(item.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
const files=(await walk(dist)).filter(p=>!p.endsWith('sw.js')).sort();
const hash=createHash('sha256');for(const file of files)hash.update(await readFile(file));
const cache=`sliding-stars-next-${hash.digest('hex').slice(0,12)}`;
const urls=files.map(p=>'/'+relative(dist,p).replaceAll('\\','/'));
const sw=`const CACHE=${JSON.stringify(cache)};const FILES=${JSON.stringify(urls)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>{const previous=keys.filter(k=>k.startsWith('sliding-stars-next-')&&k!==CACHE);return Promise.all(previous.slice(0,-1).map(k=>caches.delete(k)));}).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.open(CACHE).then(async c=>{if(e.request.mode==='navigate'){try{const live=await fetch(e.request);if(live.ok)return live;}catch{}return await c.match(e.request,{ignoreVary:true,ignoreSearch:true})||await c.match('/index.html',{ignoreVary:true})||Response.error();}return await c.match(e.request,{ignoreVary:true})||await caches.match(e.request,{ignoreVary:true})||fetch(e.request);}));});`;
await writeFile(resolve(dist,'sw.js'),sw);
console.log(`Offline bundle: ${urls.length} files, cache ${cache}.`);
