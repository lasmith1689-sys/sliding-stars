import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {makeScene,applySceneEvents} from '../../src/render/campaign/snapshot';
import {pirateVisualState,pirateSceneStep} from '../../src/render/campaign/mechanics';
import {pirateCoachCopy} from '../../src/ui/campaignCoach';
import {CampaignInput} from '../../src/input/campaign';
import {Container,Sprite,Texture} from 'pixi.js';
import {CampaignBoard} from '../../src/render/campaign/board';
import {pirateLevel} from '../campaign/fixtures/pirates';
function pirateWithPilot(delivery=false){
 const level=pirateLevel();
 level.pieces[0]={id:'tile-0-0',kind:'pod',passengerIds:['pilot'],at:{r:0,c:0}};
 const index=delivery?2:5,at=level.pieces[index]!.at;
 level.pieces[index]={id:`tile-${at.r}-${at.c}`,kind:'station',facing:'left',at};
 level.crew=[{id:'pilot',at:{r:0,c:0},status:'active',carrierId:'tile-0-0',rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null}];
 return level;
}
it('homeCrew-only victory with a live drone uses mission copy without claiming parcel return',()=>{
 const l=pirateWithPilot(true);l.goals=[{id:'home',type:'homeCrew',eligible:{type:'ids',ids:['pilot']}}];
 const r=transition(loadCampaignLevel(l),{type:'swap',from:{r:0,c:0},to:{r:0,c:1}});expect(r.accepted,r.rejection).toBe(true);expect(r.state.status).toBe('won');expect(r.state.crew[0]).toMatchObject({at:{r:0,c:1},status:'housed'});expect(r.state.pieces.find(p=>p.kind==='station')).toEqual(l.pieces[2]);expect(r.state.actors[0]).toMatchObject({kind:'pirate',routeIndex:1,distraction:2});expect(pirateCoachCopy(r.state)).toBe('Mission complete! Your goal is met.');
});
it('move-limit loss before the dock uses mission copy without claiming dock arrival',()=>{
 const l=pirateWithPilot();l.moveLimit=1;
 const r=transition(loadCampaignLevel(l),{type:'swap',from:{r:0,c:0},to:{r:0,c:1}});expect(r.accepted).toBe(true);expect(r.state.status).toBe('lost');expect(r.state.actors[0]).toMatchObject({kind:'pirate',routeIndex:1,distraction:2});expect(pirateCoachCopy(r.state)).toBe('Mission ended. Try again right away; your credits and owned supplies are kept.');
});
it('actual dock-arrival loss retains the accurate pirate outcome wording',()=>{
 const l=pirateWithPilot();l.geometry.routes[0]!.cells=[{r:2,c:1},{r:2,c:2}];l.actors[0]!.at={r:2,c:1};
 const r=transition(loadCampaignLevel(l),{type:'swap',from:{r:0,c:0},to:{r:0,c:1}});expect(r.accepted,r.rejection).toBe(true);expect(r.state.status).toBe('lost');expect(r.state.actors[0]!.at).toEqual({r:2,c:2});expect(pirateCoachCopy(r.state)).toBe('The drone reached its dock. Try again right away; your credits and owned supplies are kept.');
});
it('previews distraction and returned parcel using the real immutable transition',()=>{let s=loadCampaignLevel(getAuthoredLessonLevel(326)!);for(const [i,a] of lessonTeachingActions[326]!.entries()){if(a.type!=='swap')throw Error();const before=structuredClone(s),input=new CampaignInput(()=>s,()=>false,()=>{});input.start(a.from);expect(input.preview(a.to)?.message).toContain(i?'Return the parcel':'One distraction point');expect(s).toEqual(before);s=transition(s,a).state;}});
it.each([326,327,328,329,330])('lesson %s projects one return to its dock and persists it through final scene',id=>{let s=loadCampaignLevel(getAuthoredLessonLevel(id)!);for(const a of lessonTeachingActions[id]!){const r=transition(s,a),projected=applySceneEvents(makeScene(s),r.events),actual=makeScene(r.state);expect(projected.entityPositions).toEqual(actual.entityPositions);expect(projected.actors).toEqual(actual.actors);expect(projected.returnedDockIds).toEqual(actual.returnedDockIds);s=r.state;}expect(makeScene(s).returnedDockIds).toEqual(['supply-dock']);expect(pirateCoachCopy(s)).toContain('Parcel returned');});
it('blocked and approaching-dock warnings have visible coaching with the exact next stop',()=>{const s=loadCampaignLevel(getAuthoredLessonLevel(327)!),p=s.actors[0]!;if(p.kind!=='pirate')throw Error();const next=pirateSceneStep(makeScene(s),p)!;Object.assign(s.pieces.find(t=>t.at.r===next.r&&t.at.c===next.c)!,{kind:'station',facing:'left'});expect(pirateVisualState(makeScene(s),p)).toBe('warning');expect(pirateCoachCopy(s)).toContain('Drone waiting');p.routeIndex=5;p.at={r:1,c:3};expect(pirateCoachCopy(s)).toContain('Dock next');s.level.id=326;s.level.metadata.failurePolicy='no-failure';expect(pirateCoachCopy(s)).toContain('Practice pause');});
it.each([false,true])('uses the returned art and moves its parcel only on its own typed event, reduced motion %s',reduced=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(326)!);s=transition(s,lessonTeachingActions[326]![0]!).state;const r=transition(s,lessonTeachingActions[326]![1]!),event=r.events.find(e=>e.type==='pirate'&&e.phase==='returned')!,scene=makeScene(s),node=new Container(),body=new Sprite(Texture.WHITE);node.addChild(body);const content=new Container(),parcels=new Map();
 const board=Object.assign(Object.create(CampaignBoard.prototype),{layout:{tileSize:80,gap:4,originX:0,originY:0},nodes:new Map([['pirate-0',node]]),cargoLabels:new Map(),dockMarkers:new Map(),returningParcels:parcels,content,textures:{campaign:{'pirate-returned':Texture.EMPTY}},reducedMotion:()=>reduced}) as CampaignBoard;
 board.interpolate(scene,scene,.5,[]);expect(body.texture).toBe(Texture.WHITE);expect(body.y).toBe(0);expect(parcels.size).toBe(0);
 board.interpolate(scene,applySceneEvents(scene,[event]),.5,[event]);expect(body.texture).toBe(Texture.EMPTY);expect(parcels.size).toBe(1);expect(body.y).toBe(reduced?0:-17.5);
});
