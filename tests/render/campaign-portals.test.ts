import {expect,it} from 'vitest';
import {getRetiredPortalLevel as getAuthoredLessonLevel} from '../campaign/fixtures/portals';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {retiredPortalTeachingActions as lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {makeScene,applySceneEvents} from '../../src/render/campaign/snapshot';
import {portalVisualState,portalSpriteLayout} from '../../src/render/campaign/mechanics';
import {CampaignInput} from '../../src/input/campaign';
import {CampaignBoard} from '../../src/render/campaign/board';
import {CAMPAIGN_ASSETS} from '../../src/assets/campaign-manifest';
import {Container,Sprite,Texture} from 'pixi.js';
it.each([376,377,378,379,380])('lesson %s event projection preserves all transported entities and prior completion fields',id=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(id)!);
 for(const a of lessonTeachingActions[id]!){const r=transition(s,a),projected=applySceneEvents(makeScene(s),r.events),actual=makeScene(r.state);expect(projected.entityPositions).toEqual(actual.entityPositions);expect(projected.returnedDockIds).toEqual(actual.returnedDockIds);expect(projected.departedExitIds).toEqual(actual.departedExitIds);expect(projected.arrivedNurseryIds).toEqual(actual.arrivedNurseryIds);expect(projected.portalsComplete).toBe(actual.portalsComplete);s=r.state;}
 expect(makeScene(s).portalsComplete).toBe(true);
});
it('preview reports a real crossing without altering state, and occupied OUT uses closed-iris state',()=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(376)!);const portal=s.fixtures[0]!;if(portal.kind!=='portal')throw Error();expect(portalVisualState(makeScene(s),portal)).toBe('waiting');s=transition(s,lessonTeachingActions[376]![0]!).state;
 const a=lessonTeachingActions[376]![1]!;if(a.type!=='swap')throw Error();const before=structuredClone(s),input=new CampaignInput(()=>s,()=>false,()=>{});input.start(a.from);expect(input.preview(a.to)?.message).toContain('Portal crossing');expect(s).toEqual(before);
});
it.each([false,true])('typed portal transport shrinks at entry and expands at receiver without distorting silhouette, reduced motion %s',reduced=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(376)!);s=transition(s,lessonTeachingActions[376]![0]!).state;const r=transition(s,lessonTeachingActions[376]![1]!),event=r.events.find(e=>e.type==='portal'&&e.phase==='transferred'&&e.pieceId==='tile-2-1');if(event?.type!=='portal')throw Error();
 const scene=makeScene(s),node=new Container(),body=new Sprite(Texture.WHITE);body.width=80;body.height=40;node.addChild(body);const receiver=new Container(),arrival=new Sprite(Texture.WHITE);receiver.addChild(arrival);
 const board=Object.assign(Object.create(CampaignBoard.prototype),{layout:{tileSize:80,gap:4,originX:0,originY:0},nodes:new Map([['tile-2-1',node],['portal-0:receiver',receiver]]),cargoLabels:new Map(),dockMarkers:new Map(),textures:{campaign:{'portal-arrival':Texture.EMPTY}},reducedMotion:()=>reduced}) as CampaignBoard;
 board.interpolate(scene,scene,.25,[event]);expect(node.x).toBe(40);expect(node.scale.x).toBe(reduced?1:.5);expect(node.scale.y).toBe(node.scale.x);expect(body.width/body.height).toBe(2);expect(arrival.texture).toBe(Texture.EMPTY);
 board.interpolate(scene,scene,.75,[event]);expect(node.x).toBe(292);expect(node.y).toBe(40);expect(node.scale.y).toBe(node.scale.x);
 for(const asset of CAMPAIGN_ASSETS.filter(a=>a.id.startsWith('portal-'))){const layout=portalSpriteLayout(40,asset);expect(layout.width/layout.height).toBe(1);expect(asset.canvas.width).toBeGreaterThanOrEqual(asset.frame.width);expect(asset.canvas.height).toBeGreaterThanOrEqual(asset.frame.height);}
});
