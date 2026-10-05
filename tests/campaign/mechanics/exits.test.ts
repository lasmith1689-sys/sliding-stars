import { expect,it } from 'vitest';
import { exitLevel,exitMove } from '../fixtures/exits';
import { loadCampaignLevel } from '../../../src/campaign/engine/load';
import { transition } from '../../../src/campaign/engine/turn';
import { createContext } from '../../../src/campaign/engine/context';
import { settle } from '../../../src/campaign/engine/settle';
import { selectModules } from '../../../src/campaign/mechanics/registry';
import { legalActions } from '../../../src/campaign/engine/actions';
import { actionBetween } from '../../../src/input/campaign';
import { validateCandidate } from '../../../src/campaign/validator';
import { parseCampaignState } from '../../../src/campaign/schema';
import { CampaignSession,createCampaignSave } from '../../../src/session/campaignSession';
import { loadSave } from '../../../src/session/storage';
import { MemoryStorage } from '../../session/fixtures/legacy';
import { validateExits } from '../../../src/campaign/mechanics/exits';

it('delivers the designated capsule once after gravity and atomically evacuates its passenger',()=>{
 const state=loadCampaignLevel(exitLevel()),result=transition(state,exitMove);
 expect(result.accepted).toBe(true);expect(result.state.goalProgress[0]!.completedIds).toEqual(['capsule-a']);
 expect(result.state.mechanics).toContainEqual({id:'exits',departedIds:['capsule-a']});
 expect(result.state.pieces.some(p=>p.id==='capsule-a')).toBe(false);
 expect(result.state.crew[0]).toMatchObject({status:'evacuated',carrierId:null,rescueMoves:null,at:{r:1,c:0}});
 expect(result.events).toContainEqual(expect.objectContaining({type:'remove',reason:'departure',piece:expect.objectContaining({id:'capsule-a'})}));
 expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
 const context=createContext(result.state);settle(context,selectModules(state.level));
 expect(context.state.goalProgress[0]!.completedIds).toEqual(['capsule-a']);expect(context.events).toEqual([]);
});
it('does not house a capsule passenger at an ordinary station, and never starts their rescue need',()=>{
 const level=exitLevel();level.pieces[1]={id:'station',kind:'station',at:{r:0,c:1},facing:'left'};
 const state=loadCampaignLevel(level);
 expect(state.crew[0]).toMatchObject({status:'active',carrierId:'capsule-a',rescueMoves:null});
});
it('wins the final departure before an unrelated rescue countdown expires',()=>{
 const level=exitLevel();level.crew.push({id:'drifter',at:{r:0,c:1},status:'active',carrierId:null,rescueMoves:1,shelterMoves:null,shelterStarted:false,vipId:null});
 const result=transition(loadCampaignLevel(level),exitMove);
 expect(result.state.status).toBe('won');expect(result.state.crew.find(c=>c.id==='drifter')!.rescueMoves).toBe(1);
});
it.each(['capsule-a','passenger'])('credits eligible %s and preserves victory through real session save/reload',id=>{
 const level=exitLevel();level.goals[0]!.eligible={type:'sources',sourceIds:[id],target:1};
 const store=new MemoryStorage(),session=new CampaignSession(createCampaignSave(level),store);
 expect(session.persist().ok).toBe(true);const before=new CampaignSession(loadSave(store)!,store);
 expect(before.dispatch(exitMove)?.state.status).toBe('won');const saved=loadSave(store)!;
 const reload=new CampaignSession(saved,store);reload.finishPresentation();expect(reload.dispatch(exitMove)).toBeNull();
 expect(reload.save).toEqual(saved);expect(saved.rewardLedger).toHaveLength(2);
});
it('ignores the wrong destination even when cargo reaches another marked exit',()=>{
 const level=exitLevel();level.geometry.endpoints.push({id:'exit-b',kind:'exit',at:{r:1,c:1},active:true});
 level.mechanics=[{id:'exits',endpointIds:['exit-a','exit-b']}];
 const cargo=level.pieces[0]!;if(cargo.kind!=='cargo')throw Error();cargo.destinationId='exit-b';
 const result=transition(loadCampaignLevel(level),exitMove);
 expect(result.state.pieces.some(p=>p.id==='capsule-a'&&p.at.r===1&&p.at.c===0)).toBe(true);
 expect(result.state.goalProgress[0]!.completedIds).toEqual([]);
});
it.each(['tile','pod','station'] as const)('rejects both directions of direct cargo swapping with %s without ticking or previewing',kind=>{
 const level=exitLevel();level.pieces[1]=kind==='tile'?level.pieces[1]!:kind==='pod'?{id:'neighbor',kind,at:{r:0,c:1},passengerIds:[]}:{id:'neighbor',kind,at:{r:0,c:1},facing:'right'};
 const state=loadCampaignLevel(level);
 for(const [from,to] of [[{r:0,c:0},{r:0,c:1}],[{r:0,c:1},{r:0,c:0}]] as const){
  const action={type:'swap' as const,from,to};expect(actionBetween(state,from,to)).toBeNull();expect(legalActions(state)).not.toContainEqual(action);
  const result=transition(state,action);expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
 }
});
it('validates permanent lower mask boundaries and rejects inactive/internal exits and disconnected cargo',()=>{
 expect(validateCandidate(exitLevel())).toEqual([]);
 for(const mutate of [(l:ReturnType<typeof exitLevel>)=>{l.geometry.endpoints[0]!.at={r:0,c:0};},(l:ReturnType<typeof exitLevel>)=>{l.geometry.endpoints[0]!.active=false;},(l:ReturnType<typeof exitLevel>)=>{l.geometry.inactiveCells=[{r:1,c:0}];l.geometry.endpoints[0]!.at={r:0,c:0};}]){
  const level=exitLevel();mutate(level);expect(validateCandidate(level).length).toBeGreaterThan(0);expect(validateExits(level).some(i=>i.code==='exit-boundary')).toBe(true);
 }
});
it('accepts the lower edge of an irregular mask and rejects a disconnected destination',()=>{
 const level=exitLevel();level.geometry.mask[1]![0]=false;level.geometry.endpoints[0]!.at={r:0,c:0};
 expect(validateExits(level)).toEqual([]);
 level.geometry.mask[0]![1]=false;level.geometry.mask[1]![1]=false;level.geometry.endpoints[0]!.at={r:1,c:2};
 expect(validateExits(level).some(i=>i.code==='exit-unreachable')).toBe(true);
});
