import {expect,it} from 'vitest';
import {pupLevel} from '../fixtures/pups';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {createContext} from '../../../src/campaign/engine/context';
import {stepActors} from '../../../src/campaign/engine/actors';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {parseCampaignState,validateLevel} from '../../../src/campaign/schema';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {transition} from '../../../src/campaign/engine/turn';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
it('a rover blocks the safe nursery path; stable rover movement frees it in the same actor phase',()=>{
 const l=pupLevel();l.actors[0]!.id='z-pup';l.mechanics=[{id:'pups',actorIds:['z-pup']},{id:'rovers',actorIds:['a-rover']}];l.goals[0]!.eligible={type:'ids',ids:['z-pup']};l.geometry.routes=[{id:'track',cells:[{r:1,c:2},{r:1,c:3}],loop:false}];l.actors.push({id:'a-rover',kind:'rover',at:{r:1,c:2},routeId:'track',routeIndex:0,passengerIds:['rider']});l.crew=[{id:'rider',at:{r:1,c:2},status:'active',carrierId:'a-rover',rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null}];
 const c=createContext(loadCampaignLevel(l));for(const p of c.state.pieces)if(p.kind==='tile'&&!((p.at.c===2&&p.at.r<3)||(p.at.r===2&&p.at.c<2)||(p.at.r===1&&p.at.c===3)))p.tier=3;
 const pupModule=campaignModules.find(m=>m.id==='pups')!;pupModule.stepActor!(c,'z-pup');expect(c.state.actors[0]!.at).toEqual({r:2,c:0});c.events=[];
 stepActors(c,campaignModules,['z-pup','a-rover']);expect(c.state.actors.find(a=>a.id==='a-rover')!.at).toEqual({r:1,c:3});expect(c.state.actors.find(a=>a.id==='z-pup')!.at).toEqual({r:2,c:1});expect(c.state.crew[0]!.at).toEqual({r:1,c:3});expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
});
it('the committed prerequisite combination completes both unique goals through real play and reload',()=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(235)!);for(const a of lessonTeachingActions[235]!){const r=transition(s,a);expect(r.accepted).toBe(true);s=parseCampaignState(JSON.parse(JSON.stringify(r.state)));}expect(s.status).toBe('won');expect(s.goalProgress).toContainEqual({goalId:'pups',completedIds:['pup-0']});expect(s.goalProgress).toContainEqual({goalId:'home',completedIds:['crew-0']});
});
it('rejects a pup sharing a blocking prerequisite fixture cell',()=>{const l=pupLevel();l.fixtures=[{id:'ice',kind:'ice',at:l.actors[0]!.at,hp:1}];l.mechanics.push({id:'ice',fixtureIds:['ice']});expect(validateLevel(l).some(i=>i.message.includes('blocking fixture'))).toBe(true);});
