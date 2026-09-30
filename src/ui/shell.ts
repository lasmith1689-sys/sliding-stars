import type {GameSession} from '../meta/run';
import {POWER_UP_COST,type PowerUpKind} from '../core/powerups';
import {buildCost,buildModule,buildableModules,canExpand} from '../meta/station';
import {stationDef,STATIONS,vipById,vipsOfModule} from '../meta/roster';
import {LESSONS} from '../levels/intro';

const art=(name:string)=>`/optimized/${name}.webp`;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const BOOSTERS:Record<PowerUpKind,{name:string;icon:string;description:string}>={
 demo:{name:'Demolition',icon:'✦',description:'Remove an empty terrain tile. Cannot target crew, stations, pods or blockers.'},
 wormhole:{name:'Wormhole',icon:'◎',description:'Rearrange movable terrain into a playable board. Crew ride their tiles; frozen cells stay put.'},
 tractor:{name:'Tractor',icon:'↥',description:'Tap safe terrain or a pod to pull in adjacent drifting crew.'},
};
const STORIES:Record<string,string>={greenhouse:'A little green in the great unknown. Fresh leaves, familiar smells, and somewhere to put down roots.',galley:'Warm meals and a seat for everyone. The heart of a new home.',observatory:'A quiet place to look out and dream about the next journey.',petbay:'Soft beds, friendly paws, and Pepper’s favorite corner of the station.',recdeck:'Games, music and off-duty adventures for the whole crew.',medbay:'A gentle landing after a difficult journey. Everyone deserves good care.',arcade:'Small games. Very big high scores.',diner:'A late-night booth among the stars.',cinema:'Movie night, with a view of the Milky Way.',bakery:'The scent of fresh bread travels surprisingly far in orbit.',library:'Stories from home, and room for new ones.',gym:'Stretch, breathe, and find your feet in zero gravity.'};
type Actions={power:(k:PowerUpKind)=>void;hint:()=>void;restart:()=>void;next:()=>void;settings:()=>void};

export class Shell {
 readonly root=document.getElementById('ui')!;
 readonly dialog=document.getElementById('panel') as HTMLDialogElement;
 private toastTimer=0;
 private previewText='';
 private offlineMessage='Preparing offline play…';
 setOffline(message:string){this.offlineMessage=message;this.dialog.querySelectorAll('[data-offline]').forEach(el=>{el.textContent=message;});}
 constructor(readonly game:GameSession,readonly actions:Actions){
  this.root.innerHTML=`<header class="flight-header"><div class="topline"><div class="wordmark">SLIDING <strong>STARS</strong><span>COMMANDER ZENA’S RESCUE FLEET</span></div><button class="coin-button" id="store" aria-label="Open booster store"><span>✧</span> <b id="coins"></b></button></div><div class="mission-strip"><div><span class="eyebrow" id="sector"></span><strong id="objective"></strong></div><div id="turns" class="turns"></div></div><div class="mission-progress"><i id="goalbar"></i></div><button id="coach" class="coach"></button></header><footer class="flight-footer"><div id="move-preview" aria-live="polite"></div><div class="utility"><button id="station">⌂ <span>My station</span><i id="build-dot" hidden></i></button><button id="hint">✧ <span>Hint</span></button><button id="help">? <span>Guide</span></button></div><div class="boosters">${(Object.keys(BOOSTERS) as PowerUpKind[]).map(k=>`<button data-power="${k}"><span class="booster-icon">${BOOSTERS[k].icon}</span><span>${BOOSTERS[k].name}</span><b></b></button>`).join('')}</div></footer><div class="toast" id="toast" role="status"></div>`;
  this.root.querySelector('#store')!.addEventListener('click',()=>this.store());
  this.root.querySelector('#station')!.addEventListener('click',()=>this.station());
  this.root.querySelector('#help')!.addEventListener('click',()=>this.guide());
  this.root.querySelector('#hint')!.addEventListener('click',()=>actions.hint());
  this.root.querySelector('#coach')!.addEventListener('click',()=>game.data.board.status==='playing'?this.guide():this.result());
  this.root.querySelectorAll<HTMLButtonElement>('[data-power]').forEach(b=>b.addEventListener('click',()=>actions.power(b.dataset.power as PowerUpKind)));
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();if(this.dialog.dataset.busy!=='true')this.close();});
  this.dialog.addEventListener('click',e=>{if(e.target===this.dialog&&this.dialog.dataset.busy!=='true')this.close();});
  this.update();
 }
 update(){
  const d=this.game.data,b=d.board,goal=b.goal.type==='collectN'?'supplies':'crew';
  const progress=b.goal.type==='collectN'?b.collected:b.rescued;
  this.root.querySelector('#coins')!.textContent=d.wallet.coins.toLocaleString();
  this.root.querySelector('#sector')!.textContent=`MISSION ${String(d.level).padStart(2,'0')} · ${b.goal.type==='collectN'?'SUPPLY RUN':'RESCUE OPERATION'}`;
  this.root.querySelector('#objective')!.textContent=b.goal.type==='collectN'?`Recover ${progress}/${b.goal.n} ${goal}`:`Bring home ${b.goal.n} ${goal}`;
  this.root.querySelector('#turns')!.innerHTML=`<strong>${b.movesLeft??`${progress}/${b.goal.n}`}</strong><span>${b.movesLeft!==null?'TURNS LEFT':'HOME SAFE'}</span>`;
  (this.root.querySelector('#goalbar') as HTMLElement).style.width=`${Math.min(100,progress/b.goal.n*100)}%`;
  const coach=this.root.querySelector('#coach')!;
  const hazards=b.overlays.flat();
  coach.textContent=b.status!=='playing'?b.status==='won'?'Mission complete · View rewards & continue →':'Let’s try a different route · Debrief →':this.game.selected?`${BOOSTERS[this.game.selected].name} armed. ${BOOSTERS[this.game.selected].description} Tap its button again to cancel.`:(d.level===1?'Welcome, Commander. Join three flowering habitats. Tap Hint to see the slide; crew ride the match into their new station.':LESSONS[d.level-1])??(hazards.some(o=>o?.kind==='reactor')?'Cool the reactor with adjacent matches before its fuse reaches zero.':hazards.some(o=>o?.kind==='comet')?'Three hits anywhere along the comet clear the whole formation.':b.rovers.length?'Rovers move one step toward a station entrance after each valid swap.':b.goal.type==='collectN'?'Match next to supply crates three times to open them. Plan around your turn budget.':hazards.some(o=>o?.kind==='crystal')?'Match next to ice to free the frozen terrain beneath it.':'Keep crew on safe terrain. Slide a station so its glowing entrance meets them.');
  this.root.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=this.game.mode==='animating');
  this.root.querySelectorAll<HTMLButtonElement>('[data-power]').forEach(button=>{
   const k=button.dataset.power as PowerUpKind,n=d.wallet.inventory[k];
   button.classList.toggle('armed',k===this.game.selected);button.setAttribute('aria-pressed',String(k===this.game.selected));
   button.querySelector('b')!.textContent=n?`×${n}`:`✧${POWER_UP_COST[k]}`;
   button.setAttribute('aria-label',`${BOOSTERS[k].name}, ${n?`${n} owned`:`buy for ${POWER_UP_COST[k]} credits`}`);
   button.disabled=this.game.mode!=='playing'||b.status!=='playing';
  });
  (this.root.querySelector('#build-dot') as HTMLElement).hidden=!canExpand(d.station);
  this.root.querySelector('#move-preview')!.textContent=this.previewText||(this.game.mode==='animating'?'Resolving your move…':this.game.selected?'Choose a target · boosters cost no turns':'Drag to merge · 4+ creates a special');
  if(this.game.saveError)this.toast('Progress could not be saved. Keep this tab open and free some browser storage.');
 }
 preview(message:string){this.previewText=message;this.root.querySelector('#move-preview')!.textContent=message||'Drag to merge · 4+ creates a special';}
 toast(message:string){const el=this.root.querySelector('#toast')!;el.textContent=message;el.classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=window.setTimeout(()=>el.classList.remove('visible'),3800);}
 close(){this.dialog.close();this.dialog.dataset.busy='false';this.game.mode='playing';this.update();}
 panel(title:string,body:string,setup?:()=>void){
  if(this.game.mode==='animating')return;
  this.game.mode='modal';this.game.selected=null;this.preview('');
  this.dialog.innerHTML=`<div class="panel-inner"><div class="panel-heading"><div><span class="eyebrow">SLIDING STARS</span><h1>${title}</h1></div><button class="close" aria-label="Close panel">×</button></div>${body}</div>`;
  this.dialog.querySelector('.close')!.addEventListener('click',()=>this.close());
  if(!this.dialog.open)this.dialog.showModal();
  const offline=document.createElement('p');offline.className='quiet center';offline.dataset.offline='';offline.textContent=this.offlineMessage;this.dialog.querySelector('.panel-inner')!.appendChild(offline);
  this.dialog.scrollTop=0;setup?.();this.update();
 }
 welcome(){this.panel('A home among the stars',`<img class="hero-art" src="${art('mission-control')}" alt="Zena and Pepper at mission control"><p class="lead">Every rescue brings a little more life to your corner of the galaxy.</p><p>Slide and merge terrain, bring your crew home, and build a station together with Pepper.</p><button class="primary wide" id="launch">Launch mission 01 →</button>`,()=>this.dialog.querySelector('#launch')!.addEventListener('click',()=>{this.game.data.seenTips.push('welcome');this.game.persist();this.close();this.actions.hint();}));}
 guide(){
  const prefs=this.game.data.preferences;
  this.panel('Your flight guide',`<p class="lead">Build the ground beneath them. Bring everyone home.</p><div class="terrain-chain">${['tile-1-void','tile-2-debris','tile-3-platform','tile-4-biosphere','tile-5-pad','home'].map((name,i)=>`<div><img src="${art(name)}" alt=""><span>${['Void','Debris','Platform','Biosphere','Habitat','Station'][i]}</span></div>`).join('')}</div><ol class="rules"><li><b>Slide neighboring tiles.</b> Three equal terrain tiles merge into the next tier. The result forms at your destination if it belongs to the match; otherwise at the middle. L/T shapes use the junction. Crew ride the merge and falling terrain.</li><li><b>Plan bigger matches.</b> Four or more dangerous tiles (void, debris, platform), including L/T shapes, make an escape pod. Four or more safe tiles make a station. Three flowering habitats also make a station.</li><li><b>Watch oxygen.</b> The number above a drifter is valid swaps remaining. Reach a biosphere, habitat or pod to become safe. Invalid swaps and boosters use no oxygen. Nothing is timed in real time.</li><li><b>Use the entrance.</b> Crew on a newly built station are rescued immediately. Otherwise bring crew to its glowing side entrance. Pods and stations can slide freely without a match; each slide still uses a turn.</li><li><b>Read the obstacles.</b> Crates need three adjacent matches; ice needs one. Reactors need two cooling hits before their four-turn fuse erupts. Comets share three hits across their cells. Rovers find a route to an entrance.</li><li><b>Make a home.</b> Rescue VIPs to unlock rooms. Three rescues earn the first build. Later rooms need more rescues; the station shows the exact requirement.</li></ol><p class="quiet">This is an original space adaptation. These combo rules are our design, not a claim of exact Sliding Seas parity.</p><div class="settings">${(['sound','reducedMotion','hints'] as const).map(k=>`<label><span>${{sound:'Gentle sound effects',reducedMotion:'Reduced motion',hints:'Automatic hints'}[k]}</span><input type="checkbox" data-setting="${k}" ${prefs[k]?'checked':''}></label>`).join('')}</div><button class="secondary wide" id="restart">Restart this mission</button><p class="quiet">Your station, credits and owned boosters are kept. Spent boosters are not refunded.</p>`,()=>{
   this.dialog.querySelectorAll<HTMLInputElement>('[data-setting]').forEach(input=>input.addEventListener('change',()=>{prefs[input.dataset.setting as keyof typeof prefs]=input.checked;this.game.persist();this.actions.settings();}));
   const restart=this.dialog.querySelector('#restart') as HTMLButtonElement;
   restart.disabled=this.game.data.claimed;
   if(this.game.data.claimed)restart.textContent='Mission completed · continue from the debrief';
   restart.addEventListener('click',()=>{this.close();this.actions.restart();});
  });
 }
 store(){
  this.panel('Rescue supplies',`<p class="lead">A little help for a tricky corner.</p><p>You have <b>${this.game.data.wallet.coins.toLocaleString()} credits</b>. Earn more by merging terrain and rescuing crew. No purchases with real money.</p><div class="shop-list">${(Object.keys(BOOSTERS) as PowerUpKind[]).map(k=>`<article><div class="shop-symbol">${BOOSTERS[k].icon}</div><div><h2>${BOOSTERS[k].name}</h2><p>${BOOSTERS[k].description}</p><span class="quiet">${this.game.data.wallet.inventory[k]} owned · no turn cost</span><button data-buy="${k}" ${this.game.data.wallet.coins<POWER_UP_COST[k]?'disabled':''}>Buy one · ✧ ${POWER_UP_COST[k]}</button></div></article>`).join('')}</div>`,()=>{
   this.dialog.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(button=>button.addEventListener('click',()=>{const k=button.dataset.buy as PowerUpKind;if(this.game.purchase(k)){this.store();this.toast(`${BOOSTERS[k].name} added to your supplies`);}}));
  });
 }
 station(archiveIndex?:number){
  const s=this.game.data.station,archive=archiveIndex===undefined?undefined:s.archives?.[archiveIndex];
  const catalog=stationDef(archive?.catalogIndex??s.currentStation),built=archive?.builtModules??s.builtModules;
  const theme=archive?.theme??s.theme??'aurora',arrangement=archive?.arrangement??s.arrangement??'orbit';
  const complete=s.stationsCompleted>=STATIONS.length;
  this.panel(catalog.name,`<div class="station-scene ${theme} ${arrangement}"><div class="orbital-track"></div><img class="station-core" src="${art('station-core')}" alt="Central station">${catalog.modules.map((m,i)=>`<img class="orbit-room ${built.includes(m.id)?'':'unbuilt'}" style="--i:${i}" src="${art(`module-${m.id}`)}" alt="${esc(m.name)} ${built.includes(m.id)?'built':'not built'}">`).join('')}<span class="scene-caption">${archive?'COMPLETED STATION':`${built.length} / ${catalog.modules.length} ROOMS BUILT`}</span></div><div class="station-summary"><b>${s.totalRescued} crew brought home</b><span>${s.collectedVips.length} VIPs · ${s.stationsCompleted} stations completed</span></div>${!archive?`<div class="customize"><label>Atmosphere <select id="theme">${['aurora','sunset','starlight'].map(t=>`<option ${theme===t?'selected':''}>${t}</option>`).join('')}</select></label><label>Arrangement <select id="arrangement"><option value="orbit" ${arrangement==='orbit'?'selected':''}>Orbit</option><option value="garden" ${arrangement==='garden'?'selected':''}>Garden</option></select></label></div><p class="build-note">${complete?'Your two stations are complete. Keep exploring, rescuing crew and collecting VIPs.':`Next room: ${Math.min(s.stationRescued,buildCost(s))} / ${buildCost(s)} rescues${canExpand(s)?' · Ready to build!':' · Requires a matching VIP'}`}</p>`:''}<div class="room-grid">${catalog.modules.map(m=>{
   const crew=vipsOfModule(m.id),have=crew.filter(v=>s.collectedVips.includes(v.id)),isBuilt=built.includes(m.id);
   return `<article><img src="${art(`module-${m.id}`)}" alt=""><h2>${m.name}</h2><p>${STORIES[m.id]??''}</p><span class="quiet">${have.length?have.map(v=>v.name).join(' & '):`Rescue ${crew.map(v=>v.name).join(' or ')}`}</span><button data-room="${m.id}" ${archive||isBuilt||!canExpand(s)||!buildableModules(s).includes(m.id)?'disabled':''}>${isBuilt?'Built ✓':!have.length?'VIP needed':s.stationRescued<buildCost(s)?`${buildCost(s)-s.stationRescued} more rescues`:'Build room ✦'}</button></article>`;
  }).join('')}</div><h2 class="section-label">Meet your crew</h2><div class="crew-grid">${catalog.vips.map(v=>`<button data-vip="${v.id}" ${s.collectedVips.includes(v.id)?'':'disabled'}><img class="${s.collectedVips.includes(v.id)?'':'unbuilt'}" src="${art(`vip-${v.id}`)}" alt=""><span>${v.name}</span><small>${s.collectedVips.includes(v.id)?'Home safe':'Still exploring'}</small></button>`).join('')}</div>${s.archives?.length?`<h2 class="section-label">Your fleet</h2><div class="fleet-nav"><button data-current>Current station</button>${s.archives.map((a,i)=>`<button data-archive="${i}">${stationDef(a.catalogIndex).name} ✓</button>`).join('')}</div>`:''}`,()=>{
   this.dialog.querySelectorAll<HTMLButtonElement>('[data-room]').forEach(button=>button.addEventListener('click',()=>{const out=buildModule(this.game.data.station,button.dataset.room!);this.game.data.station=out.state;this.game.persist();this.station();this.toast(out.completed?'A whole station, a whole new home. Well done, Commander.':'Your new room is ready. Welcome home!');}));
   this.dialog.querySelectorAll<HTMLSelectElement>('select').forEach(select=>select.addEventListener('change',()=>{if(select.id==='theme')s.theme=select.value as typeof s.theme;else s.arrangement=select.value as typeof s.arrangement;this.game.persist();this.station();}));
   this.dialog.querySelectorAll<HTMLButtonElement>('[data-vip]').forEach(button=>button.addEventListener('click',()=>{const v=vipById(button.dataset.vip!)!;this.toast(`${v.name} is home safe. ${STORIES[v.module]??''}`);}));
   this.dialog.querySelector('[data-current]')?.addEventListener('click',()=>this.station());
   this.dialog.querySelectorAll<HTMLButtonElement>('[data-archive]').forEach(button=>button.addEventListener('click',()=>this.station(Number(button.dataset.archive))));
  });
 }
 result(){
  const d=this.game.data,b=d.board,won=b.status==='won';
  const vips=b.survivors.filter(s=>s.state==='housed'&&s.vip).map(s=>vipById(s.vip!)?.name??s.vip!);
  this.panel(won?'A little closer to home':'Another route awaits',`<img class="result-portrait" src="${art(won?'pepper':'commander')}" alt="${won?'Pepper':'Commander Zena'}"><p class="lead">${won?(b.goal.type==='collectN'?`${b.collected} supplies recovered. The station is well stocked.`:`${b.rescued} crew home safe. ${b.rescued===1?'A life changed.':'Every rescue matters.'}`):b.survivors.some(s=>s.state==='lost')?'A drifter ran out of oxygen. Bring them to safe terrain earlier, or make a pod.':'The turn budget ran out. Match beside crates to make each turn count.'}</p><div class="reward-row"><span><b>✧ ${b.points}</b>credits earned</span><span><b>${d.moves}</b>swaps made</span></div>${vips.length?`<p class="vip-welcome">Welcome aboard, ${vips.map(esc).join(' and ')}!</p>`:''}${won&&canExpand(d.station)?'<button class="secondary wide" id="build">A new station room is ready →</button>':''}<button class="primary wide" id="continue">${won?'Next mission →':'Try this mission again'}</button><p class="quiet center">${this.game.saveError?'Saving unavailable — keep this tab open':'Progress saved'} · ${won?'Rewards already added to your fleet':'Credits earned are yours to keep'}</p>`,()=>{
   this.dialog.querySelector('#build')?.addEventListener('click',()=>this.station());
   this.dialog.querySelector('#continue')!.addEventListener('click',()=>{this.close();won?this.actions.next():this.actions.restart();});
  });
 }
 loading(){this.panel('Charting your next mission',`<div class="loading-orbit">✦</div><p class="center">Checking the rescue route…</p>`);this.dialog.dataset.busy='true';(this.dialog.querySelector('.close') as HTMLButtonElement).disabled=true;}
 error(message:string){this.dialog.dataset.busy='false';this.panel('Mission preparation paused',`<p>${esc(message)}</p><button class="primary wide" id="retry-load">Try again</button>`,()=>this.dialog.querySelector('#retry-load')!.addEventListener('click',()=>this.actions.next()));}
}
