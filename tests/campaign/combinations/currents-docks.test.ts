import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {parseCampaignLevel,parseCampaignState} from '../../../src/campaign/schema';

it('a current carries an unboarded guest while the dock moves its independent entrance, then exact alignment boards',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(760)!);
 expect(state.crew[0]).toMatchObject({at:{r:2,c:4},status:'active'});
 const [advance,align]=lessonTeachingActions[760]!;
 const first=transition(state,advance!);
 expect(first.accepted).toBe(true);
 expect(first.events).toContainEqual(expect.objectContaining({type:'current',phase:'shifted'}));
 expect(first.events).toContainEqual(expect.objectContaining({type:'dock',phase:'moving'}));
 expect(first.events.some(e=>e.type==='dock'&&e.phase==='boarded')).toBe(false);
 state=parseCampaignState(JSON.parse(JSON.stringify(first.state)));
 expect(state.crew[0]).toMatchObject({at:{r:2,c:3},status:'active'});
 expect(state.actors.find(a=>a.kind==='dock')).toMatchObject({at:{r:1,c:1},entrance:{r:2,c:1},routeIndex:1});
 expect(state.geometry.endpoints.find(e=>e.id==='shuttle-entrance')?.at).toEqual({r:2,c:1});
 const second=transition(state,align!);
 expect(second.accepted).toBe(true);
 state=parseCampaignState(JSON.parse(JSON.stringify(second.state)));
 expect(state.status).toBe('won');expect(state.crew[0]!.status).toBe('housed');
 expect(state.mechanics).toContainEqual(expect.objectContaining({id:'docks',boardedIds:['crew-0']}));
 expect(second.events.filter(e=>e.type==='dock'&&e.phase==='boarded').map(e=>e.type==='dock'?e.crewId:null)).toEqual(['crew-0']);
 expect([...first.events,...second.events].filter(e=>e.type==='move'&&e.entityId==='visiting-shuttle').every(e=>e.type==='move'&&e.passengerIds.length===0)).toBe(true);
 expect(state.geometry.endpoints.find(e=>e.id==='shuttle-entrance')?.at).toEqual(state.actors.find(a=>a.kind==='dock')?.entrance);
});
it('rejects a dock track in a gravity switch chamber and a portal on a moving track',()=>{
 const gravity=getAuthoredLessonLevel(760)!;gravity.fixtures.push({id:'switch',kind:'gravity-switch',at:{r:3,c:0},chamberId:'room',direction:'down'});gravity.geometry.chambers[0]!.directions=['down','left'];gravity.mechanics.push({id:'gravity',fixtureIds:['switch']});
 expect(()=>parseCampaignLevel(gravity)).toThrow(/Gravity chambers/i);
 const portal=getAuthoredLessonLevel(756)!;portal.fixtures.push({id:'portal',kind:'portal',at:{r:1,c:1},receiver:{r:0,c:1},segmentId:'column-1-0'});portal.mechanics.push({id:'portals',fixtureIds:['portal']});
 expect(()=>parseCampaignLevel(portal)).toThrow(/Portals cannot overlap/i);
});
