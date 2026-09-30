import {Container} from 'pixi.js';
import {createApp} from './render/app';
import {loadTextures} from './render/textures';
import {addBackground} from './render/background';
import {CampaignBoard} from './render/campaign/board';
import {CampaignAnimator} from './render/campaign/animator';
import {makeScene} from './render/campaign/snapshot';
import {CampaignInput,directionHint} from './input/campaign';
import {legalActions} from './campaign/engine/actions';
import {transition} from './campaign/engine/turn';
import type {CampaignAction} from './campaign/types';
import {CampaignShell} from './ui/campaignShell';
import type {CampaignSession} from './session/campaignSession';
import {advanceToCampaign} from './session/adapter';
import type {SaveStorage,LevelProvider} from './session/types';
import {flushStorage} from './session/nativeStorage';
import {openBetaMissionPicker} from './ui/releaseNavigation';
import {BETA_CAMPAIGN_IDS} from './campaign/catalog';
export async function bootCampaign(game:CampaignSession,storage:SaveStorage,provider:LevelProvider,previewMode:boolean){
 const state=()=>{const active=game.save.active;if(active.kind!=='campaign')throw Error('Wrong session');return active.state;};
 const {app,layers}=await createApp(),background=new Container();layers.board.addChild(background);addBackground(app,background,()=>game.save.preferences.reducedMotion||document.hidden);
 const original={w:app.screen.width,h:app.screen.height},textures=await loadTextures(app,160,true),board=new CampaignBoard(app,layers,textures,makeScene(state()),()=>game.save.preferences.reducedMotion||document.hidden);
 const animator=new CampaignAnimator(board,()=>game.save.preferences.reducedMotion);
 let presentation=0,audio:AudioContext|undefined,pointerId:number|null=null,lastPreview='';
 const diagnostics=()=>{if(import.meta.env.DEV&&previewMode){const expected=makeScene(state()).entityPositions,rendered=board.renderedEntityPositions;
  app.canvas.dataset.campaignLayout=JSON.stringify(board.layout);app.canvas.dataset.campaignTurn=String(state().turn);app.canvas.dataset.campaignLocked=String(game.locked);
  app.canvas.dataset.campaignSynchronized=String(Object.keys(expected).length===Object.keys(rendered).length&&Object.entries(expected).every(([id,p])=>rendered[id]&&Math.abs(rendered[id]!.r-p.r)<.00001&&Math.abs(rendered[id]!.c-p.c)<.00001));
 }};
 const sound=()=>{if(!game.save.preferences.sound||document.hidden)return;try{audio??=new AudioContext();void audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=state().status==='won'?784:523;gain.gain.setValueAtTime(.03,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.22);}catch{/* Sound remains optional. */}};
 const dispatch=async(action:CampaignAction)=>{
  const result=game.dispatch(action);if(!result)return;if(!result.accepted){shell.preview(result.rejection??'Try another neighboring tile.');return;}
  const token=++presentation;shell.selected=null;input.cancel();board.hint(null);shell.preview(null);shell.update();diagnostics();
  try{await flushStorage(storage);await animator.play(result.events,makeScene(result.state));}
  catch(error){game.saveError=error instanceof Error?error.message:'Could not save progress';shell.preview('Progress is still here. Keep the app open and retry saving from Guide.');}
  finally{if(token===presentation){board.sync(makeScene(state()));game.finishPresentation();shell.update();diagnostics();sound();}}
 };
 const input=new CampaignInput(state,()=>game.locked||shell.dialog.open,a=>{void dispatch(a);});
 const recover=()=>{presentation++;input.cancel();pointerId=null;lastPreview='';animator.cancel();board.sync(makeScene(state()));game.finishPresentation();shell.update();diagnostics();};
 const hint=()=>{const actions=legalActions(state()),guided=state().turn===0&&(state().levelId===111||state().levelId===112)?{type:'swap' as const,from:{r:state().levelId===111?0:1,c:2},to:{r:state().levelId===111?1:2,c:2}}:null;
  const action=(guided&&actions.find(a=>JSON.stringify(a)===JSON.stringify(guided)))||actions[0];if(!action){shell.preview('No slide is available. Open the Guide for supplies or restart.');return;}
  const preview=transition(state(),action),departures=preview.events.flatMap(e=>e.type==='remove'&&e.reason==='departure'&&e.piece.kind==='cargo'?[e.piece.destinationId]:[]),gravity=preview.events.filter(e=>e.type==='gravity');
  board.hint(action,departures);const direction=directionHint(action);shell.preview(`Slide ${direction.word} ${direction.arrow}${gravity.length?` · Gravity next: ${gravity.map(e=>e.after.toUpperCase()).join(' then ')} · refill from ${gravity.at(-1)!.after==='left'?'RIGHT':'TOP'}`:departures.length?' · Evacuate safely':state().levelId===1?' · join three flowering habitats':''}`);
 };
 const saveNow=async()=>{const result=game.persist();if(!result.ok)throw Error(result.error);await flushStorage(storage);game.saveError=null;shell.update();};
 const saveInBackground=()=>{void flushStorage(storage).catch(error=>{game.saveError=String(error);shell.update();});};
 const reloadSavedMission=async()=>{
  try{await flushStorage(storage);location.reload();}
  catch{
   shell.panel('Saving your next mission', '<p>Your mission is ready. Keep the app open and retry saving before continuing.</p><button class="primary wide" id="retry-mission-save">Retry saving</button>',()=>{
    shell.dialog.dataset.savePending='true';shell.dialog.querySelector('.close')?.remove();
    shell.dialog.querySelector('#retry-mission-save')!.addEventListener('click',()=>{void reloadSavedMission();});
   });
  }
 };
 const shell=new CampaignShell(game,{
  hint,retrySave:saveNow,restart:()=>{recover();game.restart();saveInBackground();board.relayout(makeScene(state()));shell.layout(board.layout);shell.preview('A fresh route. Tap two neighbors or drag.');shell.update();diagnostics();},
  next:async()=>{await saveNow();if(!previewMode&&BETA_CAMPAIGN_IDS.every(id=>game.save.completedCampaignIds.includes(id))){
   shell.panel('Every beta mission complete!', '<img class="result-portrait" src="/optimized/pepper.webp" alt="Pepper"><p>You brought a little more life to the stars. Your progress is saved; revisit any mission while the full campaign grows.</p><button class="primary wide" id="all-missions">Replay a mission</button>',()=>shell.dialog.querySelector('#all-missions')!.addEventListener('click',()=>{shell.dialog.close();openBetaMissionPicker(game.save,storage,()=>{void reloadSavedMission();});}));return;
  }await advanceToCampaign(game.save,storage,provider);await reloadSavedMission();},
  preferences:()=>{if(!game.save.preferences.sound)void audio?.suspend();saveInBackground();},
  power:kind=>{input.cancel();if(!game.save.wallet.inventory[kind]){const bought=game.purchase(kind);if(bought)saveInBackground();shell.preview(bought?'Charge purchased. Open Guide to select it.':'More credits needed. Earn them by merging and rescuing.');shell.update();return;}
   if(kind==='wormhole'){void dispatch({type:'booster',kind,at:{r:0,c:0}});return;}shell.selected=shell.selected===kind?null:kind;shell.preview(shell.selected?`${kind==='demo'?'Demolition: tap empty terrain':'Tractor: tap safe terrain or a pod'}. Open Guide to change selection.`:'Selection cancelled.');},
 },previewMode);
 const missions=document.createElement('button');missions.textContent='Missions';missions.setAttribute('aria-label','Choose or replay a mission');
 missions.addEventListener('click',()=>{if(!game.locked&&!shell.dialog.open)openBetaMissionPicker(game.save,storage,()=>{void reloadSavedMission();});});
 shell.root.querySelector('.campaign-controls')!.append(missions);
 const canvas=app.canvas;canvas.setAttribute('aria-label','Campaign rescue board. Drag a tile to its neighbor, or tap two neighboring tiles. Hint describes and shows a legal direction.');
 const cell=(event:PointerEvent)=>{const rect=canvas.getBoundingClientRect();return board.cellAt((event.clientX-rect.left)*app.screen.width/rect.width,(event.clientY-rect.top)*app.screen.height/rect.height);};
 canvas.addEventListener('pointerdown',event=>{if(pointerId!==null||game.locked||shell.dialog.open)return;const at=cell(event);if(!at)return;event.preventDefault();if(shell.selected){void dispatch({type:'booster',kind:shell.selected,at});return;}pointerId=event.pointerId;lastPreview='';canvas.setPointerCapture(event.pointerId);input.start(at);board.hint(null);});
 canvas.addEventListener('pointermove',event=>{if(pointerId!==event.pointerId)return;const at=cell(event),key=at?`${state().turn}:${at.r},${at.c}`:'outside';if(key===lastPreview)return;lastPreview=key;const preview=at?input.preview(at):null;board.hint(preview?.action??null,preview?.departureExitIds);shell.preview(preview?.message??'Release on a neighboring tile to slide.');});
 canvas.addEventListener('pointerup',event=>{if(pointerId!==event.pointerId)return;pointerId=null;input.end(cell(event));board.hint(null);});
 const cancelGesture=()=>{pointerId=null;lastPreview='';input.cancel();board.hint(null);};canvas.addEventListener('pointercancel',cancelGesture);canvas.addEventListener('lostpointercapture',()=>{if(pointerId!==null)cancelGesture();});
 shell.root.addEventListener('pointerdown',cancelGesture);
 const resize=()=>{recover();app.resize();background.scale.set(app.screen.width/original.w,app.screen.height/original.h);board.relayout(makeScene(state()));shell.layout(board.layout);if(state().turn===0&&state().levelId===1)hint();diagnostics();};
 new ResizeObserver(resize).observe(document.getElementById('game')!);
 document.addEventListener('visibilitychange',()=>{recover();if(document.hidden){app.stop();void audio?.suspend();}else{app.start();resize();}});
 window.addEventListener('pagehide',()=>{recover();app.stop();void audio?.suspend();});window.addEventListener('pageshow',()=>{app.start();resize();});window.addEventListener('blur',()=>{recover();void audio?.suspend();});
 window.addEventListener('native-app-state',event=>{recover();const active=(event as CustomEvent<{isActive:boolean}>).detail.isActive;if(active){app.start();resize();}else{app.stop();void audio?.suspend();void flushStorage(storage).catch(error=>{game.saveError=String(error);shell.update();});}});
 shell.layout(board.layout);shell.update();if(state().turn===0&&state().levelId===1)hint();diagnostics();
 // Diagnostics are read-only and exist only on the isolated development route.
 if(import.meta.env.DEV&&previewMode)Object.defineProperty(window,'__campaign',{configurable:true,value:{snapshot:()=>structuredClone(game.save),layout:()=>({...board.layout}),rendered:()=>structuredClone(board.renderedEntityPositions),locked:()=>game.locked}});
}
