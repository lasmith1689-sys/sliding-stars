import type { CampaignState } from '../types';
/** Object keys are canonical; ordered arrays preserve all future-affecting queues. */
function canonical(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value!==null&&typeof value==='object')return `{${Object.entries(value).filter(([,item])=>item!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function hashState(state:CampaignState):string {
  // 64-bit FNV-1a; replay fingerprint, not an authentication primitive.
  let hash=0xcbf29ce484222325n;
  for(const byte of new TextEncoder().encode(canonical(state)))hash=BigInt.asUintN(64,(hash^BigInt(byte))*0x100000001b3n);
  return hash.toString(16).padStart(16,'0');
}
