import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {makeScene,applySceneEvents} from '../../src/render/campaign/snapshot';
import {gardenVisualState,gardenWaiting} from '../../src/render/campaign/mechanics';
import {gardenCoachCopy} from '../../src/ui/campaignCoach';
it('shows all stages, real pending output and crop delivery in event-derived scenes',()=>{let s=loadCampaignLevel(getAuthoredLessonLevel(517)!);const first=s.fixtures[0]!;if(first.kind!=='garden')throw Error('Expected garden');expect(gardenVisualState(first)).toBe('seed');let waiting=false;for(const a of lessonTeachingActions[517]!){const prior=makeScene(s),r=transition(s,a),scene=makeScene(r.state),derived=applySceneEvents(prior,r.events);expect(derived.fixtures).toEqual(scene.fixtures);expect(derived.departedExitIds).toEqual(scene.departedExitIds);const plot=r.state.fixtures.find(f=>f.kind==='garden')!;if(plot.kind==='garden'&&gardenWaiting(scene,plot)){waiting=true;expect(gardenVisualState(plot)).toBe('ripe');expect(gardenCoachCopy(r.state)).toMatch(/waiting/);}s=r.state;}expect(waiting).toBe(true);expect(gardenCoachCopy(s)).toMatch(/delivered/);});
