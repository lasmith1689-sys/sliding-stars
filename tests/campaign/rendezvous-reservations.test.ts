import {expect,it} from 'vitest';
import {baseLevel} from './fixtures/base';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {parseCampaignState} from '../../src/campaign/schema';
import {transition} from '../../src/campaign/engine/turn';
import {legalActions} from '../../src/campaign/engine/actions';
import {createContext} from '../../src/campaign/engine/context';
import {resolveCrewSafety} from '../../src/campaign/engine/needs';
import {docks} from '../../src/campaign/mechanics/docks';

// Reduced from a reachable mission 961 detour: a station grew beside a departure pod.
function level(){
 const l=baseLevel([[1,2,1,2],['P',1,2,1],[1,2,1,'P'],[2,1,'S',1]]);l.id=961;l.chapter=20;
 const first=l.pieces.find(p=>p.at.r===2&&p.at.c===3)!,second=l.pieces.find(p=>p.at.r===1&&p.at.c===0)!,station=l.pieces.find(p=>p.kind==='station')!;
 if(first.kind!=='pod'||second.kind!=='pod'||station.kind!=='station')throw Error('Fixture');
 first.passengerIds=['first'];second.passengerIds=['second'];station.facing='right';
 l.crew=[{...l.crew[0]!,id:'first',at:first.at,carrierId:first.id,rescueMoves:null},{...l.crew[0]!,id:'second',at:second.at,carrierId:second.id,rescueMoves:null}];
 l.geometry.endpoints=[{id:'pad-first',kind:'staging',at:{r:3,c:1},active:true},{id:'pad-second',kind:'staging',at:{r:3,c:3},active:true}];
 l.mechanics=[{id:'rendezvous',endpointIds:['pad-first','pad-second'],passengerIds:['first','second']}];
 l.goals=[{id:'depart',type:'simultaneousDepartures',eligible:{type:'ids',ids:['first','second']}}];return l;
}

it('a reachable mission 961 station door cannot steal a paired-departure passenger or crash a legal move',()=>{
 const state=loadCampaignLevel(level()),action={type:'swap' as const,from:{r:2,c:3},to:{r:3,c:3}};
 expect(legalActions(state)).toContainEqual(action);
 const result=transition(state,action);
 expect(result.accepted).toBe(true);
 expect(result.state.crew.every(c=>c.status==='active'&&c.carrierId!==null)).toBe(true);
 expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
});

it('a paired-departure pod cannot board an unrelated guest during safety resolution',()=>{
 const state=loadCampaignLevel(level()),pod=state.pieces.find(p=>p.kind==='pod'&&p.passengerIds.includes('first'))!;
 state.crew.push({id:'visitor',at:{...pod.at},carrierId:null,status:'active',rescueMoves:12,shelterMoves:null,shelterStarted:false,vipId:null});
 const context=createContext(state);resolveCrewSafety(context);
 expect(state.crew.find(c=>c.id==='visitor')!.carrierId).toBeNull();
 expect(state.pieces.find(p=>p.id===pod.id)).toMatchObject({passengerIds:['first']});
});

it('tractor supply cannot add a guest to a reserved departure pod and a rejected target changes nothing',()=>{
 const l=level(),at={r:1,c:3};l.crew.push({id:'visitor',at,carrierId:null,status:'active',rescueMoves:12,shelterMoves:null,shelterStarted:false,vipId:null});
 const state=loadCampaignLevel(l),pod=state.pieces.find(p=>p.kind==='pod'&&p.passengerIds.includes('first'))!;
 const result=transition(state,{type:'booster',kind:'tractor',at:pod.at});
 expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
});

it('a passing moving dock cannot board the passenger reserved for paired departure',()=>{
 const state=loadCampaignLevel(level()),pod=state.pieces.find(p=>p.kind==='pod'&&p.passengerIds.includes('first'))!;
 state.geometry.endpoints.push({id:'dock-door',kind:'station',at:{...pod.at},active:true});
 state.actors.push({id:'passing-dock',kind:'dock',at:{r:pod.at.r,c:pod.at.c-1},entrance:{...pod.at},routeId:'unused',routeIndex:0,endpointId:'dock-door'});
 state.mechanics.push({id:'docks',boardedIds:[]});
 expect(docks.settle!(createContext(state))).toBe(false);
 expect(state.crew.find(c=>c.id==='first')).toMatchObject({status:'active',carrierId:pod.id});
});
