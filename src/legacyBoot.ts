import {Container,Graphics} from 'pixi.js';
import {createApp} from './render/app';
import {addBackground,drawBoardFrame} from './render/background';
import {loadTextures} from './render/textures';
import {BoardView} from './render/boardView';
import {Animator} from './render/animator';
import {initTweens} from './render/tween';
import {attachDrag} from './input/drag';
import {findHint} from './core/shuffle';
import {directionHint} from './input/campaign';
import {isLegalSwap,swapMatches} from './core/moves';
import type {MoveResult} from './core/game';
import type {Pos} from './core/types';
import type {SaveStorage,LevelProvider} from './session/types';
import {advanceToCampaign,type LegacySession} from './session/adapter';
import {flushStorage} from './session/nativeStorage';
import {Capacitor} from '@capacitor/core';



import {Shell} from './ui/shell';
import './ui/style.css';

export async function bootLegacy(game:LegacySession,storage:SaveStorage,provider:LevelProvider){
 const fresh=!game.data.seenTips.includes('welcome');
 const {app,layers}=await createApp();
 const background=new Container();layers.board.addChild(background);
 const originalSize={width:app.screen.width,height:app.screen.height};
 addBackground(app,background,()=>game.data.preferences.reducedMotion);
 const frame=new Container();layers.board.addChild(frame);
 const textures=await loadTextures(app,160);
 const view=new BoardView(app,layers,textures,game.data.board);
 initTweens(app);const animator=new Animator(view,layers);
 const highlight=new Graphics();layers.fx.addChild(highlight);
 let lastInteraction=Date.now(),hintShown=false,resizePending=false,presentation=0;
 let cancelDrag=()=>{};
 let audio:AudioContext|undefined;
 const chime=(won:boolean)=>{
  if(!game.data.preferences.sound)return;
  try{audio??=new AudioContext();void audio.resume();
   for(let i=0;i<(won?3:1);i++){
    const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+i*.12;
    osc.type='sine';osc.frequency.value=[523,659,784][i]!;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.045,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.22);
    osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.23);
   }
  }catch(error){console.warn('Sound unavailable',error);}
 };
 const clearHint=()=>{lastInteraction=Date.now();hintShown=false;highlight.clear();};
 const outline=(p:Pos,color:number)=>{const xy=view.cellXY(p.r,p.c),ts=view.layout.tileSize;highlight.roundRect(xy.x+2,xy.y+2,ts-4,ts-4,9).stroke({color,width:3});};
 const preview=(a:Pos|null,b:Pos|null)=>{
  highlight.clear();
  if(!a||!b){shell.preview('');return;}
  const legal=isLegalSwap(game.data.board,a,b);
  outline(a,legal?0xc3ffe8:0xff9696);outline(b,legal?0xc3ffe8:0xff9696);
  if(!legal){shell.preview('This swap needs a match of three');return;}
  const matches=swapMatches(game.data.board,a,b);
  const special=(m:typeof matches[number])=>m.cells.length>=4||matches.some(n=>n!==m&&n.tier===m.tier&&n.cells.some(p=>m.cells.some(q=>p.r===q.r&&p.c===q.c)));
  const large=matches.find(special);
  for(const m of matches)for(const cell of m.cells)outline(cell,0xb6fbe0);
  const station=matches.some(m=>m.tier===5||m.tier>=4&&special(m));
  shell.preview(station?'Station combo · bring crew home':large?'Escape pod combo · a safe place for crew':matches.length?'Merge terrain · crew ride the match':'Free slide · line up the station entrance');
 };
 const showHint=()=>{
  if(game.mode!=='playing'||game.selected||game.data.board.status!=='playing')return;
  const hint=findHint(game.data.board);clearHint();
  if(!hint){shell.toast('No legal slide found. Try a Wormhole or restart from the guide.');return;}
  preview(hint[0],hint[1]);
  const direction=directionHint({type:'swap',from:hint[0],to:hint[1]});shell.preview(`Slide ${direction.word} ${direction.arrow}`);
  const from=view.cellCenter(hint[0].r,hint[0].c),to=view.cellCenter(hint[1].r,hint[1].c);
  highlight.moveTo(from.x,from.y).lineTo(to.x,to.y).stroke({color:0xffffff,width:3,alpha:.8});
  const dx=Math.sign(to.x-from.x),dy=Math.sign(to.y-from.y);
  highlight.moveTo(to.x-dx*9+dy*5,to.y-dy*9-dx*5).lineTo(to.x,to.y).lineTo(to.x-dx*9-dy*5,to.y-dy*9+dx*5).stroke({color:0xffffff,width:3});
  hintShown=true;
 };
 const resize=()=>{
  cancelDrag();
  if(game.mode==='animating'){presentation++;animator.cancel();game.finishAnimation();shell.update();}
  app.resize();background.scale.set(app.screen.width/originalSize.width,app.screen.height/originalSize.height);
  highlight.clear();view.relayout(game.data.board);drawBoardFrame(frame,game.data.board.mask,view.layout);
  app.stage.hitArea=app.screen;resizePending=false;
 };
 const render=()=>{view.reducedMotion=game.data.preferences.reducedMotion;view.relayout(game.data.board);drawBoardFrame(frame,game.data.board.mask,view.layout);shell.update();clearHint();};
 const play=async(result:MoveResult|null)=>{
  clearHint();shell.update();if(!result)return;
  const token=++presentation;
  try{
   if(game.data.preferences.reducedMotion)view.syncFrom(result.state);
   else await animator.play(result.events,result.state);
  }finally{if(token===presentation){game.finishAnimation();if(resizePending)resize();shell.update();lastInteraction=Date.now();}}
  if(token!==presentation)return;
  chime(result.state.status==='won');
  const shuffled=result.events.some(e=>e.type==='shuffle');
  if(result.state.status!=='playing')shell.result();
  else if(shuffled)shell.toast('No moves remained. Loose terrain was rearranged; crew stayed aboard.');
  else if(result.events.some(e=>e.type==='podCreated'))shell.toast('Escape pod ready. Crew aboard are safe; slide them toward a station entrance.');
  else if(result.events.some(e=>e.type==='domeCreated'))shell.toast('Station ready. The glowing cell beside its door is the boarding entrance.');
 };
 const next=async()=>{
  shell.loading();clearHint();
  try{
   await flushStorage(storage);
   await advanceToCampaign(game.save,storage,provider);
   await flushStorage(storage);
   location.reload();
  }catch(error){shell.error(error instanceof Error?error.message:String(error));}
 };
 const shell=new Shell(game,{
  power:kind=>{
   clearHint();const before=game.data.wallet.inventory[kind],result=game.pick(kind);
   if(game.data.wallet.inventory[kind]>before)shell.toast('Charge purchased. Tap again when you are ready to use it.');
   else if(!before&&!result)shell.toast('More credits needed. Earn them by merging and rescuing.');
   else if(kind==='wormhole'&&!result)shell.toast('There is no useful rearrangement available. Your charge is kept.');
   void play(result);
  },
  hint:showHint,restart:()=>{game.restart();render();},next:()=>{void next();},settings:()=>{view.reducedMotion=game.data.preferences.reducedMotion;clearHint();},
 });
 render();game.persist();
 cancelDrag=attachDrag(app,view,()=>game.data.board,(a,b)=>{
  const result=game.swap(a,b);
  if(!result){view.syncFrom(game.data.board);shell.toast('Join three matching tiles, or slide a pod or station.');}
  void play(result);
 },()=>game.mode!=='playing'||game.selected!==null,preview);
 app.stage.on('pointerdown',clearHint);
 app.stage.on('pointertap',e=>{
  if(game.mode!=='playing'||!game.selected)return;
  const cell=view.cellAt(e.globalX,e.globalY);if(!cell)return;
  const result=game.target(cell);if(!result)shell.toast('That target will not work. Your booster is still selected.');
  void play(result);
 });
 new ResizeObserver(resize).observe(document.getElementById('game')!);
 const recover=()=>{cancelDrag();presentation++;animator.cancel();if(game.mode==='animating')game.finishAnimation();view.syncFrom(game.data.board);shell.update();};
 document.addEventListener('visibilitychange',()=>{recover();if(document.hidden){app.stop();void audio?.suspend();}else{app.start();resize();}});
 window.addEventListener('pagehide',()=>{recover();app.stop();void audio?.suspend();});
 window.addEventListener('pageshow',()=>{app.start();resize();});
 window.addEventListener('blur',()=>{recover();void audio?.suspend();});
 setInterval(()=>{if(game.data.preferences.hints&&!hintShown&&Date.now()-lastInteraction>9000)showHint();},1000);
 app.canvas.setAttribute('aria-label','Rescue puzzle board. Drag adjacent tiles to match. Use the Guide for rules and Hint for a legal move.');
 if(fresh)shell.welcome();else if(game.data.board.status!=='playing')shell.result();
 // Read-only diagnostic snapshot for device checks; never an alternate mutation path.
 if(import.meta.env.DEV)Object.defineProperty(window,'__game',{value:{snapshot:()=>structuredClone(game.data),layout:()=>({...view.layout})},configurable:true});
 if(import.meta.env.PROD&&!Capacitor.isNativePlatform()&&'serviceWorker'in navigator){
  shell.setOffline('Installing the offline pack. Keep this page open for a moment.');
  void navigator.serviceWorker.register('/sw.js').then(()=>navigator.serviceWorker.ready).then(()=>shell.setOffline('Legacy offline pack installed · Complete campaign offline readiness has not been verified.')).catch(error=>{shell.setOffline('Offline installation unavailable in this browser. Try Safari or Chrome.');console.warn('Offline installation unavailable',error);});
 }else shell.setOffline(import.meta.env.DEV?'Development preview · Offline readiness has not been verified.':'This browser does not support offline installation. Try Safari or Chrome.');
}


