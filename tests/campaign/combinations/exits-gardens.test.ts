import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
it('garden harvest departs through exits after growth, retaining one completion identity',()=>{let s=loadCampaignLevel(getAuthoredLessonLevel(516)!);let spawned=false;for(const a of lessonTeachingActions[516]!){const r=transition(s,a);for(const e of r.events){if(e.type==='spawn'&&e.piece.id==='harvest-0')spawned=true;if(e.type==='remove'&&e.piece.id==='harvest-0'&&e.reason==='departure')expect(spawned).toBe(true);}s=r.state;}expect(s.status).toBe('won');expect(s.mechanics.find(m=>m.id==='exits')).toEqual({id:'exits',departedIds:['harvest-0']});expect(s.pieces.some(p=>p.id==='harvest-0')).toBe(false);});
