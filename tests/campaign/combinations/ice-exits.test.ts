import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {parseCampaignState,validateLevel} from '../../../src/campaign/schema';
import {exitLevel} from '../fixtures/exits';
it('ice holds the cargo until an adjacent match thaws the lane, then gravity delivers atomically',()=>{
 const level=getAuthoredLessonLevel(115)!;
 let state=loadCampaignLevel(level);expect(state.pieces.find(p=>p.id==='capsule-0')!.at).toEqual({r:0,c:0});
 const actions=[{type:'swap' as const,from:{r:2,c:1},to:{r:2,c:2}},{type:'swap' as const,from:{r:3,c:0},to:{r:3,c:1}},{type:'swap' as const,from:{r:2,c:2},to:{r:3,c:2}}];
 let thawed=false,descended=false;
 for(const action of actions){
  const result=transition(state,action);expect(result.accepted).toBe(true);
  for(const event of result.events){
   if(event.type==='fixture'&&event.fixtureId==='exit-ice'&&event.after===null)thawed=true;
   if(event.type==='move'&&event.entityId==='capsule-0'){expect(thawed).toBe(true);descended=true;}
  }
  const reload=parseCampaignState(JSON.parse(JSON.stringify(result.state)));expect(transition(reload,action)).toEqual(transition(result.state,action));state=reload;
 }
 expect(descended).toBe(true);expect(state.status).toBe('won');expect(state.crew[0]).toMatchObject({status:'evacuated',carrierId:null,rescueMoves:null});
});
it('a rejected frozen swap does not depart, thaw, or tick a capsule passenger',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(115)!),result=transition(state,{type:'swap',from:{r:1,c:0},to:{r:1,c:1}});expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
});
it('rejects jelly on an exit through the static compatibility boundary',()=>{
 const level=exitLevel();level.id=711;level.chapter=15;level.fixtures.push({id:'jelly',kind:'jelly',at:{r:1,c:0},coatedCells:[{r:1,c:0}],preview:null});level.mechanics.push({id:'jelly',fixtureIds:['jelly']});
 expect(validateLevel(level).some(i=>i.message.includes('Jelly requires'))).toBe(true);
});
