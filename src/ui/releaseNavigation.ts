import { BETA_CAMPAIGN_IDS } from '../campaign/catalog';
import { CHAPTERS } from '../campaign/chapters';
import { selectBetaCampaignMission } from '../session/adapter';
import type { SaveStorage,SaveV2 } from '../session/types';

/** Attach this to the campaign UI's Missions button. The current board and
 * save remain untouched until another verified mission is loaded and saved. */
export function openBetaMissionPicker(save:SaveV2,storage:SaveStorage,onSelected:()=>void):void {
 const dialog=document.getElementById('panel') as HTMLDialogElement|null;
 if(!dialog)throw Error('Mission panel is unavailable');
 if(dialog.open)return;
 const completed=new Set(save.completedCampaignIds),current=save.active.kind==='campaign'?save.active.state.levelId:null;
 const done=BETA_CAMPAIGN_IDS.filter(id=>completed.has(id)).length;
 dialog.innerHTML=`<div class="panel-inner"><div class="panel-heading"><h1>Your missions · ${done}/${BETA_CAMPAIGN_IDS.length}</h1><button class="close" aria-label="Close missions">×</button></div><p>Choose a constellation to explore. Replay any mission and keep your rewards.</p><label for="mission-chapter">Constellation</label><select id="mission-chapter" style="width:100%;min-height:48px;font:inherit;margin:8px 0 12px;padding:8px;border-radius:12px">${CHAPTERS.map(chapter=>`<option value="${chapter.id}" ${chapter.id===Math.ceil((current??1)/50)?'selected':''}>${chapter.id}. ${chapter.name} · ${chapter.firstLevel}–${chapter.lastLevel}</option>`).join('')}</select><p id="chapter-progress" role="status"></p><div id="chapter-missions" style="max-height:min(49vh,460px);overflow:auto;padding:4px;display:grid;grid-template-columns:repeat(auto-fit,minmax(76px,1fr));gap:8px"></div><p id="beta-mission-error" role="alert"></p></div>`;
 dialog.querySelector('.close')!.addEventListener('click',()=>dialog.close());
 const selector=dialog.querySelector<HTMLSelectElement>('#mission-chapter')!;
 const renderChapter=()=>{
 const chapter=CHAPTERS[Number(selector.value)-1]!;
 const ids=BETA_CAMPAIGN_IDS.filter(id=>id>=chapter.firstLevel&&id<=chapter.lastLevel);
 dialog.querySelector('#chapter-progress')!.textContent=`${ids.filter(id=>completed.has(id)).length} of ${ids.length} missions complete`;
 dialog.querySelector('#chapter-missions')!.innerHTML=ids.map(id=>`<button class="secondary" data-beta-mission="${id}" style="min-height:48px" aria-label="Mission ${id}${completed.has(id)?', completed':''}${current===id?', current':''}" ${current===id?'aria-current="true"':''}>${id}${completed.has(id)?' ✓':''}${current===id?' · here':''}</button>`).join('');
 dialog.querySelectorAll<HTMLButtonElement>('[data-beta-mission]').forEach(button=>button.addEventListener('click',async()=>{
  const id=Number(button.dataset.betaMission),error=dialog.querySelector('#beta-mission-error')!;
  dialog.querySelectorAll<HTMLButtonElement>('button').forEach(control=>control.disabled=true);
  selector.disabled=true;
  error.textContent=`Loading mission ${id}…`;
  try{await selectBetaCampaignMission(save,storage,id);dialog.close();onSelected();}
  catch(cause){error.textContent=cause instanceof Error?cause.message:String(cause);dialog.querySelectorAll<HTMLButtonElement>('button').forEach(control=>control.disabled=false);selector.disabled=false;}
 }));
 };
 selector.addEventListener('change',renderChapter);renderChapter();
 dialog.showModal();
}
