import type { CampaignLevel,ValidationIssue } from './types';
import type { SolveResult } from './solver';
import { parseSolutionTrace,validateLevel } from './schema';
import { loadCampaignLevel } from './engine/load';
import { transition } from './engine/turn';
import { hashState } from './engine/hash';
import { selectModules } from './mechanics/registry';

const message=(error:unknown)=>error instanceof Error?error.message:String(error);
/** The schema remains the authority for references, finite quotas and compatibility.
 * Loading adds registered-module checks, route validation and full gravity coverage.
 */
export function validateCandidate(level:CampaignLevel):ValidationIssue[]{
  const issues=validateLevel(level);if(issues.length)return issues;
  try{
    const moduleIssues=selectModules(level).flatMap(module=>module.validate(level));
    if(moduleIssues.length)return moduleIssues;
    loadCampaignLevel(level);return [];
  }catch(error){return [{code:'engine-content',levelId:level.id,message:message(error)}];}
}
/** A won flag means the entire proof is valid, not just that some prefix won. */
export function replayTrace(level:CampaignLevel,input:unknown):{won:boolean;issues:ValidationIssue[]}{
  const issues=validateCandidate(level);
  const fail=(code:string,detail:string)=>({won:false,issues:[...issues,{code,levelId:level.id,message:detail}]});
  if(issues.length)return {won:false,issues};
  let trace;
  try{trace=parseSolutionTrace(input);}catch(error){return fail('trace-schema',message(error));}
  if(trace.levelId!==level.id||trace.rulesVersion!==level.rulesVersion||trace.campaignVersion!==level.campaignVersion)return fail('trace-level','Trace identity/version differs from level');
  if(trace.actions.some(a=>a.type==='booster'))return fail('booster-action','Release proofs cannot use consumables');
  try{
    let state=loadCampaignLevel(level);
    if(hashState(state)!==trace.initialHash)return fail('initial-hash','Initial state fingerprint differs');
    for(const [index,action] of trace.actions.entries()){
      if(state.status!=='playing')return fail('after-terminal',`Action ${index+1} follows a terminal state`);
      const result=transition(state,action);
      if(!result.accepted)return fail('rejected-action',`Action ${index+1}: ${result.rejection??'rejected'}`);
      state=result.state;
    }
    if(state.status!=='won')return fail('not-won',`Trace ends ${state.status}`);
    if(hashState(state)!==trace.finalHash)return fail('final-hash','Final state fingerprint differs');
    return {won:true,issues:[]};
  }catch(error){return fail('replay-error',message(error));}
}
/** Callers must replay the proof; a solver status alone never grants admission. */
export function validateForRelease(level:CampaignLevel,result:SolveResult):ValidationIssue[]{
  if(result.status!=='solved')return [...validateCandidate(level),{code:'unresolved',levelId:level.id,message:`No winning proof: ${result.status} after ${result.explored} transitions`}];
  return replayTrace(level,result.trace).issues;
}
