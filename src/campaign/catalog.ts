import { chapterForLevel } from './chapters';
import { parseCampaignChapter,parseCampaignLevel } from './schema';
import type { CampaignLevel } from './types';
import fixedBetaLevels from './content/beta-levels.json';

/** Canonical mission numbers in this finite TestFlight release. Gaps retain
 * their original campaign IDs and are not silently filled with generated art. */
const betaLevels:readonly {id:number}[]=fixedBetaLevels;
export const BETA_CAMPAIGN_IDS:readonly number[]=Object.freeze(betaLevels.map(level=>level.id));
const betaById=new Map(betaLevels.map(level=>[level.id,level]));
export const isBetaCampaignId=(id:number):boolean=>betaById.has(id);
/** Retired portal boards retain their historical IDs in saves and reward ledgers. */
export const RETIRED_BETA_CAMPAIGN_IDS:readonly number[]=Object.freeze([376,377,378,379,380,615]);

// Vite includes only committed content. An absent chapter is never generated at runtime.
const chapters=import.meta.glob<unknown>('./content/chapter-*.json',{import:'default'});
export async function getCampaignLevel(id:number):Promise<CampaignLevel>{
  chapterForLevel(id); // Preserve the canonical 1–1000 range contract.
  if(RETIRED_BETA_CAMPAIGN_IDS.includes(id))throw new Error(`Mission ${id} has been retired from this release`);
  const fixed=betaById.get(id);
  if(fixed)return parseCampaignLevel(structuredClone(fixed));
  const chapter=chapterForLevel(id),path=`./content/chapter-${String(chapter.id).padStart(2,'0')}.json`;
  const load=chapters[path];
  if(!load)throw new Error(`Missing campaign content: ${path} (level ${id})`);
  const levels=parseCampaignChapter(await load(),chapter.id);
  const level=levels.find(level=>level.id===id);
  if(!level)throw new Error(`Missing campaign level ${id} in ${path}`);
  return level;
}
