import type {CampaignSession} from '../session/campaignSession';
import type {CampaignState,CampaignGoal} from '../campaign/types';
import type {PowerUpKind} from '../core/powerups';
import {POWER_UP_COST} from '../core/powerups';
import type {CampaignLayout} from '../render/layout';
import {basicCoachCopy,phaseCoachCopy,gravityCoachCopy,keyCoachCopy,gardenCoachCopy,shelterCoachCopy,bridgeCoachCopy,portalCoachCopy,futureWaveCopy,evacuationCopy,waveCoachCopy,moonwhaleCoachCopy,pupCoachCopy,currentCoachCopy,pirateCoachCopy,solarCoachCopy,dockCoachCopy} from './campaignCoach';
import {terrainArtName,terrainName} from '../campaign/terrainLabels';
import {campaignGuideTopics} from './campaignGuide';
const names:Record<CampaignGoal['type'],string>={homeCrew:'Crew home',recoverSupplies:'Supplies',evacuate:'Evacuated',guideCreatures:'At nursery',transferCreatures:'Transferred',interceptDrones:'Intercepted',restoreInfrastructure:'Restored',growDeliverHarvest:'Delivered',simultaneousDepartures:'Departed together'};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const boosters={demo:'Demolition',tractor:'Tractor',wormhole:'Shuffle'};
type Actions={hint:()=>void;restart:()=>void;next:()=>Promise<void>;retrySave?:()=>Promise<void>;power:(kind:PowerUpKind)=>void;preferences:()=>void};
export class CampaignShell {
 readonly root=document.getElementById('ui')!;readonly dialog=document.getElementById('panel') as HTMLDialogElement;
 selected:PowerUpKind|null=null;private message:string|null=null;
 constructor(readonly game:CampaignSession,private actions:Actions,private previewMode:boolean){
  this.root.classList.add('campaign-ui');
  this.root.innerHTML=`<header class="campaign-header"><div class="campaign-top"><span>Sliding <b>Stars</b></span><span id="campaign-coins"></span></div><div class="campaign-mission"><div><span class="eyebrow" id="campaign-level"></span><div id="campaign-goals"></div></div><div class="campaign-turns" id="campaign-turns"></div></div><div id="campaign-waves"></div><div id="campaign-status" role="status"></div></header><footer class="campaign-footer"><div id="campaign-coach" aria-live="polite"></div><div class="campaign-controls"><button id="campaign-hint">Hint</button><button id="campaign-guide">Guide</button><button id="campaign-result">Restart</button></div><div id="campaign-save" role="status"></div></footer>`;
  this.root.querySelector('#campaign-hint')!.addEventListener('click',actions.hint);this.root.querySelector('#campaign-guide')!.addEventListener('click',()=>this.guide());this.root.querySelector('#campaign-result')!.addEventListener('click',()=>this.state.status==='playing'?this.actions.restart():this.result());
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();if(this.dialog.dataset.savePending!=='true')this.dialog.close();});this.update();
 }
 get state():CampaignState {const active=this.game.save.active;if(active.kind!=='campaign')throw Error('Campaign UI requires campaign state');return active.state;}
 layout(layout:CampaignLayout){this.root.classList.toggle('campaign-compact',layout.compact);this.root.style.setProperty('--campaign-top',`${layout.topBand}px`);this.root.style.setProperty('--campaign-bottom',`${layout.bottomBand}px`);}
 /** Explicit feedback survives refreshes; null returns ownership to contextual guidance. */
 preview(text:string|null){this.message=text||null;this.renderCoach();}
 private renderCoach(){const active=this.game.save.active;
  const practiceHelp=active.kind==='campaign'&&active.events.some(e=>e.type==='jelly'&&e.phase==='practice-assisted')?'Practice help: the jelly loosened a coating to reopen a route home.':active.kind==='campaign'&&active.events.some(e=>e.type==='jelly'&&e.phase==='practice-waited')?'Practice help: the jelly waited to keep a route home open.':null;
  this.root.querySelector('#campaign-coach')!.textContent=this.message??practiceHelp??phaseCoachCopy(this.state)??dockCoachCopy(this.state)??solarCoachCopy(this.state)??gravityCoachCopy(this.state)??keyCoachCopy(this.state)??gardenCoachCopy(this.state)??shelterCoachCopy(this.state)??bridgeCoachCopy(this.state)??portalCoachCopy(this.state)??pirateCoachCopy(this.state)??currentCoachCopy(this.state)??pupCoachCopy(this.state)??moonwhaleCoachCopy(this.state)??waveCoachCopy(this.state)??evacuationCopy(this.state)??basicCoachCopy(this.state)??'Tap two neighbors or drag to slide.';}
 update(){const state=this.state,save=this.game.save;
  this.root.querySelector('#campaign-level')!.textContent=`${this.previewMode?'Preview':'Mission'} ${state.levelId}`;
  this.root.querySelector('#campaign-coins')!.textContent=`✧ ${save.wallet.coins}`;
  this.root.querySelector('#campaign-goals')!.innerHTML=state.level.goals.slice(0,2).map(goal=>{const done=state.goalProgress.find(g=>g.goalId===goal.id)?.completedIds.length??0,target=goal.eligible.type==='ids'?goal.eligible.ids.length:goal.eligible.target;return `<span>${names[goal.type]} <b>${done}/${target}</b></span>`;}).join('');
  this.root.querySelector('#campaign-turns')!.innerHTML=`<b>${state.movesRemaining??state.turn}</b><span>${state.movesRemaining===null?'MOVES MADE':'MOVES LEFT'}</span>`;
  this.root.querySelector('#campaign-waves')!.textContent=futureWaveCopy(state)??(state.level.metadata.failurePolicy==='no-failure'?(state.level.mechanics.some(m=>m.id==='jelly')?'Practice flight · jelly keeps a route home open':'Practice flight · take as many moves as you need'):'Crew clocks count moves, not seconds');
  this.root.querySelector('#campaign-status')!.textContent=state.status==='won'?'Everyone accounted for · Mission complete':state.status==='lost'?'Another route awaits · Try again':this.game.locked?'Resolving your move…':'';
  this.root.querySelector('#campaign-save')!.textContent=this.game.saveError?'Saving unavailable · keep the app open':this.previewMode?'Isolated lesson preview · progress saved locally':'Progress saved';
  this.root.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=this.game.locked||state.status==='won');
  (this.root.querySelector('#campaign-hint') as HTMLButtonElement).disabled=this.game.locked||state.status!=='playing';
  this.root.querySelector('#campaign-result')!.textContent=state.status==='won'?'Complete!':state.status==='lost'?'Try again':'Restart';
  this.renderCoach();
 }
 celebrate(){
  if(this.root.querySelector('.mission-complete'))return;
  this.dialog.close();
  const card=document.createElement('div');card.className='mission-complete';card.setAttribute('role','status');
  card.innerHTML='<div><img src="/optimized/pepper.webp" alt="Happy Pepper"><h1>Mission complete!</h1><p>Lovely rescuing!</p><span>Flying to your next mission…</span></div>';this.root.append(card);
 }
 async advance(){this.root.querySelector('.mission-complete')?.remove();await this.actions.next();}
 advanceFailed(error:unknown){this.root.querySelector('.mission-complete')?.remove();this.panel('Let’s save your rescue',`<p>${esc(error instanceof Error?error.message:String(error))}</p><button class="primary wide" id="retry-next">Retry saving & fly on</button>`,()=>{this.dialog.dataset.savePending='true';this.dialog.querySelector('.close')?.remove();this.dialog.querySelector('#retry-next')!.addEventListener('click',()=>{this.dialog.close();void this.advance().catch(e=>this.advanceFailed(e));});});}
 panel(title:string,body:string,setup?:()=>void){if(this.game.locked)return;this.dialog.innerHTML=`<div class="panel-inner"><div class="panel-heading"><h1>${esc(title)}</h1><button class="close" aria-label="Close panel">×</button></div>${body}</div>`;this.dialog.querySelector('.close')!.addEventListener('click',()=>this.dialog.close());if(!this.dialog.open)this.dialog.showModal();setup?.();}
 guide(){const prefs=this.game.save.preferences,state=this.state,topics=campaignGuideTopics(state);
  const goals=state.level.goals.map(goal=>`<li>${names[goal.type]}: <b>${state.goalProgress.find(g=>g.goalId===goal.id)?.completedIds.length??0}/${goal.eligible.type==='ids'?goal.eligible.ids.length:goal.eligible.target}</b></li>`).join('');
  this.panel('Your flight guide',`<div class="guide-welcome"><img src="/optimized/commander.webp" alt="Commander Zena"><div><h2>This mission</h2><ul>${goals}</ul></div></div><p class="guide-reassurance">Take your time. Clocks count moves, not seconds. You can retry freely.</p><h2>Slide, grow, rescue</h2><ol class="guide-steps"><li>Drag one tile onto its neighbor to match <b>three equal terrains</b>. The match grows into the next terrain.</li><li>Crew ride their tiles. Biospheres and habitats give them safe ground.</li><li>Bring a guest beside the <b>glowing side entrance</b> of a station to send them home.</li></ol><div class="terrain-chain">${['tile-1-void','tile-2-debris','tile-3-platform','tile-4-biosphere','tile-5-pad','home'].map((name,i)=>`<div><img src="/optimized/${name}.webp" alt=""><span>${['Void','Debris','Platform','Biosphere','Habitat','Station'][i]}</span></div>`).join('')}</div><p class="quiet">Three habitats make a station. Matches of four or more make a rescue shuttle, or a station on high terrain. Crew in the match board the shuttle. Empty shuttles move only with a terrain match; a shuttle with someone aboard can fly one neighboring square per move to a station entrance. Stations can reposition their entrance. Invalid slides cost no moves.</p>${topics.length?`<h2>On this board</h2>${topics.map(t=>`<section class="guide-topic"><h3>${esc(t.title)}</h3><p>${esc(t.body)}</p></section>`).join('')}`:''}<div class="settings"><label>Reduced motion<input id="campaign-motion" type="checkbox" ${prefs.reducedMotion?'checked':''}></label><label>Gentle sounds<input id="campaign-sound" type="checkbox" ${prefs.sound?'checked':''}></label></div><details class="guide-supplies"><summary>Optional rescue supplies</summary><p>${this.game.save.wallet.coins} credits. Every mission has a winning route without supplies. Charges cost no moves.</p>${(Object.keys(boosters) as PowerUpKind[]).map(kind=>`<button class="wide" data-campaign-power="${kind}">${boosters[kind]} - ${this.game.save.wallet.inventory[kind]?`${this.game.save.wallet.inventory[kind]} owned`:`buy for ${POWER_UP_COST[kind]}`}</button>`).join('')}</details><p class="quiet">Your progress stays on this device.</p>`,()=>{
   for(const [id,key] of [['campaign-motion','reducedMotion'],['campaign-sound','sound']] as const)this.dialog.querySelector(`#${id}`)!.addEventListener('change',e=>{this.game.updatePreferences({[key]:(e.target as HTMLInputElement).checked});this.actions.preferences();this.update();});
   this.dialog.querySelectorAll<HTMLButtonElement>('[data-campaign-power]').forEach(b=>b.addEventListener('click',()=>{this.dialog.close();this.actions.power(b.dataset.campaignPower as PowerUpKind);}));
  });
  if(this.game.saveError&&this.actions.retrySave){
   const retry=document.createElement('button');retry.className='primary wide';retry.textContent='Retry saving progress';
   retry.addEventListener('click',async()=>{retry.disabled=true;try{await this.actions.retrySave!();retry.textContent='Progress saved';}catch{retry.textContent='Save unavailable - tap to retry';retry.disabled=false;}});
   this.dialog.querySelector('.panel-heading')!.after(retry);
  }
  const solar=state.fixtures.find(f=>f.kind==='solar');
  if(solar)this.dialog.querySelector('.guide-topic')?.insertAdjacentHTML('beforeend',`<p><img src="/optimized/${terrainArtName(solar.tier)}.webp" alt="Requested ${terrainName(solar.tier)} terrain" style="width:42px;height:42px;vertical-align:middle;margin-right:8px;border:2px solid #ffd278;border-radius:7px">Needs <b>${terrainName(solar.tier)}</b>: ${solar.charge}/${solar.quota} filled.</p>`);
  const crew=state.crew.filter(c=>c.status==='active');
  if(crew.length)this.dialog.querySelector('.panel-inner')!.insertAdjacentHTML('beforeend',`<details><summary>Crew needing help - ${crew.length}</summary>${crew.map((c,i)=>`<p><b>Explorer ${i+1}</b> - row ${c.at.r+1}, column ${c.at.c+1}<br>Oxygen: ${c.rescueMoves===null?'on safe ground':`${c.rescueMoves} moves`}<br>Home request: ${c.shelterMoves===null?'no countdown':`${c.shelterMoves} moves`}</p>`).join('')}</details>`);
 }
 result(){const won=this.state.status==='won';this.panel(won?'A little closer to home':'Another route awaits',`<img class="result-portrait" src="/optimized/${won?'pepper':'commander'}.webp" alt="${won?'Pepper':'Commander Zena'}"><p class="lead">${won?'Your crew and supplies are accounted for.':'Try a different route. There is no wait to retry.'}</p><p>${this.game.saveError?'Progress could not be saved. Keep the app open.':'Your progress is saved.'} Credits and owned supplies are kept.</p><button class="primary wide" id="campaign-continue">${won?'Next mission →':'Try again'}</button><button class="secondary wide" id="campaign-replay">Replay this mission</button>`,()=>{
   this.dialog.querySelector('#campaign-continue')!.addEventListener('click',()=>{this.dialog.close();if(won)void this.actions.next().catch(e=>this.panel('Mission preparation paused',`<p>${esc(String(e instanceof Error?e.message:e))}</p>`));else this.actions.restart();});
   this.dialog.querySelector('#campaign-replay')!.addEventListener('click',()=>{this.dialog.close();this.actions.restart();});
  });}
}
