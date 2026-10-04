import {Container,Graphics,Text,Texture} from 'pixi.js';
import {expect,it,vi} from 'vitest';
import type {CampaignScene} from '../../src/render/campaign/snapshot';
import {makeScene,applySceneEvents} from '../../src/render/campaign/snapshot';
import {CampaignBoard} from '../../src/render/campaign/board';
import {CampaignAnimator} from '../../src/render/campaign/animator';
import {relayVisualState,magnetVisualState,rendezvousPadState} from '../../src/render/campaign/mechanics';
import {addRelayBeacon,addMagnetWinch,addSupplyParcel,addRepairKit,addRepairBot,addTetherHarness,addRendezvousPad,markerPulse} from '../../src/render/campaign/specialMarkers';
import {relayCoachCopy,magnetCoachCopy,tetherCoachCopy,repairCoachCopy,rendezvousCoachCopy} from '../../src/ui/campaignCoach';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';

const newLessons=[376,377,378,379,380,841,842,843,844,845,881,882,883,884,885,921,922,923,924,925,961,962,963,964,965];
const entities=(list:readonly {id:string}[])=>Object.fromEntries(list.map(entity=>[entity.id,entity]));
it.each(newLessons)('projects every mission %s event to the canonical geometry, occupants and new mechanic cues',id=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(id)!),scene=makeScene(state);
 for(const action of lessonTeachingActions[id]!){
  const result=transition(state,action);expect(result.accepted,`mission ${id}, turn ${state.turn}: ${result.rejection??'accepted'}`).toBe(true);
  scene=applySceneEvents(scene,result.events);const actual=makeScene(result.state);
  expect(scene.geometry).toEqual(actual.geometry);expect(scene.entityPositions).toEqual(actual.entityPositions);
  for(const key of ['pieces','crew','actors','fixtures'] as const)expect(entities(scene[key])).toEqual(entities(actual[key]));
  for(const key of ['magnetDeliveredIds','rendezvous','departedExitIds','returnedDockIds','portalsComplete','currentsComplete'] as const)expect(scene[key]).toEqual(actual[key]);
  state=result.state;
 }
 expect(state.status).toBe('won');
});

/** Exercise real Pixi positions without requiring an app, browser, or GPU. */
function boardPose(scene:CampaignScene,reduced=false):CampaignBoard {
 const layout={tileSize:80,gap:4,originX:0,originY:0},nodes=new Map<string,Container>(),content=new Container();
 for(const [id,at] of Object.entries(scene.entityPositions)){const node=new Container();node.position.set(at.c*84+40,at.r*84+40);nodes.set(id,node);content.addChild(node);}
 return Object.assign(Object.create(CampaignBoard.prototype),{
  layout,scene,nodes,content,routes:new Graphics(),hints:new Graphics(),exitSprites:new Map(),bridgePanels:new Map(),
  cargoLabels:new Map(),dockMarkers:new Map(),mechanicMarkers:new Map(),repairSites:new Map(),rendezvousPads:new Map(),eventMarkers:new Map(),
  currentSprites:new Map(),dragPositions:new Map(),dragGeneration:0,moving:false,
  textures:{tile:{1:Texture.WHITE,2:Texture.WHITE,3:Texture.WHITE,4:Texture.WHITE,5:Texture.WHITE},campaign:{}},reducedMotion:()=>reduced,
 }) as CampaignBoard;
}
it.each([881,883])('dragging either end of mission %s keeps the harness offset and underlying terrain fixed',id=>{
 const scene=makeScene(loadCampaignLevel(getAuthoredLessonLevel(id)!)),actor=scene.actors.find(a=>a.kind==='tether')!;
 if(actor.kind!=='tether')throw Error('Expected tether');
 const saved=structuredClone(scene),first=scene.crew.find(c=>c.id===actor.passengerIds[0])!,second=scene.crew.find(c=>c.id===actor.passengerIds[1])!;
 const action=lessonTeachingActions[id]![0]!;if(action.type!=='translate')throw Error('Expected pair translation');
 for(const from of [first.at,second.at]){
  const board=boardPose(scene),to={r:from.r+action.dr,c:from.c+action.dc};board.drag(from,to,.25);
  for(const [entityId,at] of [[actor.id,actor.at],[first.id,first.at],[second.id,second.at]] as const){
   expect(board.renderedEntityPositions[entityId]).toEqual({r:at.r+action.dr*.25,c:at.c+action.dc*.25});
  }
  for(const piece of scene.pieces)expect(board.renderedEntityPositions[piece.id]).toEqual(piece.at);
  board.resetDrag(0);expect(board.renderedEntityPositions).toEqual(scene.entityPositions);
 }
 expect(scene).toEqual(saved);
});

it('shows only the next numbered relay and teaches the remaining real chain',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(841)!);
 const relays=state.fixtures.filter(f=>f.kind==='relay');
 expect(relays.map(relay=>relayVisualState(makeScene(state),relay))).toEqual(['next','waiting']);
 expect(relayCoachCopy(state)).toContain('NEXT beacon 1');
 state=transition(state,lessonTeachingActions[841]![0]!).state;
 expect(state.fixtures.filter(f=>f.kind==='relay').map(relay=>relayVisualState(makeScene(state),relay))).toEqual(['lit','next']);
 expect(relayCoachCopy(state)).toContain('NEXT beacon 2');
});
it('marks a full magnet destination as waiting and records supply delivery without inventing an exit departure',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(376)!),magnet=state.fixtures.find(f=>f.kind==='magnet')!;
 if(magnet.kind!=='magnet')throw Error('Expected magnet');
 expect(magnetVisualState(makeScene(state),magnet)).toBe('waiting');expect(magnetCoachCopy(state)).toContain('waiting');
 const result=transition(state,lessonTeachingActions[376]![0]!),scene=applySceneEvents(makeScene(state),result.events);
 expect(magnetVisualState(scene,magnet)).toBe('delivered');expect(scene.magnetDeliveredIds).toEqual([magnet.cargoId]);
 expect(scene.departedExitIds).toEqual([]);expect(scene).toMatchObject({rendezvous:null});
});
it('ready pads require their designated passenger aboard the correct shuttle',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(961)!);
 expect([0,1].map(index=>rendezvousPadState(makeScene(state),index))).toEqual(['waiting','waiting']);
 state=transition(state,lessonTeachingActions[961]![0]!).state;
 expect([0,1].map(index=>rendezvousPadState(makeScene(state),index))).toEqual(['ready','waiting']);
 expect(rendezvousCoachCopy(state)).toContain('SHIP 1 is ready at PAD 1');
 const wrong=structuredClone(state),pod=wrong.pieces.find(p=>p.kind==='pod'&&p.passengerIds.includes('depart-first'))!;
 if(pod.kind!=='pod')throw Error('Expected pod');pod.passengerIds=['depart-second'];
 expect(rendezvousPadState(makeScene(wrong),0)).toBe('waiting');
 state=transition(state,lessonTeachingActions[961]![1]!).state;
 expect([0,1].map(index=>rendezvousPadState(makeScene(state),index))).toEqual(['departed','departed']);
});
it('keeps repair collection and tether release instructions tied to actual occupant state',()=>{
 let repair=loadCampaignLevel(getAuthoredLessonLevel(921)!);expect(repairCoachCopy(repair)).toContain('Match below KIT 1');
 repair=transition(repair,lessonTeachingActions[921]![0]!).state;expect(repairCoachCopy(repair)).toContain('Kit aboard!');
 let tether=loadCampaignLevel(getAuthoredLessonLevel(881)!);expect(tetherCoachCopy(tether)).toContain('either gold harness');
 for(const action of lessonTeachingActions[881]!)tether=transition(tether,action).state;
 expect(tetherCoachCopy(tether)).toContain('reached safe terrain together');
});

it.each([false,true])('animates the final magnetic pull to its actual dock rather than dropping at its start, reduced %s',reduced=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(376)!),result=transition(state,lessonTeachingActions[376]![0]!),event=result.events.find(e=>e.type==='magnet'&&e.phase==='delivered')!;
 if(event.type!=='magnet')throw Error('Expected magnet delivery');
 const board=boardPose(makeScene(state),reduced),pose=board as unknown as {nodes:Map<string,Container>;mechanicMarkers:Map<string,Container>;cargoLabels:Map<string,Container>};
 const winch=addMagnetWinch(pose.nodes.get(event.magnetId)!,80);pose.mechanicMarkers.set(event.magnetId,winch);
 const label=new Container();label.label='cargo-centered';pose.cargoLabels.set(event.cargoId,label);
 board.interpolate(makeScene(state),makeScene(result.state),.5,[event]);expect(winch.scale.x).toBeCloseTo(reduced?1:1.09);
 board.interpolate(makeScene(state),makeScene(result.state),1,[event]);
 expect(board.renderedEntityPositions[event.cargoId]).toEqual(event.to);
 expect(label.x).toBe(pose.nodes.get(event.cargoId)!.x);expect(label.y).toBe(pose.nodes.get(event.cargoId)!.y);
 expect(pose.nodes.get(event.cargoId)!.alpha).toBe(0);
});
it.each([false,true])('canceling a paired departure restores its saved departed state exactly, reduced %s',async reduced=>{
 vi.useFakeTimers();try{
  const start=loadCampaignLevel(getAuthoredLessonLevel(961)!),first=transition(start,lessonTeachingActions[961]![0]!),result=transition(first.state,lessonTeachingActions[961]![1]!);
  let scene=makeScene(first.state);const final=makeScene(result.state),frames:number[]=[];
  const animator=new CampaignAnimator({get scene(){return scene;},sync:s=>{scene=s;},interpolate:(_from,_to,progress)=>{frames.push(progress);}},()=>reduced);
  const pending=animator.play(result.events,final);await vi.advanceTimersByTimeAsync(48);animator.cancel();await pending;await vi.runAllTimersAsync();
  expect(frames.length).toBeGreaterThan(1);expect(scene).toEqual(final);expect(scene.rendezvous?.departed).toBe(true);
  expect(scene.pieces.some(p=>p.kind==='pod')).toBe(false);expect(scene.crew.every(c=>c.status==='evacuated')).toBe(true);
 }finally{vi.useRealTimers();}
});

it.each([40,80])('keeps original mechanic silhouettes and numbers readable at tile size %s',ts=>{
 const parent=new Container(),beacon=addRelayBeacon(parent,2,'next',ts),bot=addRepairBot(parent,ts,true);
 const markers=[beacon,bot,addMagnetWinch(parent,ts),addSupplyParcel(parent,ts),addRepairKit(parent,ts)];
 for(const marker of markers){const body=marker.children.find(child=>child instanceof Graphics)!;
  expect(body.getBounds().width).toBeGreaterThan(ts*.25);expect(body.getBounds().width).toBeLessThan(ts*.8);
  expect(body.getBounds().height).toBeGreaterThan(ts*.25);expect(body.getBounds().height).toBeLessThan(ts*.9);
 }
 const number=beacon.children.find(child=>child.label==='relay-number') as Text;expect(number.text).toBe('2');expect(Number(number.style.fontSize)).toBeGreaterThanOrEqual(9);
 expect(bot.children.some(child=>child.label==='repair-carried-kit')).toBe(true);
 const pad=addRendezvousPad(parent,1,'ready',ts),label=pad.children.find(child=>child.label==='rendezvous-pad-caption') as Text;
 expect(label.text).toBe('1 READY');expect(Number(label.style.fontSize)).toBeGreaterThanOrEqual(9);
 for(const offset of [{r:0,c:1},{r:1,c:0}]){const harness=addTetherHarness(parent,offset,ts,ts*.04),rope=harness.children.find(child=>child.label==='tether-rope')!;
  expect(Math.max(rope.getBounds().width,rope.getBounds().height)).toBeGreaterThan(ts*1.5);
  expect(Math.max(rope.getBounds().width,rope.getBounds().height)).toBeLessThan(ts*2);
 }
 markerPulse(beacon,.5,true);expect(beacon.scale.x).toBe(1);markerPulse(beacon,.5,false);expect(beacon.scale.x).toBeCloseTo(1.09);
});
