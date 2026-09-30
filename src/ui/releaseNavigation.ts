import { BETA_CAMPAIGN_IDS } from '../campaign/catalog';
import { MECHANIC_SCHEDULE,teachingAt } from '../campaign/schedule';
import { selectBetaCampaignMission } from '../session/adapter';
import type { SaveStorage,SaveV2 } from '../session/types';

/** Attach this to the campaign UI's Missions button. The current board and
 * save remain untouched until another authored mission is loaded and saved. */
export function openBetaMissionPicker(save:SaveV2,storage:SaveStorage,onSelected:()=>void):void {
 const dialog=document.getElementById('panel') as HTMLDialogElement|null;
 if(!dialog)throw Error('Mission panel is unavailable');
 if(dialog.open)return;
 const completed=new Set(save.completedCampaignIds),current=save.active.kind==='campaign'?save.active.state.levelId:null;
 const done=BETA_CAMPAIGN_IDS.filter(id=>completed.has(id)).length;
 const groups=new Map<string,number[]>();
 for(const id of BETA_CAMPAIGN_IDS){
  const entry=teachingAt(id),name=entry?MECHANIC_SCHEDULE.find(item=>item.id===entry.mechanicId)?.name??entry.mechanicId:'First rescues';
  groups.set(name,[...(groups.get(name)??[]),id]);
 }
 dialog.innerHTML=`<div class="panel-inner"><div class="panel-heading"><h1>Beta missions · ${done}/${BETA_CAMPAIGN_IDS.length}</h1><button class="close" aria-label="Close missions">×</button></div><p>Choose any released mission. Finished missions can be replayed; your saved rewards and earlier wins stay recorded.</p><div style="max-height:min(57vh,520px);overflow:auto;padding-right:4px">${[...groups].map(([name,ids])=>`<section><h2 class="section-label">${name}</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin-bottom:16px">${ids.map(id=>`<button class="secondary" data-beta-mission="${id}" style="min-height:48px" aria-label="Mission ${id}${completed.has(id)?', completed':''}${current===id?', current':''}">${id}${completed.has(id)?' ✓':''}${current===id?' · current':''}</button>`).join('')}</div></section>`).join('')}</div><p id="beta-mission-error" role="alert"></p><p class="quiet">This beta contains ${BETA_CAMPAIGN_IDS.length} authored missions. The numbered gaps belong to the planned full campaign.</p></div>`;
 dialog.querySelector('.close')!.addEventListener('click',()=>dialog.close());
 dialog.querySelectorAll<HTMLButtonElement>('[data-beta-mission]').forEach(button=>button.addEventListener('click',async()=>{
  const id=Number(button.dataset.betaMission),error=dialog.querySelector('#beta-mission-error')!;
  dialog.querySelectorAll<HTMLButtonElement>('button').forEach(control=>control.disabled=true);
  error.textContent=`Loading mission ${id}…`;
  try{await selectBetaCampaignMission(save,storage,id);dialog.close();onSelected();}
  catch(cause){error.textContent=cause instanceof Error?cause.message:String(cause);dialog.querySelectorAll<HTMLButtonElement>('button').forEach(control=>control.disabled=false);}
 }));
 dialog.showModal();
}
