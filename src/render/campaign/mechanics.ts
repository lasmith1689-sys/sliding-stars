import type {CampaignFixture,CampaignCrew,CampaignActor} from '../../campaign/types';
import {whaleLandingSafe} from '../../campaign/mechanics/moonwhales';
import {pupNextStep} from '../../campaign/mechanics/pups';
import {currentMoves} from '../../campaign/mechanics/currents';
import {pirateNextStep,type Pirate} from '../../campaign/mechanics/pirates';
import {activeCell,sameCell} from '../../campaign/engine/geometry';
import {actorAt,blocksActor,crewAt,pieceAt} from '../../campaign/engine/occupancy';
import {pendingWaves,waveBlocked} from '../../campaign/mechanics/waves';
import type {TextureSet} from '../textures';
import type {CampaignScene} from './snapshot';
import type {CAMPAIGN_ASSETS} from '../../assets/campaign-manifest';
import {portalReceiverBlocked,type Portal} from '../../campaign/mechanics/portals';
import type {Bridge} from '../../campaign/mechanics/bridges';
import type {SolarCollector} from '../../campaign/mechanics/solar';
import type {Garden} from '../../campaign/mechanics/gardens';
import {dockCanStep,dockNextStep,type Dock} from '../../campaign/mechanics/docks';
import type {PhaseDoor} from '../../campaign/mechanics/phase';
export function dockVisualState(scene:CampaignScene,dock:Dock):'cruising'|'inviting'|'waiting'|'farewell' {
 if(scene.docksComplete)return 'farewell';
 const next=dockNextStep(scene,dock);
 if(!next||!dockCanStep({...scene,pieces:[...scene.pieces],crew:[...scene.crew],actors:[...scene.actors],fixtures:[...scene.fixtures]},dock,next))return 'waiting';
 const target={r:dock.entrance.r+next.r-dock.at.r,c:dock.entrance.c+next.c-dock.at.c};
 return scene.crew.some(c=>c.status==='active'&&c.at.r===target.r&&c.at.c===target.c)?'inviting':'cruising';
}
export function dockSpriteLayout(tileSize:number,asset:typeof CAMPAIGN_ASSETS[number]){const width=tileSize*1.4;return {width,height:width*asset.canvas.height/asset.canvas.width,pivot:asset.pivot};}
export function phaseVisualState(door:PhaseDoor):'open'|'closed'|'pending' {return door.closingPending?'pending':door.open?'open':'closed';}
export function phaseSpriteLayout(tileSize:number,asset:typeof CAMPAIGN_ASSETS[number]){const width=tileSize*1.07;return {width,height:width*asset.canvas.height/asset.canvas.width,pivot:asset.pivot};}
export function gardenVisualState(plot:Garden):'seed'|'sprout'|'bloom'|'ripe' {return (['seed','sprout','bloom','ripe'] as const)[plot.stage]!;}
export function gardenWaiting(scene:CampaignScene,plot:Garden):boolean {return plot.stage===3&&!scene.pieces.some(p=>p.id===plot.harvestId)&&!scene.departedExitIds.includes(plot.exitId);}
export function bridgeVisualState(bridge:Bridge):'folded'|'charged'|'open' {return bridge.active?'open':bridge.hits?'charged':'folded';}
export function solarVisualState(collector:SolarCollector):'idle'|'charging'|'ready' {return collector.charge===collector.quota?'ready':collector.charge?'charging':'idle';}
export function portalVisualState(scene:CampaignScene,portal:Portal):'idle'|'ready'|'waiting'|'arrival' {
 if(scene.portalsComplete)return 'arrival';
 if(portalReceiverBlocked({...scene,pieces:[...scene.pieces],crew:[...scene.crew],actors:[...scene.actors],fixtures:[...scene.fixtures]},portal))return 'waiting';
 return scene.pieces.some(p=>sameCell(p.at,portal.at))?'ready':'idle';
}
export function portalSpriteLayout(tileSize:number,asset:typeof CAMPAIGN_ASSETS[number]){const width=tileSize*1.16;return {width,height:width*asset.canvas.height/asset.canvas.width,pivot:asset.pivot};}
export function pirateSceneStep(scene:CampaignScene,pirate:Pirate){return pirateNextStep(scene,pirate);}
export function pirateSceneBlocked(scene:CampaignScene,pirate:Pirate){
 const next=pirateSceneStep(scene,pirate),layers={pieces:[...scene.pieces],actors:[...scene.actors],crew:[...scene.crew],fixtures:[...scene.fixtures]};
 return !next||!activeCell(scene.geometry,next)||blocksActor(layers,next)||pieceAt(layers,next)?.kind!=='tile'||!!actorAt(layers,next)||crewAt(layers,next).length>0;
}
export function pirateVisualState(scene:CampaignScene,pirate:Pirate):'idle'|'distracted'|'warning' {
 const next=pirateSceneStep(scene,pirate),dock=scene.geometry.endpoints.find(e=>e.id===pirate.dockId);
 return pirateSceneBlocked(scene,pirate)||(next&&dock&&sameCell(next,dock.at))?'warning':pirate.distraction===1?'distracted':'idle';
}
export function pirateSpriteLayout(tileSize:number,asset:typeof CAMPAIGN_ASSETS[number]){const width=tileSize*1.04;return {width,height:width*asset.canvas.height/asset.canvas.width,pivot:asset.pivot};}
export function currentVisualState(scene:CampaignScene,routeId:string):'idle'|'waiting'|'complete' {
 if(scene.currentsComplete)return 'complete';const route=scene.geometry.routes.find(r=>r.id===routeId)!;
 return currentMoves({...scene,pieces:[...scene.pieces],crew:[...scene.crew],actors:[...scene.actors],fixtures:[...scene.fixtures]},route)===null?'waiting':'idle';
}
export function pupSceneStep(scene:CampaignScene,pup:Extract<CampaignActor,{kind:'pup'}>){return pupNextStep({...scene,pieces:[...scene.pieces],crew:[...scene.crew],actors:[...scene.actors],fixtures:[...scene.fixtures]},pup);}
export function pupVisualState(scene:CampaignScene,pup:Extract<CampaignActor,{kind:'pup'}>):'idle'|'waiting' {return pupSceneStep(scene,pup)?'idle':'waiting';}
export function pupSpriteLayout(tileSize:number,asset:typeof CAMPAIGN_ASSETS[number]){const width=tileSize*.88;return {width,height:width*asset.canvas.height/asset.canvas.width,pivot:asset.pivot};}
export function whaleVisualState(scene:CampaignScene,whale:Extract<CampaignActor,{kind:'moonwhale'}>):'idle'|'ready'|'waiting'|'complete' {
 if(!whale.passengerIds.length)return 'complete';
 if(!whale.transferRequested)return 'idle';
 return whaleLandingSafe({...scene,pieces:[...scene.pieces],crew:[...scene.crew],actors:[...scene.actors],fixtures:[...scene.fixtures]},whale)?'ready':'waiting';
}
export function whaleSpriteLayout(tileSize:number,asset:typeof CAMPAIGN_ASSETS[number]){const width=tileSize*1.12;return {width,height:width*asset.canvas.height/asset.canvas.width,pivot:asset.pivot};}
export function waveSpriteLayout(tileSize:number,asset:typeof CAMPAIGN_ASSETS[number]) {
 const width=tileSize*.82;
 return {width,height:width*asset.canvas.height/asset.canvas.width,pivot:asset.pivot};
}
export function waveVisualState(scene:CampaignScene):'scheduled'|'ready'|'waiting'|null {
 const wave=pendingWaves(scene.arrivals)[0];if(!wave)return null;
 return wave.turn>scene.turn?'scheduled':waveBlocked({geometry:scene.geometry,pieces:[...scene.pieces],crew:[...scene.crew],actors:[...scene.actors],fixtures:[...scene.fixtures]},wave,scene.activeCrewCap)?'waiting':'ready';
}
export function crewGroupLabel(group:readonly CampaignCrew[],riding=false):string {
 const needs=group.flatMap(c=>[...(c.rescueMoves===null?[]:[{count:c.rescueMoves,label:'O₂'}]),...(c.shelterMoves===null?[]:[{count:c.shelterMoves,label:'⌂'}])]).sort((a,b)=>a.count-b.count);
 const urgent=needs[0],need=urgent?`${urgent.label} ${urgent.count}`:'SAFE';
 if(riding&&!urgent)return group.length>1?`${group.length} RIDING`:'RIDING';
 return group.length>1?`${group.length} crew · ${need}`:need;
}
export function exitVisualState(scene:CampaignScene,exitId:string):'idle'|'waiting' {
 const exit=scene.geometry.endpoints.find(e=>e.id===exitId);
 if(!exit)return 'idle';
 const cargo=scene.pieces.filter(p=>p.kind==='cargo'&&p.destinationId===exitId);
 // Amber means an existing fixture blocks this descent lane, never a new exit rule.
 return cargo.some(p=>p.at.c===exit.at.c&&scene.fixtures.some(f=>(f.kind==='comet'?f.cells:[f.at]).some(at=>at.c===p.at.c&&at.r>p.at.r&&at.r<=exit.at.r)))?'waiting':'idle';
}
export function fixtureTexture(f:CampaignFixture,textures:TextureSet){
 switch(f.kind){case 'crate':return (f.hp<=1?textures.canisterCrumbling:f.hp===2?textures.canisterCracked:undefined)??textures.canisterOverlay;
  case 'ice':return textures.crystalOverlay;case 'reactor':return textures.reactorOverlay;case 'comet':return textures.cometOverlay;default:return undefined;}
}
export function fixtureLabel(f:CampaignFixture):string {
 switch(f.kind){case 'crate':case 'ice':case 'comet':return `${f.hp} hit${f.hp===1?'':'s'}`;case 'reactor':return `${f.fuse} turns · ${f.hp} hit${f.hp===1?'':'s'}`;
  case 'portal':return 'Portal';case 'bridge':return f.active?'OPEN · 2/2':`HINGE · ${f.hits}/2`;case 'gate':return f.open?'Open':'Closed';case 'phase-door':return f.closingPending?'WAIT TO CLOSE':f.open?'OPEN · CLOSE NEXT':'CLOSED · OPEN NEXT';
  case 'garden':return `GROW ${f.stage}/3`;case 'solar':return `T${f.tier} · ${f.charge}/${f.quota}`;case 'gravity-switch':return f.direction==='down'?'↓':'←';case 'relay':return `Relay ${f.order}`;case 'jelly':return 'Jelly';case 'lock':return 'Locked';}
}

export function shelterVisualState(crew:CampaignCrew):'waiting'|'calm'|'urgent'|'complete' {
 if(crew.status==='housed'||crew.status==='evacuated')return 'complete';
 if(!crew.shelterStarted)return 'waiting';
 const needs=[crew.rescueMoves,crew.shelterMoves].filter((n):n is number=>n!==null);
 return needs.some(n=>n<=5)?'urgent':'calm';
}
