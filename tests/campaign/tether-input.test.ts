import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {actionBetween} from '../../src/input/campaign';
import {dragFrame} from '../../src/input/campaignDrag';
it('recognizes either tether harness end and previews the same rigid pair movement',()=>{
 const level=getAuthoredLessonLevel(31)!;level.id=881;level.chapter=18;delete level.metadata.failurePolicy;level.fixtures=[];level.crew=[{id:'one',at:{r:0,c:0},carrierId:'pair',status:'active',rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null},{id:'two',at:{r:0,c:1},carrierId:'pair',status:'active',rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null}];level.actors=[{id:'pair',kind:'tether',at:{r:0,c:0},offset:{r:0,c:1},passengerIds:['one','two'],released:false}];level.mechanics=[{id:'tethers',actorIds:['pair']}];level.goals=[{id:'release',type:'transferCreatures',eligible:{type:'ids',ids:['one','two']}}];
 const state=loadCampaignLevel(level);
 const expected={type:'translate',actorId:'pair',dr:1,dc:0};
 expect(actionBetween(state,{r:0,c:0},{r:1,c:0})).toEqual(expected);
 expect(actionBetween(state,{r:0,c:1},{r:1,c:1})).toEqual(expected);
 expect(dragFrame(state,{r:0,c:1},0,21,84)).toMatchObject({progress:.25,movable:true,to:{r:1,c:1}});
 state.geometry.mask[1]![0]=false;
 expect(dragFrame(state,{r:0,c:1},0,21,84)).toMatchObject({progress:0,movable:false});
});
