import {it,expect} from 'vitest';
import {CampaignInput,directionHint} from '../../src/input/campaign';
import {CampaignSession,createCampaignSave} from '../../src/session/campaignSession';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
it('cancels a gesture on resize/background; duplicate release and locked input never dispatch twice',()=>{
 const storage={getItem:()=>null,setItem:()=>{}};const session=new CampaignSession(createCampaignSave(getAuthoredLessonLevel(2)!),storage);
 let dispatches=0;const input=new CampaignInput(()=>session.save.active.kind==='campaign'?session.save.active.state:undefined,()=>session.locked,a=>{dispatches++;session.dispatch(a);});
 input.start({r:2,c:1});input.cancel();input.end({r:3,c:1});expect(dispatches).toBe(0);
 input.start({r:2,c:1});input.end({r:3,c:1});input.end({r:3,c:1});expect(dispatches).toBe(1);expect(session.locked).toBe(true);
 input.start({r:5,c:1});input.end({r:5,c:2});expect(dispatches).toBe(1);
 session.finishPresentation();input.start({r:5,c:1});input.end({r:5,c:2});expect(dispatches).toBe(2);
});
it('derives the first lesson word and arrow from the same action',()=>{
 expect(directionHint({type:'swap',from:{r:2,c:0},to:{r:2,c:1}})).toEqual({word:'RIGHT',arrow:'→'});
});
it('preference changes are a distinct durable revision; retry persistence does not advance it',()=>{
 const values=new Map<string,string>();const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const session=new CampaignSession(createCampaignSave(getAuthoredLessonLevel(1)!),storage);session.persist();session.updatePreferences({reducedMotion:true});
 expect(session.save.revision).toBe(1);expect(session.save.preferences.reducedMotion).toBe(true);expect(session.saveError).toBeNull();session.persist();expect(session.save.revision).toBe(1);
});
