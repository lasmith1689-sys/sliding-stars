import { loadLevel } from '../core/level';
import { trySwap, type MoveResult } from '../core/game';
import { usePowerUp, type PowerUpKind } from '../core/powerups';
import type { BoardState, LevelDef, Pos } from '../core/types';
import { emptyWallet, earn, buy, canBuy, useCharge, type Wallet } from './wallet';
import { emptyStation, recordWin, type StationState } from './station';
import {STATIONS,stationDef,vipById} from './roster';

export const RUN_KEY='sliding-stars-next-run-v1';
export interface SaveStorage {getItem(key:string):string|null; setItem(key:string,value:string):void}
export interface Preferences {sound:boolean; reducedMotion:boolean; hints:boolean}
export interface RunData {
  version:1; level:number; initial:LevelDef; board:BoardState; wallet:Wallet;
  station:StationState; claimed:boolean; moves:number; preferences:Preferences; seenTips:string[];
}
export function loadRun(storage:SaveStorage):RunData|null {
  try {
    const raw=storage.getItem(RUN_KEY); if(!raw) return null;
    const d=JSON.parse(raw) as RunData, b=d.board;
    const count=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
    if(d.version!==1||!count(d.level)||d.level<1||!b||!count(b.rows)||!count(b.cols)||b.rows<1||b.cols<1||b.rows>12||b.cols>12) return null;
    const initial=loadLevel(d.initial);
    if(d.initial.id!==d.level||initial.rows!==b.rows||initial.cols!==b.cols||JSON.stringify(initial.mask)!==JSON.stringify(b.mask)||JSON.stringify(initial.goal)!==JSON.stringify(b.goal)) return null;
    for(const matrix of [b.grid,b.mask,b.overlays]) if(!Array.isArray(matrix)||matrix.length!==b.rows||matrix.some(row=>!Array.isArray(row)||row.length!==b.cols)) return null;
    if(b.mask.flat().some(v=>typeof v!=='boolean')) return null;
    for(const p of b.grid.flat()) if(p && !(p.kind==='pod'||p.kind==='dome'&&['left','right'].includes(p.facing)||p.kind==='tile'&&[1,2,3,4,5].includes(p.tier))) return null;
    for(const o of b.overlays.flat()) if(o&&(!['canister','crystal','reactor','comet'].includes(o.kind)||!count(o.hp)||o.kind==='reactor'&&(!count(o.fuse)||!count(o.period)))) return null;
    const pos=(p:{r:number;c:number})=>count(p.r)&&count(p.c)&&!!b.mask[p.r]?.[p.c];
    const vip=(id:unknown)=>id===undefined||typeof id==='string'&&!!vipById(id);
    if(initial.survivors.some(s=>!vip(s.vip))||b.survivors.some(s=>!vip(s.vip)))return null;
    if(!Array.isArray(b.survivors)||b.survivors.some(s=>!pos(s)||!count(s.id)||!['swimming','grounded','inPod','housed','lost'].includes(s.state)||s.need&&(!count(s.need.movesLeft)||!['rescue','shelter'].includes(s.need.type)))) return null;
    if(!Array.isArray(b.rovers)||b.rovers.some(r=>!pos(r)||!count(r.id)||!b.survivors.some(s=>s.id===r.riderId))) return null;
    if(!['playing','won','lost'].includes(b.status)||!['rescueN','collectN'].includes(b.goal.type)||!count(b.goal.n)||![b.points,b.rescued,b.collected,b.needMoves,b.rngState,d.moves].every(count)||b.movesLeft!==null&&!count(b.movesLeft)) return null;
    if(d.claimed!==(b.status==='won')||!count(d.wallet.coins)||!['demo','tractor','wormhole'].every(k=>count(d.wallet.inventory[k as PowerUpKind]))) return null;
    const s=d.station;
    if(![s.totalRescued,s.stationRescued,s.currentStation,s.stationsCompleted].every(count)||![s.collectedVips,s.builtModules,d.seenTips].every(a=>Array.isArray(a)&&a.every(v=>typeof v==='string'))) return null;
    const themes=['aurora','sunset','starlight'],arrangements=['orbit','garden'];
    const rooms=(ids:unknown,index:number)=>Array.isArray(ids)&&new Set(ids).size===ids.length&&ids.every(id=>stationDef(index).modules.some(m=>m.id===id));
    if(s.currentStation>=STATIONS.length||s.stationsCompleted>STATIONS.length||s.collectedVips.some(id=>!vipById(id))||!rooms(s.builtModules,s.currentStation))return null;
    if(s.theme!==undefined&&!themes.includes(s.theme)||s.arrangement!==undefined&&!arrangements.includes(s.arrangement))return null;
    if(s.archives!==undefined&&(!Array.isArray(s.archives)||s.archives.length>STATIONS.length||s.archives.some(a=>!a||!count(a.catalogIndex)||a.catalogIndex>=STATIONS.length||!rooms(a.builtModules,a.catalogIndex)||!themes.includes(a.theme)||!arrangements.includes(a.arrangement))))return null;
    if(!d.preferences||!['sound','reducedMotion','hints'].every(k=>typeof d.preferences[k as keyof Preferences]==='boolean')) return null;
    return d;
  } catch {return null;}
}

export class GameSession {
  data:RunData;
  mode:'playing'|'animating'|'modal'='playing';
  selected:PowerUpKind|null=null;
  saveError=false;
  constructor(def:LevelDef,private storage:SaveStorage) {
    this.data=loadRun(storage)??{version:1,level:def.id,initial:structuredClone(def),board:loadLevel(def),wallet:emptyWallet(),station:emptyStation(),claimed:false,moves:0,preferences:{sound:false,reducedMotion:false,hints:true},seenTips:[]};
  }
  persist():void {try {this.storage.setItem(RUN_KEY,JSON.stringify(this.data));this.saveError=false;} catch {this.saveError=true;}}
  private commit(result:MoveResult,charge?:PowerUpKind):MoveResult|null {
    if(!result.legal) return null;
    const d=this.data;
    d.wallet=earn(d.wallet,result.state.points-d.board.points);
    if(charge) d.wallet=useCharge(d.wallet,charge); else d.moves++;
    d.board=result.state; this.selected=null; this.mode='animating';
    if(d.board.status==='won'&&!d.claimed) {
      d.station=recordWin(d.station,d.board.survivors.filter(s=>s.state==='housed'&&s.vip).map(s=>s.vip!),d.board.rescued);
      d.claimed=true;
    }
    this.persist(); return result;
  }
  swap(a:Pos,b:Pos):MoveResult|null {
    if(this.mode!=='playing'||this.selected||this.data.board.status!=='playing') return null;
    return this.commit(trySwap(this.data.board,a,b));
  }
  purchase(kind:PowerUpKind):boolean {
    if(this.mode==='animating'||!canBuy(this.data.wallet,kind)) return false;
    this.data.wallet=buy(this.data.wallet,kind);this.persist();return true;
  }
  pick(kind:PowerUpKind):MoveResult|null {
    if(this.mode!=='playing'||this.data.board.status!=='playing') return null;
    if(this.selected===kind) {this.selected=null;return null;}
    if(this.data.wallet.inventory[kind]===0) {this.purchase(kind);return null;}
    if(kind==='wormhole') return this.commit(usePowerUp(this.data.board,kind),kind);
    this.selected=kind;return null;
  }
  target(pos:Pos):MoveResult|null {
    if(this.mode!=='playing'||!this.selected||this.data.wallet.inventory[this.selected]<1) return null;
    return this.commit(usePowerUp(this.data.board,this.selected,pos),this.selected);
  }
  replaceLevel(def:LevelDef):void {
    this.data={...this.data,initial:structuredClone(def),level:def.id,board:loadLevel(def),claimed:false,moves:0};
    this.selected=null;this.mode='playing';this.persist();
  }
  restart():void {this.replaceLevel(this.data.initial);}
  finishAnimation():void {this.mode='playing';}
}
