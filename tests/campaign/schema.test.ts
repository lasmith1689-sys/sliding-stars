import { describe, expect, it } from 'vitest';
import { parseCampaignAction, parseCampaignEvents, parseCampaignLevel, parseCampaignState, parseSolutionTrace } from '../../src/campaign/schema';
import { validateCompatibility } from '../../src/campaign/compatibility';
import { getCampaignLevel } from '../../src/campaign/catalog';
import { INTRO, LESSONS } from '../../src/levels/intro';
import { LEGACY_INTRO_FIXTURES, LEGACY_LESSON_FIXTURES } from './legacy-intro-fixtures';
import { levelFixture, stateFixture } from './fixtures';
import type { CampaignLevel } from '../../src/campaign/types';
import {priorJellyWarningState} from './fixtures/jelly-prior-warning';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {jellyEligible} from '../../src/campaign/mechanics/jelly';

function gardenLevel():CampaignLevel{
  const level=levelFixture();level.id=516;level.chapter=11;
  level.geometry.endpoints.push({id:'exit',kind:'exit',at:{r:2,c:0},active:true});
  level.fixtures=[{kind:'garden',id:'garden',at:{r:1,c:1},stage:0,harvestId:'crop',exitId:'exit',outputAt:{r:0,c:1}}];
  level.mechanics=[{id:'gardens',fixtureIds:['garden']},{id:'exits',endpointIds:['exit']}];
  return level;
}
function pirateLevel():CampaignLevel{
  const level=levelFixture();level.id=326;level.chapter=7;
  level.geometry.endpoints.push({id:'supply',kind:'supply-dock',at:{r:1,c:2},active:true});
  level.geometry.routes=[{id:'track',cells:[{r:1,c:1},{r:1,c:2}],loop:false}];
  level.actors=[{kind:'pirate',id:'pirate',at:{r:1,c:1},routeId:'track',routeIndex:0,dockId:'supply',distraction:2,parcelId:'parcel'}];
  level.mechanics=[{id:'pirates',actorIds:['pirate']}];
  return level;
}

describe('versioned campaign boundaries',()=>{
  it('parses a valid authored level into independent data',()=>{
    const input=levelFixture(), parsed=parseCampaignLevel(input);
    input.pieces[0]!.at.r=2;
    expect(parsed.pieces[0]!.at).toEqual({r:0,c:0});
  });
  it.each(['future-2','legacy-1',''])('rejects unknown campaign rules %s',rulesVersion=>{
    expect(()=>parseCampaignLevel({...levelFixture(),rulesVersion})).toThrow(/rulesVersion/);
  });
  it('rejects duplicate entity IDs across layers',()=>{
    const level=levelFixture();level.crew[0]!.id='tile-1';
    expect(()=>parseCampaignLevel(level)).toThrow(/duplicate/i);
  });
  it('rejects missing goal, passenger and route references',()=>{
    const level=levelFixture();level.goals[0]!.eligible={type:'ids',ids:['missing']};
    expect(()=>parseCampaignLevel(level)).toThrow(/reference/i);
    const passenger=levelFixture();passenger.crew[0]!.carrierId='missing';
    expect(()=>parseCampaignLevel(passenger)).toThrow(/reference/i);
    const route=levelFixture();route.actors=[{kind:'rover',id:'rover',at:{r:1,c:1},routeId:'missing',passengerIds:[],routeIndex:0}];
    expect(()=>parseCampaignLevel(route)).toThrow(/reference/i);
  });
  it('rejects out-of-mask and inactive placements and bad gravity references',()=>{
    const level=levelFixture();level.geometry.mask[0]![0]=false;
    expect(()=>parseCampaignLevel(level)).toThrow(/cell/i);
    const inactive=levelFixture();inactive.geometry.inactiveCells=[{r:0,c:0}];
    expect(()=>parseCampaignLevel(inactive)).toThrow(/inactive/i);
    const gravity=levelFixture();gravity.geometry.refillSources[0]!.segmentId='missing';
    expect(()=>parseCampaignLevel(gravity)).toThrow(/reference/i);
  });
  it('rejects impossible goal targets and more than two goals',()=>{
    const level=levelFixture();level.goals[0]!.eligible={type:'sources',sourceIds:['crew-1'],target:2};
    expect(()=>parseCampaignLevel(level)).toThrow(/target/i);
    expect(()=>parseCampaignLevel({...levelFixture(),goals:[]})).toThrow(/goals/);
  });
  it('rejects malformed mechanic and actor payloads instead of accepting arbitrary objects',()=>{
    const level=levelFixture();
    expect(()=>parseCampaignLevel({...level,mechanics:[{id:'reactors',fixtureIds:['reactor'],surprise:true}]})).toThrow();
    expect(()=>parseCampaignLevel({...level,actors:[{kind:'rover',id:'r',at:{r:0,c:0},routeId:'r'}]})).toThrow();
  });
  it('accepts complete state snapshots and rejects malformed counters and queues',()=>{
    expect(parseCampaignState(stateFixture()).rngState).toBe(7);
    for(const change of [{turn:-1},{nextEntityId:1.5},{rngState:NaN},{points:Infinity},{status:'maybe'},{pendingTransfers:[{crewId:'ghost',destinationId:'home'}]}]){
      expect(()=>parseCampaignState({...stateFixture(),...change})).toThrow();
    }
    const state=stateFixture();state.goalProgress[0]!.completedIds=['crew-1','crew-1'];
    expect(()=>parseCampaignState(state)).toThrow(/duplicate/i);
  });
  it('normalizes only the exact suppressed prior practice forecast',()=>{
    const old=priorJellyWarningState();
    const restored=parseCampaignState(old);
    expect(restored.fixtures.find(f=>f.kind==='jelly')?.preview).toBeNull();
    const stale=structuredClone(old),jelly=stale.fixtures.find(f=>f.kind==='jelly');
    if(jelly?.kind!=='jelly')throw Error('Missing jelly');
    jelly.preview={r:1,c:1};
    expect(()=>parseCampaignState(stale)).toThrow(/preview must match/);
    const normal=loadCampaignLevel(getAuthoredLessonLevel(712)!);
    const ordinary=normal.fixtures.find(f=>f.kind==='jelly');
    if(ordinary?.kind!=='jelly')throw Error('Missing ordinary jelly');
    ordinary.preview=normal.pieces.find(p=>p.kind==='tile'&&jellyEligible(normal,p.at,ordinary)&&
      (p.at.r!==ordinary.preview?.r||p.at.c!==ordinary.preview?.c))!.at;
    expect(()=>parseCampaignState(normal)).toThrow(/preview must match/);
  });
  it('rejects snapshot version mismatch and dangling state references',()=>{
    expect(()=>parseCampaignState({...stateFixture(),levelId:2})).toThrow(/levelId/);
    const state=stateFixture();state.crew[0]!.carrierId='gone';
    expect(()=>parseCampaignState(state)).toThrow(/reference/i);
  });
  it('validates orthogonal translation and known boosters at input boundary',()=>{
    expect(parseCampaignAction({type:'translate',actorId:'pair',dr:-1,dc:0}).type).toBe('translate');
    expect(()=>parseCampaignAction({type:'translate',actorId:'pair',dr:1,dc:1})).toThrow();
    expect(()=>parseCampaignAction({type:'booster',kind:'bomb',at:{r:0,c:0}})).toThrow();
  });
  it('validates replay actions and independent versions',()=>{
    const trace={levelId:1,campaignVersion:'2026.1',rulesVersion:'campaign-1',initialHash:'a',actions:[],finalHash:'b'};
    expect(parseSolutionTrace(trace).levelId).toBe(1);
    expect(()=>parseSolutionTrace({...trace,campaignVersion:'2099.1'})).toThrow(/campaignVersion/);
  });
  it('rejects duplicate and out-of-order event IDs and malformed matched cells',()=>{
    const event={type:'merge',sequenceId:1,timingGroup:0,mergeId:'merge-1',pieceIds:['a','b','c'],cells:[{r:0,c:0},{r:0,c:1},{r:0,c:2}],at:{r:0,c:1},before:1,after:2};
    expect(parseCampaignEvents([event])).toHaveLength(1);
    expect(()=>parseCampaignEvents([event,event])).toThrow(/duplicate/i);
    expect(()=>parseCampaignEvents([{...event,sequenceId:2},{...event,sequenceId:1}])).toThrow(/ordered/);
    expect(()=>parseCampaignEvents([{...event,cells:[{r:0,c:0}]}])).toThrow();
  });
  it('serializes crew boarding explicitly and rejects mismatched event identities',()=>{
    const before=levelFixture().crew[0]!,after={...before,status:'housed',rescueMoves:null};
    expect(parseCampaignEvents([{type:'crew',sequenceId:0,timingGroup:0,crewId:'crew-1',before,after}])[0]!.type).toBe('crew');
    expect(()=>parseCampaignEvents([{type:'crew',sequenceId:0,timingGroup:0,crewId:'other',before,after}])).toThrow(/ID/);
  });
  it('serializes the visible practice jelly recovery cue without accepting unknown phases',()=>{
    const cue={type:'jelly',sequenceId:0,timingGroup:0,fixtureId:'jelly-0',phase:'practice-assisted',at:{r:1,c:0}};
    expect(parseCampaignEvents([cue])[0]).toEqual(cue);
    const waited={...cue,phase:'practice-waited'};
    expect(parseCampaignEvents([waited])[0]).toEqual(waited);
    expect(()=>parseCampaignEvents([{...cue,phase:'unlisted'}])).toThrow(/phase/);
  });
  it('rejects runtime actors and fixtures not declared by the authored definition',()=>{
    const state=stateFixture();state.actors=[{kind:'rover',id:'rogue',at:{r:1,c:1},routeId:null,routeIndex:0,passengerIds:[]}];
    expect(()=>parseCampaignState(state)).toThrow(/reference|declared/);
  });
  it('rejects duplicate mechanic references and missing ownership declarations',()=>{
    const level=levelFixture();level.id=4;level.fixtures=[{kind:'crate',id:'crate-1',at:{r:1,c:1},hp:3}];
    level.mechanics=[{id:'crates',fixtureIds:['crate-1','crate-1']}];
    expect(()=>parseCampaignLevel(level)).toThrow(/duplicate/);
    level.mechanics=[{id:'crates',fixtureIds:['crate-1']}];
    expect(parseCampaignLevel(level).mechanics).toHaveLength(1);
    level.fixtures.push({kind:'crate',id:'crate-2',at:{r:1,c:2},hp:3});
    expect(()=>parseCampaignLevel(level)).toThrow(/declared|reference/);
  });
  it('rejects mechanic runtime ledger references of the wrong entity kind',()=>{
    const state=stateFixture();state.level.id=4;state.levelId=4;
    state.level.fixtures=[{kind:'crate',id:'crate-1',at:{r:1,c:1},hp:3}];
    state.level.mechanics=[{id:'crates',fixtureIds:['crate-1']}];
    state.mechanics=[{id:'crates',openedIds:['crew-1']}];
    expect(()=>parseCampaignState(state)).toThrow(/reference/);
    state.mechanics=[{id:'crates',openedIds:['crate-1']}];
    expect(parseCampaignState(state).mechanics[0]!.id).toBe('crates');
  });
  it('rejects reused generated IDs and reserves their namespace from authored content',()=>{
    const state=stateFixture();state.pieces.push({id:'entity-3',kind:'tile',tier:1,at:{r:0,c:1}});
    expect(()=>parseCampaignState(state)).toThrow(/nextEntityId/);
    state.nextEntityId=4;expect(parseCampaignState(state).nextEntityId).toBe(4);
    const reserved=levelFixture();reserved.pieces[0]!.id='entity-0';
    expect(()=>parseCampaignLevel(reserved)).toThrow(/reserved/);
  });
  it('rejects an occupied crate cell and an actor overlapping a fixture',()=>{
    const level=levelFixture();level.id=31;level.mechanics=[{id:'crates',fixtureIds:['crate-1']},{id:'rovers',actorIds:['rover-1']}];
    level.fixtures=[{id:'crate-1',kind:'crate',at:{r:1,c:1},hp:3}];
    level.actors=[{id:'rover-1',kind:'rover',at:{r:1,c:2},routeId:null,routeIndex:0,passengerIds:[]}];
    level.pieces.push({id:'blocked-tile',kind:'tile',tier:1,at:{r:1,c:1}});
    expect(()=>parseCampaignLevel(level)).toThrow(/crate/);
    level.pieces.pop();level.actors[0]!.at={r:1,c:1};
    expect(()=>parseCampaignLevel(level)).toThrow(/fixture/);
  });
  it('enforces portal refill and current-lane exclusions',()=>{
    const level=levelFixture();level.id=376;level.chapter=8;
    level.fixtures=[{id:'portal-1',kind:'portal',at:{r:1,c:1},receiver:{r:0,c:0},segmentId:'fall'}];
    expect(validateCompatibility(level).some(issue=>issue.message.includes('refill'))).toBe(true);
    level.geometry.refillSources=[];level.geometry.routes=[{id:'lane',cells:[{r:1,c:1},{r:1,c:2}],loop:true}];
    level.mechanics=[{id:'currents',routeIds:['lane']}];
    expect(validateCompatibility(level).some(issue=>issue.message.includes('currents'))).toBe(true);
  });
  it('rejects mutated scheduled passengers on reload but permits an authored waiting wave',()=>{
    const level=levelFixture();level.id=146;level.chapter=3;
    level.arrivals=[{id:'wave-1',turn:3,entry:{r:1,c:1},crew:[{...level.crew[0]!,id:'crew-2',at:{r:1,c:1}}],status:'pending'}];
    level.mechanics=[{id:'waves',arrivalIds:['wave-1']}];
    const state={...stateFixture(),level,levelId:146,arrivals:structuredClone(level.arrivals),mechanics:[{id:'waves',admittedIds:[]}]};
    expect(parseCampaignState(state).arrivals[0]!.status).toBe('pending');
    state.arrivals[0]!.crew[0]!.rescueMoves=99;
    expect(()=>parseCampaignState(state)).toThrow(/authored arrival/);
  });
  it.each(['gate','key'] as const)('rejects a lock with a wrong-kind %s reference',target=>{
    const level=levelFixture();level.id=561;level.chapter=12;
    level.fixtures=[{kind:'gate',connectionIds:[],id:'gate',at:{r:1,c:2},cells:[{r:2,c:1}],open:false},
      {kind:'lock',id:'lock',at:{r:1,c:1},gateId:target==='gate'?'crew-1':'gate',keyId:target==='key'?'tile-1':'key'}];
    level.pieces.push({kind:'cargo',id:'key',at:{r:0,c:1},cargoKind:'key',destinationId:'lock',passengerIds:[]});
    level.mechanics=[{id:'keys',fixtureIds:['gate','lock']}];
    expect(()=>parseCampaignLevel(level)).toThrow(/lock\.(gateId|keyId)/);
  });
  it('rejects snapshots that remove a permanent gate instead of retaining its open state',()=>{
    const level=levelFixture();level.id=561;level.chapter=12;
    level.fixtures=[{kind:'gate',connectionIds:[],id:'gate',at:{r:1,c:2},cells:[{r:2,c:1}],open:false},{kind:'lock',id:'lock',at:{r:1,c:1},gateId:'gate',keyId:'key'}];
    level.pieces.push({kind:'cargo',id:'key',at:{r:0,c:1},cargoKind:'key',destinationId:'lock',passengerIds:[]});
    level.mechanics=[{id:'keys',fixtureIds:['gate','lock']}];
    level.geometry.inactiveCells=[{r:2,c:1}];level.fixtures[0]!.at={r:1,c:1};
    level.pieces=level.pieces.filter(p=>p.at.r!==2||p.at.c!==1);
    const state={...stateFixture(),level,levelId:561,fixtures:[level.fixtures[1]!],mechanics:[{id:'keys',unlockedIds:['gate']}]};
    expect(()=>parseCampaignState(state)).toThrow();
  });
  it('rejects a garden pointing to a station instead of an evacuation exit',()=>{
    const level=gardenLevel();const garden=level.fixtures[0]!;if(garden.kind==='garden')garden.exitId='home';
    expect(()=>parseCampaignLevel(level)).toThrow(/garden.exitId/);
  });
  it.each(['capsule','harvest','key','kit'] as const)('rejects a %s cargo destination of unrelated kind',cargoKind=>{
    const level=levelFixture();level.pieces.push({kind:'cargo',id:'cargo',at:{r:0,c:1},cargoKind,destinationId:'home',passengerIds:[]});
    expect(()=>parseCampaignLevel(level)).toThrow(/cargo.destinationId/);
  });
  it('rejects a pirate targeting a station instead of a supply dock',()=>{
    const level=pirateLevel(),pirate=level.actors[0]!;if(pirate.kind==='pirate')pirate.dockId='home';
    expect(()=>parseCampaignLevel(level)).toThrow(/pirate.dockId/);
  });
  it('rejects a repair bot holding an ordinary tile instead of kit cargo',()=>{
    const level=levelFixture();level.id=921;level.chapter=19;
    level.geometry.routes=[{id:'track',cells:[{r:1,c:1}],loop:false}];
    level.actors=[{kind:'repair',id:'bot',at:{r:1,c:1},routeId:'track',routeIndex:0,jobs:[{id:'job',cell:{r:2,c:0}}],nextJob:0,kitId:'tile-1'}];
    level.mechanics=[{id:'repair',actorIds:['bot']}];
    expect(()=>parseCampaignLevel(level)).toThrow(/repair.kitId/);
  });
  it.each(['solar','relay','dock'] as const)('rejects a %s rescue endpoint pointing to a supply dock',kind=>{
    const level=levelFixture();level.id=961;level.chapter=20;
    level.geometry.endpoints.push({id:'supply',kind:'supply-dock',at:{r:2,c:0},active:true});
    if(kind==='solar'){level.fixtures=[{id:'solar',kind:'solar',at:{r:1,c:1},tier:1,quota:2,charge:0,endpointId:'supply'}];level.mechanics=[{id:'solar',fixtureIds:['solar']}];}
    if(kind==='relay'){level.fixtures=[{id:'relay',kind:'relay',at:{r:1,c:1},order:1,active:false,endpointId:'supply'}];level.mechanics=[{id:'relays',fixtureIds:['relay']}];}
    if(kind==='dock'){level.geometry.routes=[{id:'track',cells:[{r:1,c:1}],loop:false}];level.actors=[{id:'dock',kind:'dock',at:{r:1,c:1},routeId:'track',routeIndex:0,entrance:{r:1,c:0},endpointId:'supply'}];level.mechanics=[{id:'docks',actorIds:['dock']}];}
    expect(()=>parseCampaignLevel(level)).toThrow(/endpointId/);
  });
  it('rejects a runtime tile borrowing a missing passenger identity',()=>{
    const state=stateFixture();state.crew=[];state.pieces[0]!.id='crew-1';
    expect(()=>parseCampaignState(state)).toThrow(/piece.*identity/i);
  });
  it('rejects two garden producers reserving the same harvest identity',()=>{
    const level=gardenLevel();level.fixtures.push({kind:'garden',id:'garden-2',at:{r:1,c:2},stage:0,harvestId:'crop',exitId:'exit',outputAt:{r:0,c:1}});
    level.mechanics[0]={id:'gardens',fixtureIds:['garden','garden-2']};
    expect(()=>parseCampaignLevel(level)).toThrow(/duplicate/);
  });
  it.each(['crew-1','tile-1'] as const)('rejects a future harvest identity colliding with %s',harvestId=>{
    const level=gardenLevel(),garden=level.fixtures[0]!;if(garden.kind==='garden')garden.harvestId=harvestId;
    expect(()=>parseCampaignLevel(level)).toThrow(/duplicate/);
  });
  it('allows a produced harvest piece to retain its unique authored garden output identity',()=>{
    const level=gardenLevel();
    const state={...stateFixture(),level,levelId:516,geometry:structuredClone(level.geometry),fixtures:structuredClone(level.fixtures),mechanics:[{id:'gardens',harvestedIds:['crop']},{id:'exits',departedIds:[]}]};
    state.pieces.push({kind:'cargo',id:'crop',at:{r:0,c:1},cargoKind:'harvest',destinationId:'exit',passengerIds:[]});
    if(state.fixtures[0]?.kind==='garden')state.fixtures[0].stage=3;
    expect(parseCampaignState(state).pieces.find(p=>p.id==='crop')?.kind).toBe('cargo');
  });
  it('accepts a pirate-owned parcel without placing a second board entity',()=>{
    expect(parseCampaignLevel(pirateLevel()).actors[0]!.kind).toBe('pirate');
  });
  it('rejects two pirate producers reserving the same parcel identity',()=>{
    const level=pirateLevel(),pirate=level.actors[0]!;
    if(pirate.kind!=='pirate')throw new Error('Expected pirate fixture');
    level.actors.push({...pirate,id:'pirate-2',at:{r:1,c:2},routeIndex:1});
    level.mechanics=[{id:'pirates',actorIds:['pirate','pirate-2']}];
    expect(()=>parseCampaignLevel(level)).toThrow(/duplicate/);
  });
  it('rejects a held parcel identity colliding with another layer',()=>{
    const level=pirateLevel(),pirate=level.actors[0]!;if(pirate.kind==='pirate')pirate.parcelId='crew-1';
    expect(()=>parseCampaignLevel(level)).toThrow(/duplicate/);
  });
  it('rejects a tether whose second cell enters a switched gravity chamber',()=>{
    const level=levelFixture();level.id=881;level.chapter=18;
    level.crew=[{...level.crew[0]!,at:{r:1,c:1},carrierId:'pair'}, {...level.crew[0]!,id:'crew-2',at:{r:1,c:0},carrierId:'pair'}];
    level.actors=[{id:'pair',kind:'tether',at:{r:1,c:1},offset:{r:0,c:-1},passengerIds:['crew-1','crew-2'],released:false}];
    level.fixtures=[{id:'switch',kind:'gravity-switch',at:{r:0,c:2},chamberId:'room',direction:'down'}];
    level.mechanics=[{id:'tethers',actorIds:['pair']},{id:'gravity',fixtureIds:['switch']}];
    expect(()=>parseCampaignLevel(level)).toThrow(/Gravity chambers/);
  });
  it('fails explicitly for unshipped content without generating a replacement',async()=>{
    expect((await getCampaignLevel(1)).id).toBe(1);
    await expect(getCampaignLevel(9)).rejects.toThrow(/missing.*chapter-01/i);
    await expect(getCampaignLevel(1001)).rejects.toThrow(/1.*1000/);
  });
  it('preserves the original first three boards and lesson text as conversion fixtures',()=>{
    expect(INTRO).toEqual(LEGACY_INTRO_FIXTURES);
    expect(LESSONS).toEqual(LEGACY_LESSON_FIXTURES);
  });
});
