// Build-time delivery compression only. Original artwork is never modified.
import sharp from 'sharp';
import {mkdir,readdir,stat,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {CAMPAIGN_ASSETS} from '../src/assets/campaign-manifest.ts';
const root=resolve(import.meta.dirname,'..'),input=resolve(root,'public/art'),output=resolve(root,'public/optimized');
await mkdir(output,{recursive:true});
let before=0,after=0;
for(const file of await readdir(input)){
 if(!file.endsWith('.png'))continue;
 const src=resolve(input,file),dst=resolve(output,file.replace(/\.png$/,'.webp')),source=await stat(src);
 const old=await stat(dst).catch(()=>null);
 if(!old||old.mtimeMs<source.mtimeMs){
  const size=file==='mission-control.png'?1024:file.startsWith('tile-')?384:320;
  await sharp(src).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:88,alphaQuality:100,effort:5}).toFile(dst);
 }
 before+=source.size;after+=(await stat(dst)).size;
}
console.log(`Delivery art: ${(before/1e6).toFixed(2)} MB → ${(after/1e6).toFixed(2)} MB. Source art preserved.`);
// Campaign sources are explicitly framed: never resize an entire nested atlas into a thumbnail.
const receipts=[];
for(const asset of CAMPAIGN_ASSETS){
 const source=resolve(root,asset.source),destination=resolve(root,'public',asset.deliveryPath),metadata=await sharp(source).metadata();
 if(!metadata.hasAlpha||asset.frame.left+asset.frame.width>metadata.width||asset.frame.top+asset.frame.height>metadata.height)throw Error(`Invalid campaign frame ${asset.id}`);
 await mkdir(dirname(destination),{recursive:true});
 const frame=await sharp(source).extract(asset.frame).toBuffer();
 const canvas=await sharp({create:{width:asset.canvas.width,height:asset.canvas.height,channels:4,background:'#00000000'}})
  .composite([{input:frame,left:asset.canvas.left,top:asset.canvas.top}]).png().toBuffer();
 await sharp(canvas).resize(asset.size,asset.size).webp({quality:88,alphaQuality:100,effort:5}).toFile(destination);
 const delivered=await readFile(destination),check=await sharp(delivered).metadata();
 if(!check.hasAlpha||check.width!==asset.size||check.height!==asset.size)throw Error(`Invalid delivery ${asset.id}`);
 receipts.push({...asset,sourceSha256:createHash('sha256').update(await readFile(source)).digest('hex'),deliverySha256:createHash('sha256').update(delivered).digest('hex'),bytes:delivered.length,hasAlpha:check.hasAlpha});
}
await writeFile(resolve(output,'campaign/manifest.json'),JSON.stringify(receipts,null,2)+'\n');
console.log(`Campaign art: ${receipts.length} framed alpha sprites, ${receipts.reduce((n,r)=>n+r.bytes,0)} bytes.`);
