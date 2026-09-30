/** Pure layout math — testable without Pixi. */
export type Layout = { tileSize: number; originX: number; originY: number; gap: number };
export type CampaignLayout=Layout & {topBand:number;bottomBand:number;compact:boolean};
/** Shared reservations drive both the campaign DOM bands and canvas. vh already excludes safe areas. */
export function computeCampaignLayout(rows:number,cols:number,vw:number,vh:number):CampaignLayout {
 const compact=vh<650,topBand=compact?84:132,bottomBand=compact?108:136;
 const tileSize=Math.min(88,(vw-24)/(cols+(cols-1)*.04),(vh-topBand-bottomBand)/(rows+(rows-1)*.04));
 const gap=tileSize*.04;
 return {tileSize,gap,originX:(vw-cols*tileSize-(cols-1)*gap)/2,originY:topBand+Math.max(0,(vh-topBand-bottomBand-rows*tileSize-(rows-1)*gap)/2),topBand,bottomBand,compact};
}
export function campaignCellAt(layout:Layout,mask:readonly (readonly boolean[])[],inactive:readonly {r:number;c:number}[],x:number,y:number):{r:number;c:number}|null {
 const {originX,originY,tileSize,gap}=layout,step=tileSize+gap;
 const c=Math.floor((x-originX)/step),r=Math.floor((y-originY)/step);
 if(r<0||c<0||!mask[r]?.[c]||inactive.some(p=>p.r===r&&p.c===c)||x>originX+c*step+tileSize||y>originY+r*step+tileSize)return null;
 return {r,c};
}

const HUD_BAND = 0.145;  // top band: HUD + breathing room for the scene
const TRAY_BAND = 0.155; // bottom band: power-up tray + scenery glow
const GAP_RATIO = 0.06;  // gap between tiles as fraction of tile size
const SIDE_PAD = 16;      // room for the frame at screen edges

export function computeLayout(rows: number, cols: number, vw: number, vh: number): Layout {
  const bandTop = vh<600?140:174;
  const bandBottom = vh-(vh<600?110:138);
  const availW = vw - SIDE_PAD * 2;
  const availH = bandBottom - bandTop;
  // tileSize * (cols + (cols-1)*GAP_RATIO) <= availW, same for rows/height
  const byW = availW / (cols + (cols - 1) * GAP_RATIO);
  const byH = availH / (rows + (rows - 1) * GAP_RATIO);
  const tileSize = Math.min(byW, byH);
  const gap = tileSize * GAP_RATIO;
  const boardW = cols * tileSize + (cols - 1) * gap;
  const boardH = rows * tileSize + (rows - 1) * gap;
  return {
    tileSize,
    gap,
    originX: (vw - boardW) / 2,
    originY: bandTop + (availH - boardH) / 2,
  };
}
