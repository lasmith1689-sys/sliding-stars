import {describe,it,expect} from 'vitest';
import {computeCampaignLayout,campaignCellAt} from '../../src/render/layout';
describe('campaign touch layout',()=>{
 for(const [width,height] of [[375,667],[390,844],[375,589],[320,568]])it(`keeps 7x9 controls and targets at ${width}x${height}`,()=>{
  const layout=computeCampaignLayout(9,7,width!,height!);
  expect(layout.tileSize).toBeGreaterThanOrEqual(40);
  expect(layout.originY).toBeGreaterThanOrEqual(layout.topBand);
  expect(layout.originY+9*layout.tileSize+8*layout.gap).toBeLessThanOrEqual(height!-layout.bottomBand+.01);
 });
 it('rejects holes, inactive cells and outside edges',()=>{
  const layout=computeCampaignLayout(3,3,375,667),mask=[[true,true,true],[true,false,true],[true,true,true]];
  const at=(r:number,c:number)=>campaignCellAt(layout,mask,[{r:0,c:1}],layout.originX+c*(layout.tileSize+layout.gap)+layout.tileSize/2,layout.originY+r*(layout.tileSize+layout.gap)+layout.tileSize/2);
  expect(at(1,1)).toBeNull();expect(at(0,1)).toBeNull();expect(at(0,0)).toEqual({r:0,c:0});expect(at(3,0)).toBeNull();
 });
});
