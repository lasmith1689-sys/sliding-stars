import {expect,it} from 'vitest';
import {exitLevel,exitMove} from '../fixtures/exits';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {validateLevel} from '../../../src/campaign/schema';
it('departs the capsule before admitting a full-need wave into the freed ordinary entry',()=>{
 const l=exitLevel();l.id=150;l.chapter=3;
 l.arrivals=[{id:'wave-a',turn:1,entry:{r:1,c:0},status:'pending',crew:[{id:'guest',at:{r:1,c:0},status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:null}]}];l.mechanics.push({id:'waves',arrivalIds:['wave-a']});l.goals.push({id:'welcome',type:'homeCrew',eligible:{type:'sources',sourceIds:['wave-a'],target:1}});
 const s=loadCampaignLevel(l),r=transition(s,exitMove);
 expect(r.state.crew.find(c=>c.id==='passenger')!.status).toBe('evacuated');expect(r.state.status).toBe('playing');
 expect(r.state.arrivals[0]!.status).toBe('admitted');expect(r.state.crew.find(c=>c.id==='guest')).toMatchObject({at:{r:1,c:0},rescueMoves:20,carrierId:null});
 expect(r.events.findIndex(e=>e.type==='remove'&&e.reason==='departure')).toBeLessThan(r.events.findIndex(e=>e.type==='arrival'));
});
it('allows an optional unrelated future wave to remain pending after a valid final departure',()=>{
 const l=exitLevel();l.id=150;l.chapter=3;
 l.arrivals=[{id:'optional',turn:10,entry:{r:1,c:0},status:'pending',crew:[{id:'optional-guest',at:{r:1,c:0},status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:null}]}];l.mechanics.push({id:'waves',arrivalIds:['optional']});
 const r=transition(loadCampaignLevel(l),exitMove);expect(r.state.status).toBe('won');expect(r.state.arrivals[0]!.status).toBe('pending');expect(r.events.some(e=>e.type==='arrival')).toBe(false);
});
it('rejects wave crew attached to an exit capsule rather than independent scheduled guests',()=>{
 const l=exitLevel();l.id=150;l.chapter=3;l.arrivals=[{id:'invalid',turn:1,entry:{r:0,c:0},status:'pending',crew:[{...l.crew[0]!,id:'guest'}]}];l.mechanics.push({id:'waves',arrivalIds:['invalid']});
 expect(validateLevel(l).length).toBeGreaterThan(0);
});
