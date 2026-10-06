import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {generateCampaign,puzzleFingerprint,type GeneratedManifestEntry} from '../../src/campaign/generation';
import {parseCampaignChapter} from '../../src/campaign/schema';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {replayTrace} from '../../src/campaign/validator';
import {first} from '../../src/campaign/schedule';
import type {SolutionTrace} from '../../src/campaign/types';
import beta from '../../src/campaign/content/beta-levels.json';

const levels=Array.from({length:20},(_,index)=>parseCampaignChapter(JSON.parse(readFileSync(new URL(`../../src/campaign/content/chapter-${String(index+1).padStart(2,'0')}.json`,import.meta.url),'utf8')),index+1)).flat();
const manifest:GeneratedManifestEntry[]=JSON.parse(readFileSync(new URL('../../validation/campaign/generated/manifest.json',import.meta.url),'utf8'));
const proofs:SolutionTrace[]=JSON.parse(readFileSync(new URL('../../validation/campaign/generated/proofs.json',import.meta.url),'utf8'));

it('commits 1000 consecutive schema-valid boards and preserves all 127 authored boards exactly',()=>{
 expect(levels.map(level=>level.id)).toEqual(Array.from({length:1000},(_,index)=>index+1));
 expect(manifest).toHaveLength(1000);expect(proofs).toHaveLength(1000);
 for(const authored of beta)expect(levels[authored.id-1]).toEqual(authored);
 expect(manifest.filter(entry=>entry.source==='authored')).toHaveLength(127);
});

it('independently replays every shipped board to victory without a consumable',()=>{
 for(const level of levels){
  const proof=proofs[level.id-1]!;
  expect(proof.actions.every(action=>action.type!=='booster')).toBe(true);
  expect(replayTrace(level,proof),`level ${level.id}`).toEqual({won:true,issues:[]});
 }
},30000);

it('has 1000 distinct real opening puzzles and diverse geometry, independent of seed and mission metadata',()=>{
 const fingerprints=new Set<string>();
 for(const level of levels){
  const entry=manifest[level.id-1]!,state=loadCampaignLevel(level),fingerprint=puzzleFingerprint(state);
  expect(fingerprints.has(fingerprint),`duplicate level ${level.id}`).toBe(false);fingerprints.add(fingerprint);
  expect(entry.contentFingerprint).toBe(fingerprint);expect(entry.seed).toBe(level.seed);expect(entry.proofLength).toBe(proofs[level.id-1]!.actions.length);
  expect(entry.mechanics).toEqual(level.mechanics.map(mechanic=>mechanic.id));
 }
 expect(fingerprints.size).toBe(1000);
 expect(new Set(levels.map(level=>JSON.stringify(level.geometry.mask))).size).toBeGreaterThanOrEqual(50);
 const initial=loadCampaignLevel(levels[8]!),renamed=structuredClone(initial);
 renamed.level.id=999;renamed.level.seed=912;renamed.rngState=42;renamed.levelId=999;renamed.level.presentationId='another-title';renamed.pieces[0]!.id='renamed-piece';
 expect(puzzleFingerprint(renamed)).toBe(puzzleFingerprint(initial));
 const tile=renamed.pieces.find(piece=>piece.kind==='tile')!;if(tile.kind==='tile')tile.tier=tile.tier===1?2:1;
 expect(puzzleFingerprint(renamed)).not.toBe(puzzleFingerprint(initial));
});

it('practices only fully introduced mechanics and removes demonstration immunity from generated missions',()=>{
 const excluded=['portals'];
 for(const entry of manifest){
  const level=levels[entry.id-1]!;
  expect(entry.mechanics.some(mechanic=>excluded.includes(mechanic))).toBe(false);
  if(entry.source==='authored')continue;
  expect(entry.templateId).toBeLessThan(entry.id);expect(entry.changedTiles).toBeGreaterThan(0);
  for(const mechanic of level.mechanics)expect(first(mechanic.id)+4).toBeLessThan(level.id);
  expect(level.metadata.failurePolicy).toBeUndefined();expect(level.needMoves).toBeGreaterThanOrEqual(30);
 }
});

it('repeats deterministic seeded authoring and reports capped failures without substituting duplicate boards',()=>{
 const options={seed:20260930,throughLevel:50,maxAttemptsPerLevel:180};
 const a=generateCampaign(options),b=generateCampaign(options);
 expect(a).toEqual(b);expect(a.unresolved).toEqual([]);
 // Frozen release definitions belong to generator 4. Corrected gravity and
 // fixed stations and teaching routes change generator 6's candidate acceptance.
 expect(a.levels.map(l=>l.id)).toEqual(Array.from({length:50},(_,i)=>i+1));
 for(const level of a.levels){expect(replayTrace(level,a.proofs.find(p=>p.levelId===level.id)!)).toEqual({won:true,issues:[]});if(beta.some(l=>l.id===level.id))expect(level).toEqual(levels[level.id-1]);}
 const capped=generateCampaign({...options,maxAttemptsPerLevel:1});
 expect(capped.unresolved.length).toBeGreaterThan(0);
 expect(capped.levels.length+capped.unresolved.length).toBe(50);
 for(const gap of capped.unresolved){expect(gap.attempts).toBe(1);expect(capped.levels.some(level=>level.id===gap.id)).toBe(false);}
},15000);

it('rotates templates and revisits a broad mix of learned mechanics throughout the late campaign',()=>{
 for(let i=1;i<manifest.length;i++)expect(manifest[i]!.templateId).not.toBe(manifest[i-1]!.templateId);
 const primary=(entry:GeneratedManifestEntry)=>[...entry.mechanics].sort((a,b)=>first(b)-first(a))[0]!;
 for(let start=800;start<1000;start+=50){
  const window=manifest.slice(start,start+50),counts=new Map<string,number>();
  for(const entry of window){const mechanic=primary(entry);counts.set(mechanic,(counts.get(mechanic)??0)+1);}
  expect(counts.size).toBeGreaterThanOrEqual(10);
  expect(Math.max(...counts.values())/window.length).toBeLessThanOrEqual(0.3);
 }
 const late=manifest.filter(entry=>entry.id>805&&entry.source==='generated');
 const thoughtful=late.filter(entry=>entry.id%3===0),recovery=late.filter(entry=>entry.id%3===1);
 expect(thoughtful.filter(entry=>entry.proofLength>=5).length/thoughtful.length).toBeGreaterThan(0.6);
 // Frozen breather boards may need one additional crew move to a fixed entrance.
 // Four moves is the runtime generator's existing gentle difficulty threshold.
 expect(recovery.filter(entry=>entry.proofLength<=4).length/recovery.length).toBeGreaterThan(0.8);
 const repeatedMasks=levels.slice(1).filter((level,index)=>JSON.stringify(level.geometry.mask)===JSON.stringify(levels[index]!.geometry.mask));
 expect(repeatedMasks.length/levels.length).toBeLessThan(0.05);
});
