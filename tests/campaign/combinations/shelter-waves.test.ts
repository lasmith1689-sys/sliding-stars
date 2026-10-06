import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {parseCampaignLevel,parseCampaignState} from '../../../src/campaign/schema';
it('eligible wave guests start twenty on safe arrival after the tick; an occupied entry waits without overwriting',()=>{
 const level=getAuthoredLessonLevel(475)!,initial=loadCampaignLevel(level),actions=lessonTeachingActions[475]!;
 const first=transition(initial,actions[0]!);expect(first.accepted).toBe(true);expect(first.state.crew[0]).toMatchObject({id:'wave-a-crew-0',shelterStarted:true,shelterMoves:20,rescueMoves:null});
 expect(first.state.arrivals.map(a=>a.status)).toEqual(['admitted','pending']);expect(first.state.mechanics.find(m=>m.id==='shelter')).toMatchObject({startedCrewIds:['wave-a-crew-0']});
 const restored=parseCampaignState(JSON.parse(JSON.stringify(first.state))),second=transition(first.state,actions[1]!);expect(transition(restored,actions[1]!)).toEqual(second);
 expect(second.state.crew[0]!.shelterMoves).toBe(19);expect(second.state.arrivals[1]!.status).toBe('pending');expect(second.state.crew).toHaveLength(1);
 let final=second;const events=second.events.slice();let secondStart:ReturnType<typeof transition>|undefined;
 for(const action of actions.slice(2)){
  final=transition(final.state,action);expect(final.accepted,final.rejection).toBe(true);events.push(...final.events);
  if(final.events.some(event=>event.type==='shelter'&&event.crewId==='wave-b-crew-0'&&event.phase==='started'))secondStart=final;
  expect(final.state.pieces.find(piece=>piece.id==='tile-2-4')).toMatchObject({kind:'station',at:{r:2,c:4}});
 }
 expect(secondStart).toBeDefined();expect(secondStart!.state.crew.find(crew=>crew.id==='wave-b-crew-0')).toMatchObject({shelterStarted:true,shelterMoves:20,rescueMoves:null});
 expect(final.state.status).toBe('won');expect(final.state.crew).toHaveLength(2);expect(final.state.crew.every(c=>c.status==='housed'&&c.shelterStarted&&c.shelterMoves===null&&c.rescueMoves===null)).toBe(true);
 expect(events.filter(event=>event.type==='shelter'&&event.crewId==='wave-b-crew-0'&&event.phase==='started')).toEqual([expect.objectContaining({type:'shelter',crewId:'wave-b-crew-0',phase:'started',allowance:20})]);expect(final.state.mechanics.find(m=>m.id==='shelter')).toMatchObject({startedCrewIds:['wave-a-crew-0','wave-b-crew-0']});
});
it('rejects pre-started scheduled definitions and a save ledger claiming a pending guest has arrived',()=>{
 const level=getAuthoredLessonLevel(475)!;level.arrivals[0]!.crew[0]!.shelterStarted=true;level.arrivals[0]!.crew[0]!.shelterMoves=20;expect(()=>parseCampaignLevel(level)).toThrow(/scheduled/i);
 const state=loadCampaignLevel(getAuthoredLessonLevel(475)!);state.mechanics.find(m=>m.id==='shelter')!.startedCrewIds.push('wave-a-crew-0');expect(()=>parseCampaignState(state)).toThrow(/shelter/i);
});
