import {Container,Graphics,Sprite,Text,type Application,type Texture} from 'pixi.js';
import type {Pos} from '../../core/types';
import type {CampaignAction,CampaignEvent} from '../../campaign/types';
import type {Layers} from '../app';
import type {TextureSet} from '../textures';
import {computeCampaignLayout,campaignCellAt,type CampaignLayout} from '../layout';
import {drawBoardFrame} from '../background';
import type {CampaignScene} from './snapshot';
import {shelterVisualState,fixtureLabel,fixtureTexture,exitVisualState,waveVisualState,waveSpriteLayout,crewGroupLabel,whaleVisualState,whaleSpriteLayout,pupVisualState,pupSceneStep,pupSpriteLayout,currentVisualState,pirateVisualState,pirateSceneStep,pirateSpriteLayout,pirateSceneBlocked} from './mechanics';
import {pendingWaves} from '../../campaign/mechanics/waves';
import {CAMPAIGN_ASSETS,type CampaignAssetId} from '../../assets/campaign-manifest';
import {portalVisualState,portalSpriteLayout} from './mechanics';
import {bridgeVisualState,solarVisualState} from './mechanics';
import {gardenVisualState,gardenWaiting} from './mechanics';
import {dockVisualState,dockSpriteLayout} from './mechanics';
import {phaseVisualState,phaseSpriteLayout} from './mechanics';
import {addSolarIndicator} from './solarIndicator';
export class CampaignBoard {
 layout:CampaignLayout;scene:CampaignScene;
 private frame=new Container();private routes=new Graphics();private content=new Container();private hints=new Graphics();private nodes=new Map<string,Container>();
 private exitSprites=new Map<string,Sprite>();
 private bridgePanels=new Map<string,Sprite[]>();
 private currentArrows=new Container();private currentSprites=new Map<string,Sprite[]>();
 private cargoLabels=new Map<string,Container>();
 private returningParcels=new Map<string,Container>();
 private dockMarkers=new Map<string,Container>();
 private parcel(node:Container,ts:number){const g=new Graphics();g.roundRect(-ts*.16,-ts*.1,ts*.32,ts*.22,3).fill(0xffebbb).stroke({color:0xeda532,width:2});g.rect(-ts*.03,-ts*.1,ts*.06,ts*.22).fill(0xf4a62e);node.addChild(g);}
 private waveSprite:Sprite|null=null;
 private moving=false;private breathTime=0;
 private exitFrame(id:string,state:'idle'|'ready'|'waiting'|'departure'):void {
  const sprite=this.exitSprites.get(id),assetId:CampaignAssetId=`exit-${state}`,texture=this.textures.campaign?.[assetId];
  if(sprite&&texture)sprite.texture=texture;
 }
 constructor(private app:Application,layers:Layers,private textures:TextureSet,scene:CampaignScene,private reducedMotion:()=>boolean=()=>false){
  this.scene=scene;this.layout=computeCampaignLayout(scene.geometry.rows,scene.geometry.cols,app.screen.width,app.screen.height);
  layers.board.addChild(this.frame);layers.actors.addChild(this.content);layers.fx.addChild(this.routes,this.currentArrows,this.hints);this.sync(scene);
  app.ticker.add(ticker=>{this.breathTime+=ticker.deltaMS;if(this.moving)return;
   const dy=this.reducedMotion()?0:Math.sin(this.breathTime/650)*this.layout.tileSize*.009;
   for(const whale of this.scene.actors)if(whale.kind==='moonwhale'){
    const body=this.nodes.get(whale.id)?.children[0];if(body)body.y=dy;
    for(const id of whale.passengerIds){const rider=this.nodes.get(id)?.children[0];if(rider)rider.y=-this.layout.tileSize*.35+dy;}
   }
   for(const pup of this.scene.actors)if(pup.kind==='pup'){
    const body=this.nodes.get(pup.id)?.children[0];if(body){body.rotation=this.reducedMotion()?0:Math.sin(this.breathTime/850)*.018;body.y=dy*.6;}
   }
  });
 }
 relayout(scene:CampaignScene):void {this.layout=computeCampaignLayout(scene.geometry.rows,scene.geometry.cols,this.app.screen.width,this.app.screen.height);this.sync(scene);}
 cellCenter(p:Pos){const l=this.layout;return {x:l.originX+p.c*(l.tileSize+l.gap)+l.tileSize/2,y:l.originY+p.r*(l.tileSize+l.gap)+l.tileSize/2};}
 cellAt(x:number,y:number):Pos|null{return campaignCellAt(this.layout,this.scene.geometry.mask,this.scene.geometry.inactiveCells,x,y);}
 get renderedEntityPositions():Record<string,Pos>{const l=this.layout;return Object.fromEntries([...this.nodes].map(([id,node])=>[id,{r:(node.y-l.originY-l.tileSize/2)/(l.tileSize+l.gap),c:(node.x-l.originX-l.tileSize/2)/(l.tileSize+l.gap)}]));}
 private label(text:string,node:Container,y:number,size=11):void {const label=new Text({text,style:{fontFamily:'system-ui',fontSize:size,fontWeight:'800',fill:0xffffff,stroke:{color:0x111832,width:4}}});label.anchor.set(.5);label.y=y;node.addChild(label);}
 private entity(id:string,at:Pos,texture:Texture|undefined,scale:number,label?:string):Container {
  const node=new Container(),p=this.cellCenter(at),ts=this.layout.tileSize;node.position.set(p.x,p.y);this.nodes.set(id,node);this.content.addChild(node);
  if(texture){const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.width=ts*scale;sprite.height=ts*scale;node.addChild(sprite);}
  if(label)this.label(label,node,ts*.32,Math.max(9,Math.min(12,ts*.19)));
  return node;
 }
 private shelterBadge(node:Container,state:'waiting'|'happy'|'calm'|'urgent'|'complete',ts:number):void {
  const texture=this.textures.campaign?.[`shelter-${state}`];if(!texture)return;const badge=new Sprite(texture);badge.label='shelter-badge';badge.anchor.set(.5);badge.width=badge.height=ts*.33;badge.position.set(ts*.3,-ts*.17);node.addChild(badge);
 }
 sync(scene:CampaignScene):void {
  this.moving=false;
  this.scene=scene;this.hints.clear();for(const child of this.content.removeChildren())child.destroy({children:true});this.nodes.clear();this.exitSprites.clear();this.cargoLabels.clear();
  this.returningParcels.clear();this.bridgePanels.clear();this.dockMarkers.clear();
  const mask=scene.geometry.mask.map((row,r)=>row.map((yes,c)=>yes&&!scene.geometry.inactiveCells.some(p=>p.r===r&&p.c===c)));
  drawBoardFrame(this.frame,mask,this.layout);this.routes.clear();const ts=this.layout.tileSize;
  for(const child of this.currentArrows.removeChildren())child.destroy();this.currentSprites.clear();
  for(const route of scene.geometry.routes){
   if(scene.currentRouteIds.includes(route.id)){
    const phase=currentVisualState(scene,route.id),assetId:CampaignAssetId=`current-${phase}`,asset=CAMPAIGN_ASSETS.find(a=>a.id===assetId)!,texture=this.textures.campaign?.[assetId],sprites:Sprite[]=[];
    for(const [i,cell] of route.cells.entries()){
     const a=this.cellCenter(cell),b=this.cellCenter(route.cells[(i+1)%route.cells.length]!),dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y),offset=route.cells.length===2?ts*.18:0;
     this.routes.moveTo(a.x-dy*offset,a.y+dx*offset).lineTo(b.x-dy*offset,b.y+dx*offset).stroke({color:phase==='waiting'?0xffc46b:0x72efee,width:3,alpha:.5});
     if(texture){const sprite=new Sprite(texture);sprite.anchor.set(asset.pivot.x,asset.pivot.y);sprite.width=ts*.48;sprite.height=ts*.48;sprite.rotation=Math.atan2(dy,dx);sprite.position.set((a.x+b.x)/2-dy*offset,(a.y+b.y)/2+dx*offset);this.currentArrows.addChild(sprite);sprites.push(sprite);}
    }this.currentSprites.set(route.id,sprites);continue;
   }
   const cells=route.loop?[...route.cells,route.cells[0]!]:route.cells;for(let i=0;i<cells.length;i++){const p=this.cellCenter(cells[i]!);if(i){const a=this.cellCenter(cells[i-1]!);this.routes.moveTo(a.x,a.y).lineTo(p.x,p.y).stroke({color:0xb9fce1,width:3,alpha:.65});}this.routes.circle(p.x,p.y,4).stroke({color:0xffffff,width:1.5});}}
  // One panel per actual authored cell, under its terrain. Never stretch a span.
  for(const bridge of scene.fixtures.filter(f=>f.kind==='bridge')){
   const panels:Sprite[]=[];
   for(const cell of bridge.cells){
    const at=this.cellCenter(cell),asset=CAMPAIGN_ASSETS.find(a=>a.id==='bridge-open')!,texture=this.textures.campaign?.['bridge-open'];
    if(texture){const sprite=new Sprite(texture);sprite.anchor.set(asset.pivot.x,asset.pivot.y);sprite.width=ts*1.03;sprite.height=ts*1.03;sprite.position.set(at.x,at.y+ts*.3);sprite.alpha=bridge.active?1:0;this.content.addChild(sprite);panels.push(sprite);}
    if(!bridge.active){this.routes.roundRect(at.x-ts*.45,at.y-ts*.45,ts*.9,ts*.9,8).fill({color:0x67e6dc,alpha:.07}).stroke({color:bridge.hits?0x8affed:0xe2bb73,width:2,alpha:.8});
     for(const dy of [-.13,.13])this.routes.moveTo(at.x-ts*.1,at.y+ts*dy-ts*.05).lineTo(at.x,at.y+ts*dy+ts*.03).lineTo(at.x+ts*.1,at.y+ts*dy-ts*.05).stroke({color:0xe2bb73,width:2});
    }
   }this.bridgePanels.set(bridge.id,panels);
  }
  for(const p of scene.pieces){
   const texture=p.kind==='tile'?this.textures.tile[p.tier]:p.kind==='station'?this.textures.dome:p.kind==='cargo'&&p.cargoKind==='key'?this.textures.campaign?.['key-idle']:p.kind==='cargo'&&p.cargoKind==='harvest'?this.textures.campaign?.['garden-harvest']:this.textures.pod;
   const onBridge=scene.fixtures.some(f=>f.kind==='bridge'&&f.active&&f.cells.some(c=>c.r===p.at.r&&c.c===p.at.c));
   const node=this.entity(p.id,p.at,texture,p.kind==='cargo'&&p.cargoKind==='key'?.72:onBridge?.78:1);
   if(onBridge&&node.children[0])node.children[0].y=-ts*.18;
   if(p.kind==='station'){
    const dir=p.facing==='left'?-1:1,g=new Graphics();g.roundRect(dir*ts*.43-ts*.07,-ts*.2,ts*.14,ts*.4,3).fill(0x102a3c).stroke({color:0xb3ffe3,width:2});node.addChild(g);
    const entry={r:p.at.r,c:p.at.c+dir};if(mask[entry.r]?.[entry.c]){const xy=this.cellCenter(entry);this.routes.roundRect(xy.x-ts*.47,xy.y-ts*.47,ts*.94,ts*.94,8).stroke({color:0xc4ffe4,width:2});}
   }
  }
  for(const [index,exit] of scene.geometry.endpoints.filter(e=>e.kind==='exit').entries()){
   const p=this.cellCenter(exit.at),node=new Container();node.position.set(p.x,p.y);this.content.addChild(node);
   const asset=CAMPAIGN_ASSETS.find(a=>a.id==='exit-idle')!,texture=this.textures.campaign?.['exit-idle'];
   if(texture){const sprite=new Sprite(texture);sprite.anchor.set(asset.pivot.x,asset.pivot.y);sprite.width=ts*.72;sprite.height=ts*.72;sprite.y=ts*.48;node.addChild(sprite);this.exitSprites.set(exit.id,sprite);this.exitFrame(exit.id,exitVisualState(scene,exit.id));}
   this.label(`${scene.departedExitIds.includes(exit.id)?'✓':'↓'} EXIT ${index+1}`,node,ts*.51,Math.max(9,Math.min(12,ts*.16)));
  }
  for(const actor of scene.actors){
   if(actor.kind==='pirate'){
    const phase=pirateVisualState(scene,actor),assetId:CampaignAssetId=`pirate-${phase}`,asset=CAMPAIGN_ASSETS.find(a=>a.id===assetId)!,node=this.entity(actor.id,actor.at,undefined,1),texture=this.textures.campaign?.[assetId];
    if(texture){const sprite=new Sprite(texture),layout=pirateSpriteLayout(ts,asset);sprite.anchor.set(layout.pivot.x,layout.pivot.y);sprite.width=layout.width;sprite.height=layout.height;node.addChild(sprite);}
    this.label(`${actor.distraction} / 2${phase==='warning'?pirateSceneBlocked(scene,actor)?' · WAIT':' · !':''}`,node,ts*.39,Math.max(9,ts*.16));
    const step=pirateSceneStep(scene,actor);if(step){const a=this.cellCenter(actor.at),b=this.cellCenter(step),dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y),x=(a.x+b.x)/2,y=(a.y+b.y)/2;
     this.routes.moveTo(x-dx*5+dy*4,y-dy*5-dx*4).lineTo(x+dx*5,y+dy*5).lineTo(x-dx*5-dy*4,y-dy*5+dx*4).stroke({color:phase==='warning'?0xffbe6e:0xffeabd,width:3});
    }
   }else if(actor.kind==='pup'){
    const phase=pupVisualState(scene,actor),assetId:CampaignAssetId=`pup-${phase}`,asset=CAMPAIGN_ASSETS.find(a=>a.id===assetId)!,node=this.entity(actor.id,actor.at,undefined,1),texture=this.textures.campaign?.[assetId];
    if(texture){const sprite=new Sprite(texture),layout=pupSpriteLayout(ts,asset);sprite.anchor.set(layout.pivot.x,layout.pivot.y);sprite.width=layout.width;sprite.height=layout.height;node.addChild(sprite);}
    this.label(phase==='waiting'?'WAIT':'PAWS',node,ts*.34,Math.max(9,ts*.16));
    const step=pupSceneStep(scene,actor);if(step){const a=this.cellCenter(actor.at),b=this.cellCenter(step),dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y),x=(a.x+b.x)/2,y=(a.y+b.y)/2;
     this.routes.moveTo(x-dx*5+dy*4,y-dy*5-dx*4).lineTo(x+dx*5,y+dy*5).lineTo(x-dx*5-dy*4,y-dy*5+dx*4).stroke({color:0xfff0b4,width:3});
    }
   }else if(actor.kind==='dock'){
    const phase=dockVisualState(scene,actor),assetId:CampaignAssetId=`dock-${phase}`,asset=CAMPAIGN_ASSETS.find(a=>a.id===assetId)!,node=this.entity(actor.id,actor.at,undefined,1),texture=this.textures.campaign?.[assetId];
    if(texture){const sprite=new Sprite(texture),layout=dockSpriteLayout(ts,asset);sprite.anchor.set(layout.pivot.x,layout.pivot.y);sprite.width=layout.width;sprite.height=layout.height;node.addChild(sprite);}
    this.label(phase==='waiting'?'WAIT':'SHUTTLE',node,ts*.39,Math.max(9,ts*.15));
   }else if(actor.kind==='moonwhale'){
    const phase=whaleVisualState(scene,actor),assetId:CampaignAssetId=`whale-${phase}`,asset=CAMPAIGN_ASSETS.find(a=>a.id===assetId)!,node=this.entity(actor.id,actor.at,undefined,1),texture=this.textures.campaign?.[assetId];
    if(texture){const sprite=new Sprite(texture),layout=whaleSpriteLayout(ts,asset);sprite.anchor.set(layout.pivot.x,layout.pivot.y);sprite.width=layout.width;sprite.height=layout.height;node.addChild(sprite);}
    const mark=this.cellCenter(actor.landing),color=phase==='waiting'?0xffd181:0xaaffde;
    this.routes.roundRect(mark.x-ts*.45,mark.y-ts*.45,ts*.9,ts*.9,8).stroke({color,width:3});
    if(!scene.crew.some(c=>c.status==='active'&&c.at.r===actor.landing.r&&c.at.c===actor.landing.c)){const label=new Container();label.position.set(mark.x,mark.y);this.content.addChild(label);this.label(actor.transferRequested?'HOP QUEUED':'LAND',label,ts*.33,Math.max(9,ts*.15));}
    const route=scene.geometry.routes.find(r=>r.id===actor.routeId)!,index=route.cells.findIndex(p=>p.r===actor.at.r&&p.c===actor.at.c),next=this.cellCenter(route.cells[(index+1)%route.cells.length]!),at=this.cellCenter(actor.at),dx=Math.sign(next.x-at.x),dy=Math.sign(next.y-at.y),x=(at.x+next.x)/2,y=(at.y+next.y)/2;
    this.routes.moveTo(x-dx*5+dy*4,y-dy*5-dx*4).lineTo(x+dx*5,y+dy*5).lineTo(x-dx*5-dy*4,y-dy*5+dx*4).stroke({color:0xffffff,width:2});
   }else{const node=this.entity(actor.id,actor.at,actor.kind==='rover'?this.textures.roverOverlay:undefined,.9,actor.kind==='rover'?undefined:actor.kind);if(actor.kind==='rover'&&node.children[0])node.children[0].y=ts*.14;}
  }
  for(const dock of scene.geometry.endpoints.filter(e=>e.kind==='supply-dock'&&e.active)){
   const at=this.cellCenter(dock.at),node=new Container();node.position.set(at.x,at.y);this.content.addChild(node);const returned=scene.returnedDockIds.includes(dock.id);
   this.routes.roundRect(at.x-ts*.44,at.y-ts*.44,ts*.88,ts*.88,8).stroke({color:returned?0x9fffe0:0xffc46b,width:3});
   if(returned)this.parcel(node,ts);this.label(returned?'RETURNED':'SUPPLY DOCK',node,ts*.35,Math.max(9,ts*.14));
  }
  for(const nursery of scene.geometry.endpoints.filter(e=>e.kind==='nursery'&&e.active)){
   const complete=scene.arrivedNurseryIds.includes(nursery.id),at=this.cellCenter(nursery.at),node=new Container();node.position.set(at.x,at.y);this.content.addChild(node);
   const texture=this.textures.campaign?.['pup-nursery'],asset=CAMPAIGN_ASSETS.find(a=>a.id==='pup-nursery')!;
   if(texture){const sprite=new Sprite(texture);sprite.anchor.set(asset.pivot.x,asset.pivot.y);sprite.width=ts*.78;sprite.height=ts*.78;sprite.y=-ts*.06;node.addChild(sprite);}
   if(complete){const happy=this.textures.campaign?.['pup-complete'];if(happy){const sprite=new Sprite(happy),pose=CAMPAIGN_ASSETS.find(a=>a.id==='pup-complete')!;sprite.anchor.set(pose.pivot.x,pose.pivot.y);sprite.width=ts*.55;sprite.height=ts*.55;sprite.x=ts*.2;sprite.y=ts*.08;node.addChild(sprite);}}
   this.label(complete?'COZY':'NURSERY',node,ts*.37,Math.max(9,ts*.15));
   this.routes.roundRect(at.x-ts*.45,at.y-ts*.45,ts*.9,ts*.9,8).stroke({color:complete?0xaaffde:0xffe2a7,width:2});
  }
  this.waveSprite=null;const wave=pendingWaves(scene.arrivals)[0],phase=waveVisualState(scene);
  if(wave&&phase){const at=this.cellCenter(wave.entry),occupied=scene.crew.some(c=>c.status==='active'&&c.at.r===wave.entry.r&&c.at.c===wave.entry.c),texture=this.textures.campaign?.[`wave-${phase}`];
   this.routes.roundRect(at.x-ts*.45,at.y-ts*.45,ts*.9,ts*.9,8).stroke({color:phase==='waiting'?0xffd181:0x95f5fa,width:2});
   if(occupied)this.routes.circle(at.x+ts*.36,at.y+ts*.36,ts*.055).fill(0xffd181);
   else {const node=new Container();node.position.set(at.x+ts*.22,at.y-ts*.24);this.content.addChild(node);
    if(texture){const sprite=new Sprite(texture),asset=CAMPAIGN_ASSETS.find(a=>a.id===`wave-${phase}`)!,layout=waveSpriteLayout(ts,asset);sprite.anchor.set(layout.pivot.x,layout.pivot.y);sprite.width=layout.width;sprite.height=layout.height;node.addChild(sprite);this.waveSprite=sprite;}
    this.label(phase==='waiting'?'WAIT':`+${wave.crew.length} · ${Math.max(0,wave.turn-scene.turn)}`,node,-ts*.19,Math.max(9,Math.min(11,ts*.17)));
   }
  }
  for(const fixture of scene.fixtures){this.entity(fixture.id,fixture.at,fixtureTexture(fixture,this.textures),.82);
   if(fixture.kind==='phase-door'){
    const visual=phaseVisualState(fixture),id:CampaignAssetId=`phase-${visual}`,asset=CAMPAIGN_ASSETS.find(a=>a.id===id)!,texture=this.textures.campaign?.[id],node=this.nodes.get(fixture.id)!;
    if(texture){const sprite=new Sprite(texture),layout=phaseSpriteLayout(ts,asset);sprite.anchor.set(layout.pivot.x,layout.pivot.y);sprite.width=layout.width;sprite.height=layout.height;sprite.y=ts*.4;sprite.alpha=visual==='pending'?.7:visual==='closed'?.77:.88;node.addChild(sprite);}
    const at=this.cellCenter(fixture.at);this.routes.roundRect(at.x-ts*.46,at.y-ts*.46,ts*.92,ts*.92,8).stroke({color:visual==='pending'?0xffc46b:fixture.open?0x89fff0:0xc5abff,width:visual==='pending'?3:2});
   }
   if(fixture.kind==='jelly'){
    const remaining=3-scene.turn%3,phase=scene.portalsComplete?'clear':fixture.preview?'ready':fixture.coatedCells.length?'wobble':'idle';
    const id:CampaignAssetId=`jelly-${phase}`,asset=CAMPAIGN_ASSETS.find(a=>a.id===id)!,texture=this.textures.campaign?.[id],node=this.nodes.get(fixture.id)!;
    const guestAtSource=scene.crew.some(c=>c.status==='active'&&c.at.r===fixture.at.r&&c.at.c===fixture.at.c);
    if(texture&&!guestAtSource){const sprite=new Sprite(texture);sprite.anchor.set(asset.pivot.x,asset.pivot.y);sprite.width=sprite.height=ts*.92;sprite.y=ts*.35;sprite.alpha=.83;node.addChild(sprite);}
    for(const cell of fixture.coatedCells){
     const at=this.cellCenter(cell),g=new Graphics();g.roundRect(at.x-ts*.47,at.y-ts*.47,ts*.94,ts*.94,8).fill({color:0xb77ee8,alpha:.16}).stroke({color:0xe1a7ff,width:2,alpha:.88});this.content.addChild(g);
     if(texture){const overlay=new Sprite(this.textures.campaign?.['jelly-idle']??texture),idle=CAMPAIGN_ASSETS.find(a=>a.id==='jelly-idle')!;overlay.anchor.set(idle.pivot.x,idle.pivot.y);overlay.width=overlay.height=ts*.72;overlay.position.set(at.x,at.y+ts*.31);overlay.alpha=.62;this.content.addChild(overlay);}
    }
    if(fixture.preview&&!scene.portalsComplete){const at=this.cellCenter(fixture.preview),warning=remaining===1;
     this.routes.roundRect(at.x-ts*.45,at.y-ts*.45,ts*.9,ts*.9,8).stroke({color:warning?0xffd18a:0xd8b6ff,width:warning?3:2,alpha:.95});
     this.routes.circle(at.x+ts*.31,at.y-ts*.3,ts*.065).fill(warning?0xffd18a:0xd8b6ff);
    }
    if(!guestAtSource)this.label(scene.portalsComplete?'CLEAR':fixture.preview?`SPREAD ${remaining}`:'WAIT',node,-ts*.37,Math.max(9,ts*.15));
   }
   if(fixture.kind==='gravity-switch'){
    const id:CampaignAssetId=`gravity-${fixture.direction}`,texture=this.textures.campaign?.[id],asset=CAMPAIGN_ASSETS.find(a=>a.id===id)!,node=this.nodes.get(fixture.id)!;
    if(texture){const sprite=new Sprite(texture);sprite.anchor.set(asset.pivot.x,asset.pivot.y);sprite.width=sprite.height=ts*1.12;sprite.position.set(ts*.22,ts*.22);node.addChild(sprite);}
    for(const segment of scene.geometry.gravitySegments.filter(s=>s.chamberId===fixture.chamberId)){
     const source=scene.geometry.refillSources.find(s=>s.segmentId===segment.id);if(!source)continue;
     const head=this.cellCenter(source.at),down=fixture.direction==='down',x=head.x+(down?0:ts*.42),y=head.y-(down?ts*.42:0);
     this.routes.moveTo(x+(down?0:ts*.16),y-(down?ts*.16:0)).lineTo(x,y).stroke({color:0xa9ffef,width:3});
     this.routes.moveTo(x+(down?-ts*.06:ts*.06),y+(down?-ts*.06:-ts*.06)).lineTo(x,y).lineTo(x+ts*.06,y+(down?-ts*.06:ts*.06)).stroke({color:0xa9ffef,width:3});
    }
   }
   if(fixture.kind==='gate'){
    const node=this.nodes.get(fixture.id)!,asset=CAMPAIGN_ASSETS.find(a=>a.id==='gate-closed')!,texture=this.textures.campaign?.[fixture.open?'gate-open':'gate-closed'];
    const cell=fixture.cells[0]!,at=this.cellCenter(cell);node.position.set(at.x,at.y);
    if(texture){const sprite=new Sprite(texture);sprite.anchor.set(asset.pivot.x,asset.pivot.y);sprite.width=sprite.height=ts*.96;sprite.y=ts*.26;node.addChild(sprite);}
    for(const p of fixture.cells){const at=this.cellCenter(p);this.routes.roundRect(at.x-ts*.45,at.y-ts*.45,ts*.9,ts*.9,8).stroke({color:fixture.open?0x8affde:0xffcf75,width:2,alpha:.75});}
   }
   if(fixture.kind==='lock'){
    const node=this.nodes.get(fixture.id)!,gate=scene.fixtures.find(f=>f.id===fixture.gateId),waiting=scene.pieces.some(p=>p.at.r===fixture.at.r&&p.at.c===fixture.at.c&&p.kind==='cargo'&&p.id!==fixture.keyId);
    const g=new Graphics();g.star(ts*.3,-ts*.23,5,ts*.16,ts*.075).stroke({color:waiting?0xff9476:gate?.kind==='gate'&&gate.open?0x8affde:0xffd676,width:3});node.addChild(g);
    if(waiting)this.label('WRONG KEY',node,-ts*.4,Math.max(9,ts*.14));
   }
   if(fixture.kind==='garden'){
    const id:CampaignAssetId=`garden-${gardenVisualState(fixture)}`,texture=this.textures.campaign?.[id],asset=CAMPAIGN_ASSETS.find(a=>a.id===id)!,node=this.nodes.get(fixture.id)!;
    if(texture){const sprite=new Sprite(texture);sprite.anchor.set(asset.pivot.x,asset.pivot.y);sprite.width=ts*.64;sprite.height=ts*.64;sprite.position.set(ts*.23,ts*.2);node.addChild(sprite);}
    const mark=this.cellCenter(fixture.outputAt),waiting=gardenWaiting(scene,fixture),departed=scene.departedExitIds.includes(fixture.exitId);
    this.routes.roundRect(mark.x-ts*.46,mark.y-ts*.46,ts*.92,ts*.92,8).stroke({color:waiting?0xffcf75:0xffe6ab,width:2});
    const label=new Container();label.position.set(mark.x,mark.y);this.content.addChild(label);this.label(waiting?'CROP WAIT':departed?'DELIVERED':'CROP OUT',label,-ts*.38,Math.max(9,ts*.14));
   }
   if(fixture.kind==='solar'){
    const phase=solarVisualState(fixture),id:CampaignAssetId=`solar-${phase}`,asset=CAMPAIGN_ASSETS.find(a=>a.id===id)!,texture=this.textures.campaign?.[id],node=this.nodes.get(fixture.id)!;
    if(texture){const sprite=new Sprite(texture);sprite.anchor.set(asset.pivot.x,asset.pivot.y);sprite.width=sprite.height=ts*1.36;sprite.position.set(0,ts*.2);node.addChild(sprite);}
    const entrance=scene.geometry.endpoints.find(e=>e.id===fixture.endpointId)!;
    const mark=this.cellCenter(entrance.at),active=entrance.active;
    this.routes.roundRect(mark.x-ts*.46,mark.y-ts*.46,ts*.92,ts*.92,8).stroke({color:active?0x8bffe4:0xffcd7d,width:3});
    this.routes.moveTo(mark.x,mark.y-ts*.43).lineTo(mark.x,mark.y-ts*.28).stroke({color:active?0x8bffe4:0xffcd7d,width:3});
    const badge=new Container();badge.position.set(mark.x,mark.y);this.content.addChild(badge);
    if(!scene.crew.some(c=>c.status==='active'&&c.at.r===entrance.at.r&&c.at.c===entrance.at.c))this.label(active?'HOME':'LOCKED',badge,ts*.36,Math.max(9,ts*.15));
    addSolarIndicator(node,fixture,this.textures.tile[fixture.tier],ts);
   }
   if(fixture.kind==='bridge'){
    const phase=bridgeVisualState(fixture),id=phase==='folded'?'bridge-folded':'bridge-charged',asset=CAMPAIGN_ASSETS.find(a=>a.id===id)!,texture=this.textures.campaign?.[id],node=this.nodes.get(fixture.id)!;
    if(texture){const sprite=new Sprite(texture);sprite.anchor.set(asset.pivot.x,asset.pivot.y);sprite.width=ts*.62;sprite.height=ts*.62;sprite.position.set(ts*.17,-ts*.11);node.addChild(sprite);}
    const lights=new Graphics();for(let i=0;i<2;i++)lights.circle(ts*(.22+i*.13),-ts*.3,ts*.046).fill(i<fixture.hits?0x8affed:0x25324c).stroke({color:0xe4c887,width:1});node.addChild(lights);
   }
   if(fixture.kind==='portal'){
    const index=scene.fixtures.filter(f=>f.kind==='portal').findIndex(f=>f.id===fixture.id)+1,phase=portalVisualState(scene,fixture);
    const asset=CAMPAIGN_ASSETS.find(a=>a.id===`portal-${phase}`)!,texture=this.textures.campaign?.[`portal-${phase}`];
    const entry=this.nodes.get(fixture.id)!;
    for(const [node,at,receiving] of [[entry,fixture.at,false],[this.entity(`${fixture.id}:receiver`,fixture.receiver,undefined,1),fixture.receiver,true]] as const){
     if(texture){const sprite=new Sprite(texture),layout=portalSpriteLayout(ts,asset);sprite.anchor.set(layout.pivot.x,layout.pivot.y);sprite.width=layout.width;sprite.height=layout.height;sprite.y=ts*.29;sprite.alpha=.92;node.addChild(sprite);}
     const sharesExit=receiving&&scene.geometry.endpoints.some(e=>e.kind==='exit'&&e.at.r===at.r&&e.at.c===at.c);
     this.label(`${receiving?'OUT':'IN'} ${index}${phase==='waiting'?' · WAIT':phase==='arrival'?' · ✓':''}`,node,ts*(sharesExit?-.43:.39),Math.max(9,ts*.14));
     const p=this.cellCenter(at);this.routes.roundRect(p.x-ts*.47,p.y-ts*.47,ts*.94,ts*.94,8).stroke({color:phase==='waiting'?0xffc46b:0x9df9ef,width:2});
    }
    const a=this.cellCenter(fixture.at),b=this.cellCenter(fixture.receiver);this.routes.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:0xc7aff7,width:1.5,alpha:.3});
    const segment=scene.geometry.gravitySegments.find(s=>s.id===fixture.segmentId)!,dx=segment.direction==='left'?-1:0,dy=segment.direction==='down'?1:0;
    for(const cell of segment.cells){const p=this.cellCenter(cell),x=p.x+ts*.36,y=p.y+ts*.18;this.routes.moveTo(x-dx*4+dy*3,y-dy*4-dx*3).lineTo(x+dx*4,y+dy*4).lineTo(x-dx*4-dy*3,y-dy*4+dx*3).stroke({color:0xaaffec,width:2});}
   }
   if(fixture.kind==='comet')for(const [i,p] of fixture.cells.entries())if(p.r!==fixture.at.r||p.c!==fixture.at.c){const node=this.entity(`${fixture.id}:part:${i}`,p,this.textures.cometOverlay,.78);this.nodes.delete(`${fixture.id}:part:${i}`);node.alpha=.9;}
  }
  const active=scene.crew.filter(c=>c.status==='active');
  for(const crew of active){const riding=scene.actors.some(a=>a.id===crew.carrierId&&a.kind==='moonwhale'),group=active.filter(c=>c.at.r===crew.at.r&&c.at.c===crew.at.c),i=group.indexOf(crew),node=this.entity(crew.id,crew.at,(crew.vipId?this.textures.station.vips[crew.vipId]:undefined)??this.textures.survivor,riding?.43:group.length>1?.43:.65);
   const body=node.children[0]!;body.x=(Math.min(i,2)-(Math.min(group.length,3)-1)/2)*ts*.22;body.visible=i<3;
   if(riding)body.y=-ts*.35;
   if(scene.shelterCrewIds.includes(crew.id))this.shelterBadge(node,shelterVisualState(crew),ts);
   if(i===0)this.label(crewGroupLabel(group,riding),node,riding?-ts*.64:-ts*.39,Math.max(10,Math.min(13,ts*.2)));
  }
  for(const crew of scene.crew.filter(c=>scene.shelterCrewIds.includes(c.id)&&(c.status==='housed'||c.status==='evacuated'))){const node=new Container(),p=this.cellCenter(crew.at);node.position.set(p.x,p.y);this.content.addChild(node);this.shelterBadge(node,'complete',ts);}
  for(const dock of scene.actors.filter(a=>a.kind==='dock')){
   const marker=new Container(),at=this.cellCenter(dock.entrance),g=new Graphics(),blocked=dockVisualState(scene,dock)==='waiting';
   marker.position.set(at.x,at.y);
   g.roundRect(-ts*.47,-ts*.47,ts*.94,ts*.94,8).fill({color:blocked?0xffba65:0x6df9e6,alpha:.11}).stroke({color:blocked?0xffc576:0xa4fff0,width:3});
   g.circle(0,-ts*.45,ts*.07).fill(blocked?0xffc576:0xa4fff0);marker.addChild(g);
   this.label(blocked?'WAIT':'BOARD',marker,ts*.4,Math.max(9,ts*.15));this.content.addChild(marker);this.dockMarkers.set(dock.id,marker);
  }
  // Fixture counters stay legible when a crew member occupies the same cell.
  for(const p of scene.pieces)if(p.kind==='cargo'){
   const node=new Container(),at=this.cellCenter(p.at),index=scene.geometry.endpoints.filter(e=>e.kind==='exit').findIndex(e=>e.id===p.destinationId);
   node.position.set(at.x+ts*.3,at.y);this.label(p.cargoKind==='key'?`★${scene.fixtures.filter(f=>f.kind==='lock').findIndex(f=>f.id===p.destinationId)+1}`:`↓${index+1}`,node,ts*.3,Math.max(11,ts*.2));this.content.addChild(node);this.cargoLabels.set(p.id,node);
  }
  for(const fixture of scene.fixtures){if(fixture.kind==='portal'||fixture.kind==='jelly')continue;const labels=new Container(),p=this.cellCenter(fixture.kind==='gate'?fixture.cells[0]!:fixture.at);labels.position.set(p.x,p.y);this.label(fixture.kind==='lock'?`LOCK ${scene.fixtures.filter(f=>f.kind==='lock').findIndex(f=>f.id===fixture.id)+1}`:fixture.kind==='gate'?`GATE ${scene.fixtures.filter(f=>f.kind==='gate').findIndex(f=>f.id===fixture.id)+1} ${fixture.open?'OPEN':'CLOSED'}`:fixtureLabel(fixture),labels,ts*.39,Math.max(10,Math.min(12,ts*.19)));this.content.addChild(labels);}
 }
 interpolate(from:CampaignScene,to:CampaignScene,progress:number,events:readonly CampaignEvent[]):void {
  this.moving=true;
  const eased=1-(1-progress)**3;
  for(const event of events)if(event.type==='gravity'){
   const body=this.nodes.get(event.switchId)?.children[0],texture=this.textures.campaign?.[`gravity-pressed-${event.after}`];
   if(body instanceof Sprite&&texture){body.texture=texture;if(!this.reducedMotion())body.rotation=.06*Math.sin(progress*Math.PI);}
  }
  for(const event of events)if(event.type==='phase'){
   const body=this.nodes.get(event.doorId)?.children[0];
   const id:CampaignAssetId=event.phase==='closed'&&progress<.48?'phase-next':`phase-${event.phase==='opened'?'open':event.phase==='closed'?'closed':'pending'}`;
   const texture=this.textures.campaign?.[id];if(body instanceof Sprite&&texture){body.texture=texture;body.alpha=event.phase==='pending'?.7:event.phase==='closed'?.77:.88;}
  }
  for(const event of events)if(event.type==='refill'){
   const piece=to.pieces.find(p=>p.id===event.pieceId);if(!piece||piece.kind!=='tile')continue;
   const node=this.nodes.get(piece.id)??this.entity(piece.id,event.to,this.textures.tile[piece.tier],1),a=this.cellCenter(event.from),b=this.cellCenter(event.to);
   node.position.set(this.reducedMotion()?b.x:a.x+(b.x-a.x)*eased,this.reducedMotion()?b.y:a.y+(b.y-a.y)*eased);node.alpha=progress;
  }
  for(const event of events)if(event.type==='key'&&event.phase==='opened'){
   const body=this.nodes.get(event.keyId)?.children[0],gate=this.nodes.get(event.gateId)?.children[0];
   if(body instanceof Sprite){const texture=this.textures.campaign?.['key-sparkle'];if(texture)body.texture=texture;if(!this.reducedMotion())body.rotation=progress*Math.PI*.6;}
   if(gate instanceof Sprite){const texture=this.textures.campaign?.[progress<.45?'gate-closed':'gate-open'];if(texture)gate.texture=texture;}
  }
  for(const event of events)if(event.type==='garden'&&event.phase==='grown'){
   const body=this.nodes.get(event.gardenId)?.children[0],id:CampaignAssetId=`garden-${(['seed','sprout','bloom','ripe'] as const)[event.stage]!}`,texture=this.textures.campaign?.[id];if(body instanceof Sprite&&texture){body.texture=texture;if(!this.reducedMotion())body.y=this.layout.tileSize*(.2-.05*Math.sin(Math.PI*progress));}
  }
  for(const event of events)if(event.type==='solar'){
   const body=this.nodes.get(event.collectorId)?.children[0],id=event.phase==='activated'&&!this.reducedMotion()&&progress<.7?'solar-pulse':event.phase==='activated'?'solar-ready':'solar-charging',texture=this.textures.campaign?.[id];
   if(body instanceof Sprite&&texture)body.texture=texture;
  }
  for(const event of events)if(event.type==='shelter'){const node=this.nodes.get(event.crewId);if(node){const badge=node.children.find(c=>c.label==='shelter-badge'),texture=this.textures.campaign?.['shelter-happy'];if(badge instanceof Sprite&&texture)badge.texture=texture;const body=node.children[0];if(body&&!this.reducedMotion()){body.y=-this.layout.tileSize*.06*Math.sin(Math.PI*progress);body.rotation=.05*Math.sin(Math.PI*progress);}}}
  for(const event of events)if(event.type==='bridge'){
   const body=this.nodes.get(event.bridgeId)?.children[0],texture=this.textures.campaign?.['bridge-charged'];if(body instanceof Sprite&&texture)body.texture=texture;
   if(event.phase==='opened')for(const [i,panel] of (this.bridgePanels.get(event.bridgeId)??[]).entries()){
    const local=this.reducedMotion()?progress:Math.min(1,Math.max(0,progress*1.3-i*.12));
    const texture=this.textures.campaign?.[local<.65?'bridge-unfolding':'bridge-open'];if(texture)panel.texture=texture;
    panel.alpha=local;panel.height=this.layout.tileSize*1.03*(this.reducedMotion()?1:.35+.65*local);
   }
  }
  for(const event of events)if(event.type==='portal'){
   for(const id of [event.portalId,`${event.portalId}:receiver`]){const sprite=this.nodes.get(id)?.children[0],texture=this.textures.campaign?.[event.phase==='transferred'?'portal-arrival':'portal-waiting'];if(sprite instanceof Sprite&&texture)sprite.texture=texture;}
  }
  for(const event of events)if(event.type==='pirate'){
   const node=this.nodes.get(event.actorId),body=node?.children[0];
   if(body instanceof Sprite){const texture=this.textures.campaign?.[event.phase==='returned'?'pirate-returned':event.phase==='distracted'?'pirate-distracted':'pirate-warning'];if(texture)body.texture=texture;}
   if(event.phase==='returned'){
    const dock=from.geometry.endpoints.find(e=>e.id===event.dockId);if(!dock)continue;
    let parcel=this.returningParcels.get(event.parcelId);if(!parcel){parcel=new Container();this.parcel(parcel,this.layout.tileSize);this.content.addChild(parcel);this.returningParcels.set(event.parcelId,parcel);}
    const a=this.cellCenter(event.at),b=this.cellCenter(dock.at);parcel.position.set(a.x+(b.x-a.x)*eased,a.y+(b.y-a.y)*eased-this.layout.tileSize*.18*Math.sin(Math.PI*progress));
    if(body&&!this.reducedMotion())body.y=-this.layout.tileSize*.25*eased;
   }
  }
  for(const event of events)if(event.type==='dock'){
   const body=this.nodes.get(event.actorId)?.children[0],texture=this.textures.campaign?.[event.phase==='boarded'?'dock-farewell':event.phase==='waiting'?'dock-waiting':'dock-cruising'];
   if(body instanceof Sprite&&texture)body.texture=texture;
  }
  for(const event of events)if(event.type==='current')for(const sprite of this.currentSprites.get(event.routeId)??[]){const texture=this.textures.campaign?.[event.phase==='waiting'?'current-waiting':'current-moving'];if(texture)sprite.texture=texture;sprite.alpha=this.reducedMotion()?1:.8+.2*Math.sin(progress*Math.PI);}
  // Crew spawn events share an arrival group. The final snapshot remains authoritative.
  for(const event of events)if(event.type==='arrival'){
   const wave=from.arrivals.find(a=>a.id===event.arrivalId);if(!wave)continue;const at=this.cellCenter(wave.entry),ts=this.layout.tileSize;
   const texture=this.textures.campaign?.['wave-arrival'];if(this.waveSprite&&texture){this.waveSprite.texture=texture;this.waveSprite.x=ts*.15*eased;this.waveSprite.y=-ts*.08*eased;this.waveSprite.alpha=1-progress;}
   for(const [i,id] of event.crewIds.entries()){
    let node=this.nodes.get(id);if(!node){node=this.entity(id,wave.entry,this.textures.survivor,event.crewIds.length>1?.43:.65);}
    node.position.set(at.x+(i-(event.crewIds.length-1)/2)*ts*.2,at.y-ts*.55*(1-eased));node.alpha=progress;
   }
   if(progress<=.05)this.routes.moveTo(at.x-ts*.22,at.y-ts*.35).quadraticCurveTo(at.x+ts*.4,at.y-ts*.8,at.x,at.y).stroke({color:0xa5fff0,width:2});
  }
  const departures=events.filter(e=>e.type==='remove'&&e.reason==='departure');
  for(const event of departures)if(event.type==='remove'&&event.piece.kind==='cargo')this.exitFrame(event.piece.destinationId,'departure');
  for(const [id,node] of this.nodes){const a=from.entityPositions[id],b=to.entityPositions[id];if(a&&b){const start=this.cellCenter(a),end=this.cellCenter(b);node.position.set(start.x+(end.x-start.x)*eased,start.y+(end.y-start.y)*eased);}else if(a&&!b)node.alpha=1-progress;
   const portal=events.find(e=>e.type==='portal'&&e.phase==='transferred'&&(e.pieceId===id||e.passengerIds.includes(id)));
   if(portal?.type==='portal'){
    const at=this.cellCenter(progress<.5?portal.from:portal.to);node.position.set(at.x,at.y);
    if(!this.reducedMotion())node.scale.set(Math.max(.02,Math.abs(progress*2-1)));
    else node.alpha=progress<.5?1:Math.min(1,progress*2);
   }
   const pup=from.actors.find(actor=>actor.id===id&&actor.kind==='pup'),body=node.children[0];
   if(pup&&body instanceof Sprite){const walking=events.some(e=>e.type==='move'&&e.entityId===id),arriving=events.some(e=>e.type==='actor'&&e.actorId===id&&e.after===null);
    if(walking||arriving){const texture=this.textures.campaign?.[arriving?'pup-complete':'pup-walking'];if(texture)body.texture=texture;
    body.rotation=this.reducedMotion()?0:Math.sin(progress*Math.PI*4)*.035;
    body.y=this.reducedMotion()?0:-Math.abs(Math.sin(progress*Math.PI*2))*this.layout.tileSize*.04;
    if(arriving&&!this.reducedMotion())node.scale.set(1+Math.sin(progress*Math.PI)*.08);
    }
   }
   const hop=events.find(e=>e.type==='transfer'&&e.crewId===id&&from.actors.some(a=>a.id===e.fromCarrierId&&a.kind==='moonwhale'));
   if(hop?.type==='transfer'){
    const body=node.children[0];if(body){body.y=-this.layout.tileSize*(.35*(1-eased)+.2*Math.sin(Math.PI*progress));body.width=this.layout.tileSize*(.43+.22*eased);body.height=this.layout.tileSize*(.43+.22*eased);}
    for(const label of node.children.slice(1))label.alpha=1-progress;
    const whale=this.nodes.get(hop.fromCarrierId!)?.children[0],texture=this.textures.campaign?.['whale-ready'];if(whale instanceof Sprite&&texture)whale.texture=texture;
   }
   if(a&&!b&&departures.some(e=>e.type==='remove'&&(e.piece.id===id||e.piece.kind==='cargo'&&e.piece.passengerIds.includes(id))))node.y=this.cellCenter(a).y+this.layout.tileSize*.22*eased;
   const merge=events.find(e=>e.type==='merge'&&e.pieceIds.includes(id));if(merge?.type==='merge'){const at=this.cellCenter(merge.at);node.x+=(at.x-node.x)*eased;node.y+=(at.y-node.y)*eased;node.scale.set(1-progress*.3);}
   const label=this.cargoLabels.get(id);if(label){label.position.set(node.x+this.layout.tileSize*.3,node.y);label.alpha=node.alpha;}
  }
  for(const [id,marker] of this.dockMarkers){const a=from.actors.find((x):x is Extract<typeof x,{kind:'dock'}>=>x.id===id&&x.kind==='dock'),b=to.actors.find((x):x is Extract<typeof x,{kind:'dock'}>=>x.id===id&&x.kind==='dock');if(!a||!b)continue;
   const start=this.cellCenter(a.entrance),end=this.cellCenter(b.entrance);marker.position.set(start.x+(end.x-start.x)*eased,start.y+(end.y-start.y)*eased);
  }
 }
 hint(action:CampaignAction|null,departureExitIds:readonly string[]=[]):void {this.hints.clear();for(const id of this.exitSprites.keys())this.exitFrame(id,departureExitIds.includes(id)?'ready':exitVisualState(this.scene,id));if(!action||action.type==='booster')return;
  const from=action.type==='swap'?action.from:this.scene.actors.find(a=>a.id===action.actorId)?.at;if(!from)return;
  const to=action.type==='swap'?action.to:{r:from.r+action.dr,c:from.c+action.dc},a=this.cellCenter(from),b=this.cellCenter(to),ts=this.layout.tileSize;
  this.hints.roundRect(a.x-ts*.46,a.y-ts*.46,ts*.92,ts*.92,8).stroke({color:0xe4ffce,width:3});
  const dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);this.hints.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:0xffffff,width:4});
  this.hints.moveTo(b.x-dx*10+dy*6,b.y-dy*10-dx*6).lineTo(b.x,b.y).lineTo(b.x-dx*10-dy*6,b.y-dy*10+dx*6).stroke({color:0xffffff,width:4});
 }
}
