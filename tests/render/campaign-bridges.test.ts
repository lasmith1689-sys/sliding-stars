import {expect,it,vi} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {makeScene,applySceneEvents} from '../../src/render/campaign/snapshot';
import {bridgeVisualState} from '../../src/render/campaign/mechanics';
import {CampaignAnimator} from '../../src/render/campaign/animator';
import {CampaignInput} from '../../src/input/campaign';
import {CampaignBoard} from '../../src/render/campaign/board';
import {Container,Sprite,Texture} from 'pixi.js';
it.each([426,427,428,429,430])('lesson %s projects geometry alongside every previous scene contract',id=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(id)!);
 for(const action of lessonTeachingActions[id]!){const r=transition(s,action),projected=applySceneEvents(makeScene(s),r.events),actual=makeScene(r.state);
  expect(projected.geometry).toEqual(actual.geometry);expect(projected.entityPositions).toEqual(actual.entityPositions);
  for(const key of ['portalsComplete','currentRouteIds','currentsComplete','departedExitIds','arrivedNurseryIds','returnedDockIds'] as const)expect(projected[key]).toEqual(actual[key]);s=r.state;
 }
});
it('folded and one-charge cues plus the opening preview are derived from real transitions',()=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(426)!);const f=s.fixtures[0]!;if(f.kind!=='bridge')throw Error();expect(bridgeVisualState(f)).toBe('folded');
 s=transition(s,lessonTeachingActions[426]![0]!).state;const charged=s.fixtures[0]!;if(charged.kind!=='bridge')throw Error();expect(bridgeVisualState(charged)).toBe('charged');
 const action=lessonTeachingActions[426]![1]!;if(action.type!=='swap')throw Error();const before=structuredClone(s),input=new CampaignInput(()=>s,()=>false,()=>{});input.start(action.from);expect(input.preview(action.to)?.message).toContain('Unfold');expect(s).toEqual(before);
});
it.each([false,true])('unfolding stays at each cell hinge and cancellation restores open geometry, reduced %s',reduced=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(426)!);s=transition(s,lessonTeachingActions[426]![0]!).state;const r=transition(s,lessonTeachingActions[426]![1]!),e=r.events.find(e=>e.type==='bridge'&&e.phase==='opened')!;
 const node=new Container(),panel=new Sprite(Texture.WHITE);panel.anchor.set(.5,.79);panel.position.set(40,110);const board=Object.assign(Object.create(CampaignBoard.prototype),{layout:{tileSize:80,gap:4,originX:0,originY:0},nodes:new Map([['bridge-0',node]]),bridgePanels:new Map([['bridge-0',[panel]]]),cargoLabels:new Map(),dockMarkers:new Map(),textures:{campaign:{'bridge-open':Texture.WHITE,'bridge-unfolding':Texture.EMPTY}},reducedMotion:()=>reduced}) as CampaignBoard;
 board.interpolate(makeScene(s),makeScene(r.state),.3,[e]);expect(panel.x).toBe(40);expect(panel.y).toBe(110);expect(panel.anchor.y).toBe(.79);expect(panel.alpha).toBeGreaterThan(0);expect(panel.texture).toBe(Texture.EMPTY);
 board.interpolate(makeScene(s),makeScene(r.state),1,[e]);expect(panel.texture).toBe(Texture.WHITE);expect(panel.x).toBe(40);expect(panel.y).toBe(110);
});
it.each([false,true])('interrupted activation presents the saved final geometry once, reduced %s',async reduced=>{
 vi.useFakeTimers();try{
  let s=loadCampaignLevel(getAuthoredLessonLevel(426)!);s=transition(s,lessonTeachingActions[426]![0]!).state;const r=transition(s,lessonTeachingActions[426]![1]!);let scene=makeScene(s);
  const animator=new CampaignAnimator({get scene(){return scene;},sync:s=>{scene=s;},interpolate:()=>{}},()=>reduced);const pending=animator.play(r.events,makeScene(r.state));animator.cancel();await pending;await vi.runAllTimersAsync();expect(scene).toEqual(makeScene(r.state));expect(scene.geometry.inactiveCells).toEqual([]);
 }finally{vi.useRealTimers();}
});
