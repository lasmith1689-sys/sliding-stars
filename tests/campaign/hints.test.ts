import {expect,it} from 'vitest';
import {campaignHint,hintPositionKey} from '../../src/campaign/hints';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {authoredLessonLevels} from '../../src/campaign/lessons';
import {lessonSolutionTraces} from '../../src/campaign/content/lesson-solutions.dev';
import {hashState} from '../../src/campaign/engine/hash';

it('suggests a winning move on short rescue lessons without altering state',()=>{
 const traces=lessonSolutionTraces.filter(trace=>trace.actions.length===1).slice(0,12);
 expect(traces.length).toBeGreaterThan(0);
 for(const trace of traces){
  const state=loadCampaignLevel(authoredLessonLevels.find(level=>level.id===trace.levelId)!);
  const before=hashState(state),action=campaignHint(state);
  expect(action,`mission ${trace.levelId}`).not.toBeNull();
  expect(hashState(state)).toBe(before);
  expect(transition(state,action!).state.status,`mission ${trace.levelId}`).toBe('won');
 }
});
it('never suggests a move after completion',()=>{
 const state=loadCampaignLevel(authoredLessonLevels[0]!);state.status='won';
 expect(campaignHint(state)).toBeNull();
});
it.each([5,9,16,56,81,516,661])('hints advance an unfinished obstacle in mission %s',async id=>{
 const {getCampaignLevel}=await import('../../src/campaign/catalog');
 const state=loadCampaignLevel(await getCampaignLevel(id)),action=campaignHint(state);
 expect(action).not.toBeNull();
 const result=transition(state,action!);
 expect(result.state.status).not.toBe('lost');
 const progress=result.state.status==='won'||result.events.some(e=>
  e.type==='fixture'&&e.before&&'hp'in e.before&&(!e.after||'hp'in e.after&&e.after.hp<e.before.hp)||
  e.type==='garden'&&e.phase==='grown'||e.type==='solar');
 expect(progress,`hint should advance the obstacle in ${id}`).toBe(true);
});

it.each([16,56,225,471,711,750,950])('fallback advice makes useful progress to victory in mission %s',async id=>{
 const {getCampaignLevel}=await import('../../src/campaign/catalog');let state=loadCampaignLevel(await getCampaignLevel(id));
 const visited=new Set([hintPositionKey(state)]);
 for(let i=0;i<12&&state.status==='playing';i++){
  const hint=campaignHint(state,visited);expect(hint).not.toBeNull();const result=transition(state,hint!);expect(result.accepted).toBe(true);
  state=result.state;visited.add(hintPositionKey(state));
 }
 expect(state.status).toBe('won');
});
it('does not repeatedly suggest a visited nonterminal arrangement in mission 900',async()=>{
 const {getCampaignLevel}=await import('../../src/campaign/catalog');let state=loadCampaignLevel(await getCampaignLevel(900));const visited=new Set([hintPositionKey(state)]);
 for(let i=0;i<20&&state.status==='playing';i++){const action=campaignHint(state,visited);if(!action)break;const result=transition(state,action);const key=hintPositionKey(result.state);if(result.state.status!=='won')expect(visited.has(key)).toBe(false);visited.add(key);state=result.state;}
});
