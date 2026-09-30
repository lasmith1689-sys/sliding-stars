import { it,expect } from 'vitest';
import { transition } from '../../src/campaign/engine/turn';
import { hashState } from '../../src/campaign/engine/hash';
import { parseCampaignState,parseCampaignEvents } from '../../src/campaign/schema';
import { baseState,mergeSwap } from './fixtures/base';

function freeze<T>(value:T):T {if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
it('frozen inputs stay unchanged and replay is identical after JSON serialization',()=>{
  const state=freeze(baseState()),before=JSON.stringify(state),a=transition(state,mergeSwap),b=transition(parseCampaignState(JSON.parse(before)),mergeSwap);
  expect(a).toEqual(b);expect(JSON.stringify(state)).toBe(before);expect(parseCampaignEvents(a.events)).toEqual(a.events);expect(hashState(a.state)).toBe(hashState(b.state));
});
it('complete hashes include future queues, RNG and needs and canonical object key ordering',()=>{
  const state=baseState(),hash=hashState(state);
  for(const mutate of [(s:typeof state)=>s.rngState++,(s:typeof state)=>s.crew[0]!.rescueMoves!--,(s:typeof state)=>s.pendingTransfers.push({crewId:'crew',destinationId:'x'})]){const copy=structuredClone(state);mutate(copy);expect(hashState(copy)).not.toBe(hash);}
  expect(hashState(Object.fromEntries(Object.entries(state).reverse()) as typeof state)).toBe(hash);
});
