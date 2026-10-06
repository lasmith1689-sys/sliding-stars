import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {makeScene,applySceneEvents} from '../../src/render/campaign/snapshot';
import {currentVisualState} from '../../src/render/campaign/mechanics';
import {currentCoachCopy} from '../../src/ui/campaignCoach';
import {Container,Sprite,Texture} from 'pixi.js';
import {CampaignBoard} from '../../src/render/campaign/board';
it.each([false,true])('interpolates every cycle piece and rider together with reduced motion %s',reduced=>{
 const s=loadCampaignLevel(getAuthoredLessonLevel(276)!),initial=makeScene(s),r=transition(s,lessonTeachingActions[276]![0]!),current=r.events.find(e=>e.type==='current')!,before=applySceneEvents(initial,r.events.filter(e=>e.sequenceId<current.timingGroup)),group=r.events.filter(e=>e.timingGroup===current.timingGroup),after=applySceneEvents(before,group);
 const ids=group.flatMap(e=>e.type==='move'?[e.entityId]:[]),nodes=new Map(ids.map(id=>[id,new Container()])),arrow=new Sprite(Texture.WHITE);
 const board=Object.assign(Object.create(CampaignBoard.prototype),{layout:{tileSize:80,gap:4,originX:0,originY:0},nodes,cargoLabels:new Map(),dockMarkers:new Map(),currentSprites:new Map([['current-0',[arrow]]]),textures:{campaign:{'current-moving':Texture.EMPTY}},reducedMotion:()=>reduced}) as CampaignBoard;
 board.interpolate(before,after,.5,group);
 for(const id of ids){const a=before.entityPositions[id]!,b=after.entityPositions[id]!;expect(board.renderedEntityPositions[id]).toEqual({r:a.r+(b.r-a.r)*.875,c:a.c+(b.c-a.c)*.875});}
 expect(arrow.texture).toBe(Texture.EMPTY);expect(arrow.alpha).toBe(1);expect(before.crew[0]!.at).toEqual({r:2,c:0});
});
it('projects the synchronized closing edge, completion and fixed current route IDs',()=>{const s=loadCampaignLevel(getAuthoredLessonLevel(276)!),scene=makeScene(s),r=transition(s,lessonTeachingActions[276]![0]!);expect(currentVisualState(scene,'current-0')).toBe('idle');const shifted=r.events.find(e=>e.type==='current'&&e.phase==='shifted')!;expect(r.events.filter(e=>e.type==='move'&&e.timingGroup===shifted.timingGroup)).toHaveLength(3);const projected=applySceneEvents(scene,r.events);expect(projected.entityPositions).toEqual(makeScene(r.state).entityPositions);expect(projected.currentRouteIds).toEqual(['current-0']);expect(currentVisualState(projected,'current-0')).toBe('complete');});
it('uses the same station blockage for amber arrows and contextual coach',()=>{
 const s=loadCampaignLevel(getAuthoredLessonLevel(280)!),fixed=structuredClone(s.pieces.find(p=>p.kind==='station')!);
 const index=s.pieces.findIndex(p=>p.at.r===2&&p.at.c===1),piece=s.pieces[index]!;expect(piece.kind).toBe('tile');
 s.pieces[index]={id:piece.id,at:piece.at,kind:'station',facing:'left'};s.turn=1;
 expect(s.pieces.find(p=>p.id===fixed.id)).toEqual(fixed);expect(currentVisualState(makeScene(s),'current-0')).toBe('waiting');expect(currentCoachCopy(s)).toContain('Current waiting');
});
