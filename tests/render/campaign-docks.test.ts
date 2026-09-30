import {expect,it} from 'vitest';
import {Container,Sprite,Texture} from 'pixi.js';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {CampaignBoard} from '../../src/render/campaign/board';
import {makeScene} from '../../src/render/campaign/snapshot';
import {dockVisualState,dockSpriteLayout} from '../../src/render/campaign/mechanics';
import {CAMPAIGN_ASSETS} from '../../src/assets/campaign-manifest';
import {dockCoachCopy} from '../../src/ui/campaignCoach';
import {parseCampaignState} from '../../src/campaign/schema';

it.each([false,true])('keeps the rendered dock body and actual entrance marker on parallel tracks, reduced motion %s',reduced=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(756)!),before=makeScene(state);
 const result=transition(state,lessonTeachingActions[756]![0]!);
 expect(result.accepted).toBe(true);
 const after=makeScene(result.state),body=new Container(),sprite=new Sprite(Texture.WHITE),marker=new Container();
 body.addChild(sprite);body.position.set(40,124);marker.position.set(40,208);
 const board=Object.assign(Object.create(CampaignBoard.prototype),{
  layout:{tileSize:80,gap:4,originX:0,originY:0},nodes:new Map([['visiting-shuttle',body]]),
  dockMarkers:new Map([['visiting-shuttle',marker]]),cargoLabels:new Map(),textures:{campaign:{}},reducedMotion:()=>reduced,
 }) as CampaignBoard;
 board.interpolate(before,after,.5,[]);
 expect(board.renderedEntityPositions['visiting-shuttle']).toEqual({r:1,c:.875});
 expect(marker.position.x).toBe(113.5);expect(marker.position.y).toBe(208);
 expect(after.geometry.endpoints.find(e=>e.id==='shuttle-entrance')?.at).toEqual({r:2,c:1});
});
it('keeps shuttle body scale and pivot constant while the rule state selects art',()=>{
 const assets=['dock-cruising','dock-inviting','dock-waiting','dock-farewell'].map(id=>CAMPAIGN_ASSETS.find(a=>a.id===id)!);
 const layouts=assets.map(asset=>dockSpriteLayout(80,asset));
 expect(layouts.every(layout=>layout.width===layouts[0]!.width&&layout.height===layouts[0]!.height&&layout.pivot.x===layouts[0]!.pivot.x&&layout.pivot.y===layouts[0]!.pivot.y)).toBe(true);
 let state=loadCampaignLevel(getAuthoredLessonLevel(756)!);
 for(const action of lessonTeachingActions[756]!)state=transition(state,action).state;
 const scene=makeScene(state),dock=scene.actors.find(a=>a.kind==='dock')!;
 expect(dock.kind).toBe('dock');if(dock.kind!=='dock')return;
 expect(dockVisualState(scene,dock)).toBe('farewell');
});
it('attributes a dock win to boarding only when the boarded ledger covers the guests',()=>{
 let dockWin=loadCampaignLevel(getAuthoredLessonLevel(756)!);
 for(const action of lessonTeachingActions[756]!)dockWin=transition(dockWin,action).state;
 expect(dockWin.status).toBe('won');
 expect(dockCoachCopy(dockWin)).toContain('Every guest boarded');

 const ordinary=getAuthoredLessonLevel(756)!;
 ordinary.pieces=ordinary.pieces.map(piece=>piece.at.r===2&&piece.at.c===3?{id:piece.id,at:piece.at,kind:'station' as const,facing:'left' as const}:piece);
 ordinary.crew[0]!.at={r:2,c:1};
 const result=transition(loadCampaignLevel(ordinary),{type:'swap',from:{r:2,c:3},to:{r:2,c:2}});
 expect(result.accepted,result.rejection).toBe(true);expect(result.state.status).toBe('won');
 expect(result.state.mechanics.find(m=>m.id==='docks')).toMatchObject({boardedIds:[]});
 expect(result.events.some(event=>event.type==='dock'&&event.phase==='boarded')).toBe(false);
 expect(dockCoachCopy(result.state)).toContain('Mission complete');
 expect(dockCoachCopy(result.state)).not.toContain('boarded');
});
it('guides an active guest to the current entrance after the shuttle parks, not to a nonexistent next stop',()=>{
 const level=getAuthoredLessonLevel(756)!;
 level.crew[0]!.at={r:2,c:0};
 let state=loadCampaignLevel(level);
 for(const action of lessonTeachingActions[756]!)state=transition(state,action).state;
 expect(state.status).toBe('playing');
 expect(state.actors.find(actor=>actor.kind==='dock')).toMatchObject({routeIndex:3,entrance:{r:2,c:3}});
 expect(state.crew[0]).toMatchObject({at:{r:2,c:0},status:'active'});
 const restored=parseCampaignState(JSON.parse(JSON.stringify(state)));
 expect(dockCoachCopy(restored)).toContain('BOARD at row 3, column 4');
 expect(dockCoachCopy(restored)).not.toContain('next marked stop');
 const blocked=loadCampaignLevel(getAuthoredLessonLevel(757)!);
 expect(dockCoachCopy(blocked)).toContain('clear its next marked stop');
});
