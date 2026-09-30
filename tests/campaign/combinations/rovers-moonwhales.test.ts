import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {parseCampaignState,validateLevel} from '../../../src/campaign/schema';
it('keeps ownership independent while the familiar rover rescues, then transfers the whale guest once',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(190)!);let transfers=0,roverHoused=false;
 expect(state.crew.find(c=>c.id==='crew-0')!.status).toBe('active');
 for(const action of lessonTeachingActions[190]!){const result=transition(state,action);expect(result.accepted).toBe(true);transfers+=result.events.filter(e=>e.type==='transfer'&&e.fromCarrierId==='moonwhale').length;roverHoused ||=result.state.crew.find(c=>c.id==='crew-0')!.status==='housed';
  const reload=parseCampaignState(JSON.parse(JSON.stringify(result.state)));expect(transition(reload,action)).toEqual(transition(result.state,action));state=reload;}
 expect(roverHoused).toBe(true);expect(transfers).toBe(1);expect(state.status).toBe('won');expect(state.crew.find(c=>c.id==='whale-guest')!.status).toBe('active');
});
it('rejects an authored portal on the whale track',()=>{
 const level=getAuthoredLessonLevel(187)!;level.id=376;level.chapter=8;level.metadata.failurePolicy=undefined;level.fixtures.push({id:'portal',kind:'portal',at:{r:1,c:1},receiver:{r:0,c:3},segmentId:'column-3-0'});level.mechanics.push({id:'portals',fixtureIds:['portal']});expect(validateLevel(level).some(i=>i.message.includes('Portals cannot overlap'))).toBe(true);
});
it('resolves a shared next cell by global actor ID, without a whale teleport or passenger overwrite',()=>{
 const l=getAuthoredLessonLevel(187)!,whale=l.actors[0]!;if(whale.kind!=='moonwhale')throw Error();whale.at={r:2,c:1};whale.routeIndex=2;l.crew[0]!.at={...whale.at};
 l.geometry.routes.push({id:'rover-path',loop:false,cells:[{r:3,c:0},{r:2,c:0}]});l.actors.push({id:'a-rover',kind:'rover',at:{r:3,c:0},routeId:'rover-path',routeIndex:0,passengerIds:['rover-guest']});l.crew.push({...l.crew[0]!,id:'rover-guest',at:{r:3,c:0},carrierId:'a-rover'});l.mechanics.push({id:'rovers',actorIds:['a-rover']});
 const result=transition(loadCampaignLevel(l),{type:'swap',from:{r:0,c:1},to:{r:1,c:1}});expect(result.accepted).toBe(true);
 expect(result.state.actors.find(a=>a.id==='a-rover')!.at).toEqual({r:2,c:0});expect(result.state.actors.find(a=>a.id==='moonwhale')!.at).toEqual({r:2,c:1});expect(result.state.crew.find(c=>c.id==='whale-guest')!.carrierId).toBe('moonwhale');expect(result.state.crew.find(c=>c.id==='rover-guest')!.carrierId).toBe('a-rover');
 expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
});
