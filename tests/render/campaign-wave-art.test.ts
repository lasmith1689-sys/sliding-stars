import {it,expect} from 'vitest';
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {CAMPAIGN_ASSETS} from '../../src/assets/campaign-manifest';
import {waveSpriteLayout} from '../../src/render/campaign/mechanics';

it.each(CAMPAIGN_ASSETS.filter(a=>a.id.startsWith('wave-')))('$id retains the entire frame with transparent delivery margins',async asset=>{
 expect(asset.canvas.width).toBe(asset.canvas.height); // Existing square delivery never crops this normalized canvas.
 expect(asset.canvas.left).toBeGreaterThan(0);expect(asset.canvas.top).toBeGreaterThan(0);
 expect(asset.canvas.left+asset.frame.width).toBeLessThan(asset.canvas.width);
 expect(asset.canvas.top+asset.frame.height).toBeLessThan(asset.canvas.height);
 const {data,info}=await sharp(await readFile(`public/${asset.deliveryPath}`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let y=0;y<info.height;y++)for(const x of [0,info.width-1])expect(data[(y*info.width+x)*4+3]).toBe(0);
 for(let x=0;x<info.width;x++)for(const y of [0,info.height-1])expect(data[(y*info.width+x)*4+3]).toBe(0);
});
it('scales wave textures uniformly and retains the manifest pivot across scheduled and arriving frames',()=>{
 const frames=CAMPAIGN_ASSETS.filter(a=>a.id.startsWith('wave-'));
 for(const asset of frames){const layout=waveSpriteLayout(88,asset);expect(layout.width/layout.height).toBe(asset.canvas.width/asset.canvas.height);expect(layout.pivot).toEqual(asset.pivot);}
 expect(new Set(frames.map(a=>a.canvas.top+a.frame.height)).size).toBe(1);
 expect(new Set(frames.slice(0,3).map(a=>a.canvas.left+a.frame.width)).size).toBe(1);
});
