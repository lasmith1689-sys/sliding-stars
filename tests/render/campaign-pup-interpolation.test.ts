import {expect,it} from 'vitest';
import {Container,Sprite,Texture} from 'pixi.js';
import {CampaignBoard} from '../../src/render/campaign/board';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {makeScene} from '../../src/render/campaign/snapshot';
import {pupVisualState} from '../../src/render/campaign/mechanics';

it.each([false,true])('preserves a waiting pup during unrelated terrain interpolation (reduced motion %s)',reduced=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(231)!);
 for(const piece of state.pieces)if(piece.kind==='tile'&&piece.at.r===2&&piece.at.c===1)piece.tier=3;
 const scene=makeScene(state),pup=scene.actors.find(a=>a.kind==='pup')!;
 expect(pupVisualState(scene,pup as Extract<typeof pup,{kind:'pup'}>)).toBe('waiting');
 const node=new Container(),body=new Sprite(Texture.WHITE);node.addChild(body);
 body.rotation=reduced?0:.017;body.y=reduced?0:-.4;
 const before={texture:body.texture,rotation:body.rotation,y:body.y};
 // Exercise the real interpolation method with real Pixi nodes, without requiring a GPU/app.
 const board=Object.assign(Object.create(CampaignBoard.prototype),{
  layout:{tileSize:80,gap:4,originX:0,originY:0},nodes:new Map([[pup.id,node]]),cargoLabels:new Map(),dockMarkers:new Map(),
  textures:{campaign:{'pup-idle':Texture.EMPTY,'pup-walking':Texture.EMPTY,'pup-complete':Texture.EMPTY}},reducedMotion:()=>reduced,
 }) as CampaignBoard;
 board.interpolate(scene,scene,.125,[{type:'terrain',pieceId:'unrelated',at:{r:0,c:0},before:1,after:2,causeId:'merge',sequenceId:1,timingGroup:1}]);
 expect(body.texture).toBe(before.texture);
 expect(body.rotation).toBe(before.rotation);
 expect(body.y).toBe(before.y);
 expect(board.renderedEntityPositions[pup.id]).toEqual(pup.at);
 expect(node.scale.x).toBe(1);
});
