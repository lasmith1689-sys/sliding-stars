import {expect,it} from 'vitest';
import sharp from 'sharp';
import {CAMPAIGN_ASSETS} from '../../src/assets/campaign-manifest';
import {pupSpriteLayout} from '../../src/render/campaign/mechanics';
it.each(CAMPAIGN_ASSETS.filter(a=>a.id.startsWith('pup-')))('$id preserves original transparent framed art with uniform aspect and clear margins',async asset=>{
 const {data,info}=await sharp(`public/${asset.deliveryPath}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let solid=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const alpha=data[(y*info.width+x)*4+3]!;if(alpha>0)solid++;if(x===0||y===0||x===info.width-1||y===info.height-1)expect(alpha).toBe(0);}
 expect(solid).toBeGreaterThan(1000);const layout=pupSpriteLayout(48,asset);expect(layout.width/layout.height).toBe(1);expect(layout.pivot).toEqual({x:.5,y:.55});
});
