import {it,expect} from 'vitest';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {legalActions} from '../../src/campaign/engine/actions';
import {transition} from '../../src/campaign/engine/turn';
import {hashState} from '../../src/campaign/engine/hash';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
it('enumerates both legal gesture directions because destination changes merge anchoring',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(1)!);
 const right={type:'swap' as const,from:{r:2,c:0},to:{r:2,c:1}},left={type:'swap' as const,from:right.to,to:right.from};
 expect(legalActions(state)).toContainEqual(right);expect(legalActions(state)).toContainEqual(left);
 const a=transition(state,right),b=transition(state,left);expect(a.accepted&&b.accepted).toBe(true);expect(hashState(a.state)).not.toBe(hashState(b.state));
 expect(a.events.find(e=>e.type==='merge')).toMatchObject({at:{r:1,c:0}});expect(b.events.find(e=>e.type==='merge')).toMatchObject({at:{r:2,c:0}});
});
