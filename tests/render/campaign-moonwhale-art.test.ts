import {it,expect} from 'vitest';
import sharp from 'sharp';
import {CAMPAIGN_ASSETS} from '../../src/assets/campaign-manifest';
import {whaleSpriteLayout} from '../../src/render/campaign/mechanics';
it.each(CAMPAIGN_ASSETS.filter(a=>a.id.startsWith('whale-')))('$id retains its full source cell on a uniform transparent canvas',async asset=>{
 expect(asset.frame.width).toBe(627);expect(asset.frame.height).toBe(627);expect(asset.canvas.width).toBe(asset.canvas.height);expect(asset.canvas.left+asset.frame.width).toBeLessThan(asset.canvas.width);expect(asset.canvas.top+asset.frame.height).toBeLessThan(asset.canvas.height);
 const {data,info}=await sharp(`public/${asset.deliveryPath}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let y=0;y<info.height;y++)for(const x of [0,info.width-1])expect(data[(y*info.width+x)*4+3]).toBe(0);
 for(let x=0;x<info.width;x++)for(const y of [0,info.height-1])expect(data[(y*info.width+x)*4+3]).toBe(0);
 const layout=whaleSpriteLayout(72,asset);expect(layout.width/layout.height).toBe(1);expect(layout.pivot).toEqual({x:.5,y:.55});
});
