import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {createCampaignEngine,transition} from '../../../src/campaign/engine/turn';
import {createContext} from '../../../src/campaign/engine/context';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {parseCampaignLevel,parseCampaignState} from '../../../src/campaign/schema';
import {fallPieces,refillPieces} from '../../../src/campaign/engine/settle';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {gravityMerge} from '../fixtures/gravity';
import {validateCompatibility} from '../../../src/campaign/compatibility';
const level=()=>getAuthoredLessonLevel(615)!;
it('the searched familiar lesson needs both a portal crossing and real leftward rider transport',()=>{
 let s=loadCampaignLevel(level());const events=[];
 const disabled=createCampaignEngine(campaignModules.map(m=>m.id==='portals'?{...m,beforeRefill:undefined}:m));let without=disabled.loadCampaignLevel(level());
 for(const [index,action] of lessonTeachingActions[615]!.entries()){const result=transition(s,action);expect(transition(parseCampaignState(JSON.parse(JSON.stringify(s))),action)).toEqual(result);events.push(...result.events);
  if(index===0){const crossing=result.events.findIndex(e=>e.type==='portal'&&e.phase==='transferred'&&e.passengerIds.includes('crew-0'));expect(crossing).toBeGreaterThan(-1);expect(result.events.slice(crossing+1)).toContainEqual(expect.objectContaining({type:'move',entityId:'tile-2-0',from:{r:0,c:6},to:{r:0,c:5},passengerIds:['crew-0']}));}
  s=result.state;const no=disabled.transition(without,action);if(no.accepted)without=no.state;}
 const crossed=events.find(e=>e.type==='portal'&&e.phase==='transferred'&&e.passengerIds.includes('crew-0'))!;expect(crossed).toBeDefined();
 expect(events.some(e=>e.type==='move'&&e.passengerIds.includes('crew-0')&&e.from.r===e.to.r&&e.to.c<e.from.c&&e.from.c>=4)).toBe(true);
 expect(s.status).toBe('won');expect(without.status).not.toBe('won');
 console.info('615 rider events',JSON.stringify(events.filter(e=>e.type==='gravity'||e.type==='portal'&&e.passengerIds.length||e.type==='move'&&e.passengerIds.length)));
});
it.each(['down','left'] as const)('an empty receiver transfers before refill and discharges its rider %s without an ordinary source',direction=>{
 const c=createContext(loadCampaignLevel(level())),outside=structuredClone(c.state.geometry.gravitySegments.filter(s=>s.chamberId==='room'));
 if(direction==='left'){const merge=gravityMerge();merge.cells=[{r:0,c:4},{r:0,c:5},{r:0,c:6}];campaignModules.find(m=>m.id==='gravity')!.onMerge!(c,merge);}
 const portal=c.state.fixtures.find(f=>f.kind==='portal')!,segment=c.state.geometry.gravitySegments.find(s=>s.id===portal.segmentId)!;
 expect(segment.cells[0]).toEqual(portal.receiver);expect(segment.direction).toBe(direction);expect(c.state.geometry.refillSources.some(s=>s.segmentId===portal.segmentId)).toBe(false);
 c.state.pieces=c.state.pieces.filter(p=>!segment.cells.some(q=>q.r===p.at.r&&q.c===p.at.c));
 const rider=c.state.pieces.find(p=>p.id==='tile-2-0')!;expect(campaignModules.find(m=>m.id==='portals')!.beforeRefill!(c)).toBe(true);
 fallPieces(c);refillPieces(c);expect(rider.at).toEqual(segment.cells.at(-1));expect(c.state.crew[0]!.at).toEqual(rider.at);
 expect(c.state.geometry.gravitySegments.filter(s=>s.chamberId==='room')).toEqual(outside);
 expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
 const before=structuredClone(c.state),action=lessonTeachingActions[615]![0]!;expect(transition(parseCampaignState(JSON.parse(JSON.stringify(before))),action)).toEqual(transition(before,action));
});
it('occupied receiver waits without overwriting, while the other chamber topology stays unchanged',()=>{
 const c=createContext(loadCampaignLevel(level())),before=structuredClone(c.state.pieces);
 expect(campaignModules.find(m=>m.id==='portals')!.beforeRefill!(c)).toBe(false);expect(c.state.pieces).toEqual(before);expect(c.events).toContainEqual(expect.objectContaining({type:'portal',phase:'waiting'}));
});
it('rejects sourced, non-head, forged receiver and outside-chamber topology',()=>{
 const bad=level(),portal=bad.fixtures.find(f=>f.kind==='portal')!;bad.geometry.refillSources.push({id:'fake',at:portal.receiver,segmentId:portal.segmentId});expect(()=>parseCampaignLevel(bad)).toThrow(/source|refill/);
 for(const change of [(s:ReturnType<typeof loadCampaignLevel>)=>{const p=s.fixtures.find(f=>f.kind==='portal')!;p.segmentId='column-5-0'},(s:ReturnType<typeof loadCampaignLevel>)=>{s.geometry.gravitySegments.find(g=>g.chamberId==='room')!.cells.pop()},(s:ReturnType<typeof loadCampaignLevel>)=>{s.geometry.refillSources[0]!.id='forged-source'}]){const s=loadCampaignLevel(level());change(s);expect(()=>parseCampaignState(s)).toThrow();}
 const nonHead=level(),p=nonHead.fixtures.find(f=>f.kind==='portal')!;p.receiver={r:0,c:5};p.segmentId='column-5-0';nonHead.geometry.refillSources=nonHead.geometry.refillSources.filter(s=>s.segmentId!=='column-5-0');nonHead.geometry.refillSources.push({id:'restore',at:{r:0,c:6},segmentId:'column-6-0'});expect(()=>parseCampaignLevel(nonHead)).toThrow(/both gravity/);
});
it('retains explicit chamber bans and portal/current/actor-track exclusions',()=>{
 const l=level();l.geometry.routes.push({id:'bad-current',cells:[{r:1,c:4},{r:1,c:5}],loop:true});l.mechanics.push({id:'currents',routeIds:['bad-current']});expect(validateCompatibility(l).some(i=>i.message.includes('Gravity chambers'))).toBe(true);
 const phase=level();phase.fixtures.push({id:'door',kind:'phase-door',at:{r:1,c:4},open:true,closingPending:false});expect(validateCompatibility(phase).some(i=>i.message.includes('Gravity chambers'))).toBe(true);
 for(const kind of ['dock','tether'] as const){const l=level();l.actors.push(kind==='dock'?{id:'bad',kind,at:{r:1,c:4},routeId:'route',routeIndex:0,entrance:{r:1,c:5},endpointId:'end'}:{id:'bad',kind,at:{r:1,c:4},offset:{r:0,c:1},passengerIds:['a','b'],released:false});expect(validateCompatibility(l).some(i=>i.message.includes('Gravity chambers'))).toBe(true);}
 const tracked=level();tracked.geometry.routes.push({id:'track',cells:[{r:2,c:0},{r:2,c:1}],loop:false});tracked.actors.push({id:'rover',kind:'rover',at:{r:2,c:0},routeId:'track',routeIndex:0,passengerIds:[]});expect(validateCompatibility(tracked).some(i=>i.message.includes('Portals cannot overlap'))).toBe(true);
});
