import {expect,it} from 'vitest';
import {pupLevel} from '../fixtures/pups';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {createContext} from '../../../src/campaign/engine/context';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {parseCampaignState} from '../../../src/campaign/schema';
import {transition} from '../../../src/campaign/engine/turn';
import {stepActors} from '../../../src/campaign/engine/actors';
import {CampaignSession,createCampaignSave} from '../../../src/session/campaignSession';
import {MemoryStorage} from '../../session/fixtures/legacy';
import {loadSave} from '../../../src/session/storage';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
const module=()=>campaignModules.find(m=>m.id==='pups')!;
it('takes one shortest safe step with explicit row/column tie break',()=>{const c=createContext(loadCampaignLevel(pupLevel()));module().stepActor!(c,'pup');expect(c.state.actors[0]!.at).toEqual({r:1,c:0});expect(c.events.filter(e=>e.type==='move'&&e.entityId==='pup')).toHaveLength(1);});
it.each(['unsafe','pod','station','crew','fixture','actor','inactive'] as const)('waits when the nursery is blocked by %s',kind=>{const l=pupLevel(),at=l.geometry.endpoints[0]!.at;const c=createContext(loadCampaignLevel(l));const p=c.state.pieces.find(p=>p.at.r===at.r&&p.at.c===at.c)!;
 if(kind==='unsafe')Object.assign(p,{tier:3});if(kind==='pod')Object.assign(p,{kind:'pod',passengerIds:[]});if(kind==='station')Object.assign(p,{kind:'station',facing:'left'});if(kind==='crew')c.state.crew=[{id:'guest',at,status:'active',carrierId:null,rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null}];if(kind==='fixture')c.state.fixtures=[{id:'ice',kind:'ice',at,hp:1}];if(kind==='actor')c.state.actors.push({id:'other',kind:'pup',at,nurseryId:'nursery'});if(kind==='inactive')c.state.geometry.inactiveCells.push(at);
 module().stepActor!(c,'pup');expect(c.state.actors[0]!.at).toEqual({r:2,c:0});expect(c.events).toEqual([]);
});
it('rejects an unsafe shortcut but can leave an unsafe origin',()=>{const c=createContext(loadCampaignLevel(pupLevel()));for(const at of [{r:2,c:0},{r:1,c:0}]){const p=c.state.pieces.find(p=>p.at.r===at.r&&p.at.c===at.c)!;if(p.kind==='tile')p.tier=3;}module().stepActor!(c,'pup');expect(c.state.actors[0]!.at).toEqual({r:2,c:1});});
it('arrives once, removes the actor, and only credits the creature goal with schema-valid reload',()=>{const l=pupLevel();l.actors[0]!.at={r:0,c:1};l.crew=[{id:'guest',at:{r:3,c:3},status:'active',carrierId:null,rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null}];l.goals.push({id:'home',type:'homeCrew',eligible:{type:'ids',ids:['guest']}});const c=createContext(loadCampaignLevel(l));module().stepActor!(c,'pup');expect(c.state.actors).toEqual([]);expect(c.state.goalProgress).toEqual([{goalId:'pups',completedIds:['pup']},{goalId:'home',completedIds:[]}]);expect(c.state.mechanics).toContainEqual({id:'pups',arrivedIds:['pup']});module().stepActor!(c,'pup');expect(c.events.filter(e=>e.type==='goal')).toHaveLength(1);expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);});
it('takes exactly one kernel step after each accepted ticking move, never after rejection or booster',()=>{
 const s=loadCampaignLevel(getAuthoredLessonLevel(231)!),action=lessonTeachingActions[231]![0]!,r=transition(s,action);expect(r.accepted).toBe(true);expect(r.state.turn).toBe(1);expect(r.events.filter(e=>e.type==='move'&&e.entityId==='pup-0')).toHaveLength(1);
 const reject=transition(s,{type:'swap',from:{r:0,c:0},to:{r:2,c:0}});expect(reject.accepted).toBe(false);expect(reject.state).toBe(s);expect(reject.events).toEqual([]);
 const boosted=transition(s,{type:'booster',kind:'demo',at:{r:0,c:2}});expect(boosted.accepted).toBe(true);expect(boosted.state.actors).toEqual(s.actors);expect(boosted.state.turn).toBe(0);
});
it('uses stable global IDs when two actors compete, and cannot step a processed ID twice',()=>{
 const l=pupLevel();l.actors=[{id:'z',kind:'pup',at:{r:2,c:1},nurseryId:'nursery'},{id:'a',kind:'pup',at:{r:3,c:2},nurseryId:'nursery'}];l.mechanics=[{id:'pups',actorIds:['z','a']}];l.goals[0]!.eligible={type:'ids',ids:['z','a']};
 const c=createContext(loadCampaignLevel(l));for(const p of c.state.pieces)if(p.kind==='tile'&&!((p.at.r===2&&p.at.c===2)||(p.at.r===1&&p.at.c===2)||(p.at.r===0&&p.at.c===2)))p.tier=3;
 stepActors(c,[module()],['z','a']);expect(c.state.actors.find(a=>a.id==='a')!.at).toEqual({r:2,c:2});expect(c.state.actors.find(a=>a.id==='z')!.at).toEqual({r:2,c:1});expect(c.events.filter(e=>e.type==='move')).toHaveLength(1);stepActors(c,[module()],['z','a']);expect(c.events.filter(e=>e.type==='move')).toHaveLength(1);
});
it('retains a waiting safe-path decision through saved reload and finishes the same real play',()=>{
 const store=new MemoryStorage(),session=new CampaignSession(createCampaignSave(getAuthoredLessonLevel(233)!),store),actions=lessonTeachingActions[233]!;const first=session.dispatch(actions[0]!)!;expect(first.accepted).toBe(true);session.finishPresentation();
 const reload=new CampaignSession(loadSave(store)!,store);reload.finishPresentation();for(const action of actions.slice(1)){expect(reload.dispatch(action)).toEqual(session.dispatch(action));session.finishPresentation();reload.finishPresentation();}
 if(reload.save.active.kind!=='campaign')throw Error();expect(reload.save.active.state.status).toBe('won');expect(reload.save.active.state.mechanics).toContainEqual({id:'pups',arrivedIds:['pup-0']});expect(reload.save.active.state.actors).toEqual([]);
});
it('validates inactive or non-nursery destinations and excludes completed actor IDs of another kind',()=>{
 const l=pupLevel();l.geometry.endpoints[0]!.active=false;expect(()=>loadCampaignLevel(l)).toThrow(/active nursery/);l.geometry.endpoints[0]!.active=true;l.geometry.endpoints[0]!.kind='station';expect(()=>loadCampaignLevel(l)).toThrow(/wrong endpoint kind/);
 const s=loadCampaignLevel(pupLevel());s.mechanics[0]={id:'pups',arrivedIds:['piece-0-0']};expect(()=>parseCampaignState(s)).toThrow(/bad reference/);
});
