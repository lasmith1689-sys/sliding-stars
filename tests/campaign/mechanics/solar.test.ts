import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {resolveCrewSafety} from '../../../src/campaign/engine/needs';
import {parseCampaignState} from '../../../src/campaign/schema';
import {createContext} from '../../../src/campaign/engine/context';
import type {CampaignEvent} from '../../../src/campaign/types';
import {campaignModules} from '../../../src/campaign/mechanics/registry';

function fixture(){
 const level=getAuthoredLessonLevel(56)!;
 level.id=661;level.chapter=14;level.lessonId='lesson-661';level.fixtures=[{id:'collector',kind:'solar',at:{r:1,c:1},tier:2,quota:2,charge:0,endpointId:'solar-home'}];
 level.geometry.endpoints=[{id:'solar-home',kind:'station',at:{r:1,c:0},active:false}];
 level.mechanics=[{id:'solar',fixtureIds:['collector']}];
 level.goals=[{id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:['collector']}}];
 level.crew=[];
 return level;
}
function merge(id:string,before:1|2|3=2,cells=[{r:1,c:0},{r:2,c:0},{r:2,c:1}]):Extract<CampaignEvent,{type:'merge'}>{
 return {type:'merge',sequenceId:0,timingGroup:0,mergeId:id,pieceIds:cells.map((_,i)=>`p${i}`),cells,at:cells[0]!,before,after:(before+1) as 2|3|4};
}
it('only distinct adjacent merges of the requested tier charge, and a large merge is one charge',()=>{
 const state=loadCampaignLevel(fixture()),context=createContext(state),solar=campaignModules.find(m=>m.id==='solar');
 expect(solar).toBeDefined();
 solar!.onMerge!(context,merge('wrong',1));expect(context.state.fixtures[0]).toMatchObject({charge:0});
 solar!.onMerge!(context,merge('far',2,[{r:0,c:2},{r:0,c:3},{r:0,c:4}]));expect(context.state.fixtures[0]).toMatchObject({charge:0});
 const large=merge('large',2,[{r:1,c:0},{r:2,c:0},{r:2,c:1},{r:2,c:2},{r:1,c:2}]);
 solar!.onMerge!(context,large);solar!.onMerge!(context,large);expect(context.state.fixtures[0]).toMatchObject({charge:1});
 expect(parseCampaignState(JSON.parse(JSON.stringify(context.state)))).toEqual(context.state);
 solar!.onMerge!(context,merge('next'));expect(context.state.fixtures[0]).toMatchObject({charge:2});
 expect(context.state.geometry.endpoints[0]).toMatchObject({active:true});
 expect(context.state.goalProgress[0]!.completedIds).toEqual(['collector']);
 expect(context.events.filter(e=>e.type==='solar'&&e.phase==='activated')).toHaveLength(1);
});
it('a ready collector remains active after reload and rescues a guest at its entrance',()=>{
 const level=fixture();level.fixtures[0]={id:'collector',kind:'solar',at:{r:1,c:1},tier:2,quota:1,charge:0,endpointId:'solar-home'};
 level.crew=[{id:'guest',at:{r:1,c:0},status:'active',carrierId:null,rescueMoves:5,shelterMoves:null,shelterStarted:false,vipId:null}];
 level.goals=[{id:'home',type:'homeCrew',eligible:{type:'ids',ids:['guest']}}];
 let state=loadCampaignLevel(level);expect(state.crew[0]!.status).toBe('active');
 const solar=campaignModules.find(m=>m.id==='solar')!;const context=createContext(state);solar.onMerge!(context,merge('charge'));
 state=parseCampaignState(JSON.parse(JSON.stringify(context.state)));
 const restored=createContext(state);expect(resolveCrewSafety(restored)).toBe(true);
 expect(restored.state.crew[0]!.status).toBe('housed');
 expect(restored.state.fixtures[0]).toMatchObject({charge:1});
 expect(parseCampaignState(JSON.parse(JSON.stringify(restored.state)))).toEqual(restored.state);
});
