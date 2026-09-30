import { chapterForLevel } from './chapters';
import { parseCampaignChapter,parseCampaignLevel } from './schema';
import type { CampaignLevel } from './types';
import fixedBetaLevels from './content/beta-levels.json';

/** Authored teaching boards remain exact; the full campaign adds proven variants. */
const betaLevels:readonly {id:number}[]=fixedBetaLevels;
export const AUTHORED_CAMPAIGN_IDS:readonly number[]=Object.freeze(betaLevels.map(level=>level.id));
export const CAMPAIGN_IDS:readonly number[]=Object.freeze(Array.from({length:1000},(_,index)=>index+1));
// Compatibility name for the existing save/navigation API.
export const BETA_CAMPAIGN_IDS=CAMPAIGN_IDS;
const betaById=new Map(betaLevels.map(level=>[level.id,level]));
export const isBetaCampaignId=(id:number):boolean=>Number.isInteger(id)&&id>=1&&id<=1000;
/** Retired portal boards retain their historical IDs in saves and reward ledgers. */
export const RETIRED_BETA_CAMPAIGN_IDS:readonly number[]=Object.freeze([376,377,378,379,380,615]);

// Vite includes only committed content. An absent chapter is never generated at runtime.
const chapters=import.meta.glob<unknown>('./content/chapter-*.json',{import:'default'});
export async function getCampaignLevel(id:number):Promise<CampaignLevel>{
  chapterForLevel(id); // Preserve the canonical 1–1000 range contract.
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
