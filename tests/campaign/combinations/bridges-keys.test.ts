import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {parseCampaignLevel,parseCampaignState} from '../../../src/campaign/schema';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {createContext} from '../../../src/campaign/engine/context';
import {refillPieces} from '../../../src/campaign/engine/settle';
import {bridgeMerge} from '../fixtures/bridges';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
const level=()=>getAuthoredLessonLevel(565)!;
it.each(['gate','bridge'] as const)('%s opens first without stealing the other footprint; both partial states refill and reload',first=>{
 const c=createContext(loadCampaignLevel(level())),gate=c.state.fixtures.find(f=>f.kind==='gate')!,bridge=c.state.fixtures.find(f=>f.kind==='bridge')!,lock=c.state.fixtures.find(f=>f.kind==='lock')!;
 if(gate.kind!=='gate'||bridge.kind!=='bridge'||lock.kind!=='lock')throw Error('fixture');
 const openGate=()=>{c.state.pieces=c.state.pieces.filter(p=>p.at.r!==lock.at.r||p.at.c!==lock.at.c);const key=c.state.pieces.find(p=>p.id===lock.keyId)!;key.at={...lock.at};campaignModules.find(m=>m.id==='keys')!.beforeRefill!(c);};
 const openBridge=()=>{for(const id of ['one','two']){const merge=bridgeMerge(id);merge.cells=[bridge.at,{r:bridge.at.r,c:bridge.at.c-1},{r:bridge.at.r,c:bridge.at.c+1}];campaignModules.find(m=>m.id==='bridges')!.onMerge!(c,merge);}};
 if(first==='gate')openGate();else openBridge();refillPieces(c);
 expect(gate.open).toBe(first==='gate');expect(bridge.active).toBe(first==='bridge');expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
 if(first==='gate')openBridge();else openGate();refillPieces(c);expect(c.state.geometry.inactiveCells).toEqual([]);expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
});
it('real shared-board turns preserve independently opened ownership across save boundaries',()=>{
 let s=loadCampaignLevel(level());const phases:boolean[][]=[];
 for(const action of lessonTeachingActions[565]!){const restored=parseCampaignState(JSON.parse(JSON.stringify(s))),r=transition(restored,action);expect(r.accepted).toBe(true);expect(transition(s,action)).toEqual(r);s=r.state;phases.push(s.fixtures.filter(f=>f.kind==='gate'||f.kind==='bridge').map(f=>f.kind==='gate'?f.open:f.active));}
 expect(phases.some(p=>p.some(Boolean)&&!p.every(Boolean))).toBe(true);expect(s.status).toBe('won');
});
it('rejects overlapping ownership, foreign links, unsafe ordered supply and forged saved topology',()=>{
 const overlap=level(),g=overlap.fixtures.find(f=>f.kind==='gate')!,b=overlap.fixtures.find(f=>f.kind==='bridge')!;if(g.kind!=='gate'||b.kind!=='bridge')throw Error('fixture');g.cells=[...b.cells];expect(()=>parseCampaignLevel(overlap)).toThrow(/own|bridge|gate/i);
 const links=level(),gate=links.fixtures.find(f=>f.kind==='gate')!,bridge=links.fixtures.find(f=>f.kind==='bridge')!;if(gate.kind!=='gate'||bridge.kind!=='bridge')throw Error('fixture');gate.connectionIds=bridge.connectionIds;expect(()=>parseCampaignLevel(links)).toThrow(/link|connection/i);
 const bad=loadCampaignLevel(level()),segment=bad.geometry.gravitySegments.find(s=>s.cells.some(p=>p.r===3&&p.c===1))!;segment.cells.reverse();expect(()=>parseCampaignState(bad)).toThrow(/gravity|directed|refill/i);
 const dependent=level(),dg=dependent.fixtures.find(f=>f.kind==='gate')!;if(dg.kind!=='gate')throw Error('fixture');dependent.geometry.inactiveCells.push({r:2,c:1});dependent.pieces=dependent.pieces.filter(p=>p.at.r!==2||p.at.c!==1);dg.at={r:1,c:1};dg.cells=[{r:2,c:1}];dg.connectionIds=[];
 const db=dependent.fixtures.find(f=>f.kind==='bridge')!;if(db.kind==='bridge')db.cells.push({r:3,c:1});
 expect(()=>parseCampaignLevel(dependent)).toThrow(/refill/i);
});
