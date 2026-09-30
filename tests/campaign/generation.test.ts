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

it('commits 1000 consecutive schema-valid boards and preserves all 102 authored boards exactly',()=>{
 expect(levels.map(level=>level.id)).toEqual(Array.from({length:1000},(_,index)=>index+1));
 expect(manifest).toHaveLength(1000);expect(proofs).toHaveLength(1000);
 for(const authored of beta)expect(levels[authored.id-1]).toEqual(authored);
 expect(manifest.filter(entry=>entry.source==='authored')).toHaveLength(102);
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
 const excluded=['portals','relays','tethers','repair','rendezvous'];
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
 expect(a).toEqual(b);expect(a.unresolved).toEqual([]);expect(a.levels).toEqual(levels.slice(0,50));
 const capped=generateCampaign({...options,maxAttemptsPerLevel:1});
 expect(capped.unresolved.length).toBeGreaterThan(0);
 expect(capped.levels.length+capped.unresolved.length).toBe(50);
 for(const gap of capped.unresolved){expect(gap.attempts).toBe(1);expect(capped.levels.some(level=>level.id===gap.id)).toBe(false);}
},15000);
