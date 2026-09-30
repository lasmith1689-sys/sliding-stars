import {expect,it} from 'vitest';
import {Container} from 'pixi.js';
import {CampaignBoard} from '../../src/render/campaign/board';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {makeScene} from '../../src/render/campaign/snapshot';
import {dragFrame} from '../../src/input/campaignDrag';

it('tracks partial finger movement, carries crew and continues from the release position',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(1)!);
 const from={r:0,c:0},to={r:0,c:1};state.crew[0]!.at={...from};
 const scene=makeScene(state),a=scene.pieces.find(p=>p.at.r===0&&p.at.c===0)!,b=scene.pieces.find(p=>p.at.r===0&&p.at.c===1)!;
 const nodes=new Map([a.id,b.id,state.crew[0]!.id].map(id=>[id,new Container()]));
 const board=Object.assign(Object.create(CampaignBoard.prototype),{scene,layout:{tileSize:80,gap:4,originX:0,originY:0},nodes,dragPositions:new Map(),dragGeneration:0,cargoLabels:new Map(),dockMarkers:new Map(),reducedMotion:()=>false}) as CampaignBoard;
 const frame=dragFrame(state,from,21,3,84);expect(frame.progress).toBe(.25);expect(frame.to).toEqual(to);
 board.drag(from,to,frame.progress);
 expect(nodes.get(a.id)!.x).toBe(61);expect(nodes.get(b.id)!.x).toBe(103);expect(nodes.get(state.crew[0]!.id)!.x).toBe(61);
 expect(state.turn).toBe(0);expect(scene.entityPositions[a.id]).toEqual(from);
 const target=structuredClone(scene);Object.assign(target.entityPositions,{[a.id]:to,[b.id]:from,[state.crew[0]!.id]:to});
 board.interpolate(scene,target,.01,[]);expect(nodes.get(a.id)!.x).toBeGreaterThan(61);
 board.resetDrag(0);expect(nodes.get(a.id)!.x).toBe(40);expect(nodes.get(b.id)!.x).toBe(124);
});

it('clamps long drags to one neighbor, follows reversal, and refuses holes and cargo',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(1)!);
 expect(dragFrame(state,{r:0,c:0},300,10,84).progress).toBe(1);
 expect(dragFrame(state,{r:0,c:1},-21,2,84).to).toEqual({r:0,c:0});
 expect(dragFrame(state,{r:0,c:0},-21,0,84).movable).toBe(false);
 state.geometry.mask[0]![1]=false;
 expect(dragFrame(state,{r:0,c:0},42,0,84).progress).toBe(0);
});
