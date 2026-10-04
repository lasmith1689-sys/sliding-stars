import {expect,it} from 'vitest';
import {finishLessonSeeds} from '../../src/campaign/content/finish-seeds';
import {lessonSolutionTraces} from '../../src/campaign/content/lesson-solutions.dev';
import {campaignModules} from '../../src/campaign/mechanics/registry';
import {createCampaignEngine} from '../../src/campaign/engine/turn';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {parseCampaignState} from '../../src/campaign/schema';
import {replayTrace} from '../../src/campaign/validator';
import {teachingAt} from '../../src/campaign/schedule';
import {campaignHintScore} from '../../src/campaign/hints';
import {transition} from '../../src/campaign/engine/turn';
import {goalsComplete} from '../../src/campaign/engine/goals';

it.each(finishLessonSeeds)('lesson $id needs its taught mechanic to complete the exact booster-free route',level=>{
 const proof=lessonSolutionTraces.find(trace=>trace.levelId===level.id)!;
 expect(replayTrace(level,proof)).toEqual({won:true,issues:[]});
 const taught=teachingAt(level.id)!.mechanicId,engine=createCampaignEngine(campaignModules.map(module=>module.id===taught?{id:module.id,validate:module.validate}:module));
 let state=engine.loadCampaignLevel(level);const definition=structuredClone(state.level);
 for(const action of proof.actions){const result=engine.transition(state,action);if(!result.accepted)break;state=result.state;expect(state.level).toEqual(definition);}
 expect(state.status,`disabled ${taught} still completed lesson ${level.id}`).not.toBe('won');
 expect(goalsComplete(state)).toBe(false);
 expect(parseCampaignState(JSON.parse(JSON.stringify(state)))).toEqual(state);
});
it('scores actual tether and numbered pad approach so off-route hints can prefer useful positioning',()=>{
 for(const id of [881,962]){const level=finishLessonSeeds.find(l=>l.id===id)!,state=loadCampaignLevel(level),proof=lessonSolutionTraces.find(trace=>trace.levelId===id)!,result=transition(state,proof.actions[0]!);expect(result.accepted).toBe(true);expect(campaignHintScore(state,result.state,result.events)).toBeGreaterThan(0);}
});
