import {expect,it} from 'vitest';
import {getAuthoredLessonLevel,campaignLessons} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {validateCandidate} from '../../../src/campaign/validator';
it.each([111,112,113,114,115])('authors playable evacuation lesson %s with its real mechanic and instruction',id=>{
 const level=getAuthoredLessonLevel(id);expect(level).toBeDefined();if(!level)throw Error();
 expect(validateCandidate(level)).toEqual([]);expect(loadCampaignLevel(level).status).toBe('playing');
 expect(level.mechanics.some(m=>m.id==='exits')).toBe(true);expect(campaignLessons.find(l=>l.levelId===id)?.mechanicId).toBe('exits');
});
