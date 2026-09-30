import type { CampaignLevel, ValidationIssue } from './types';
import { cellKey } from './references';

/** Static spatial restrictions. Reachability and timing proofs belong to the solver/replay validator. */
export function validateCompatibility(level:CampaignLevel):ValidationIssue[]{
  const issues:ValidationIssue[]=[],add=(entityId:string,message:string)=>issues.push({code:'compatibility',levelId:level.id,entityId,message});
  const currentIds=new Set(level.mechanics.flatMap(m=>m.id==='currents'?m.routeIds:[]));
  const currentCells=new Set(level.geometry.routes.filter(r=>currentIds.has(r.id)).flatMap(r=>r.cells.map(cellKey)));
  const trackIds=new Set(level.actors.flatMap(a=>'routeId'in a&&a.routeId?[a.routeId]:[]));
  const trackCells=new Set(level.geometry.routes.filter(r=>trackIds.has(r.id)).flatMap(r=>r.cells.map(cellKey)));
  const portalCells=new Set(level.fixtures.flatMap(f=>f.kind==='portal'?[cellKey(f.at),cellKey(f.receiver)]:[]));
  for(const portal of level.fixtures.filter(f=>f.kind==='portal')){
    if([portal.at,portal.receiver].some(p=>currentCells.has(cellKey(p))||trackCells.has(cellKey(p))))add(portal.id,'Portals cannot overlap currents or actor tracks');
    if(level.fixtures.some(f=>f.kind==='portal'&&cellKey(f.at)===cellKey(portal.receiver)))add(portal.id,'Portal receivers cannot enter another portal');
    if(level.geometry.refillSources.some(s=>cellKey(s.at)===cellKey(portal.receiver)))add(portal.id,'Portal receiver cannot have an ordinary refill source');
  }
  for(const f of level.fixtures)if([f.at,...('cells'in f?f.cells:f.kind==='portal'?[f.receiver]:f.kind==='jelly'?f.coatedCells:[])].some(p=>currentCells.has(cellKey(p))))add(f.id,'Current lane cannot contain fixtures or frozen cells');
  for(const actor of level.actors.filter(a=>a.kind==='tether')){
    const footprint=[actor.at,{r:actor.at.r+actor.offset.r,c:actor.at.c+actor.offset.c}];
    if(footprint.some(p=>portalCells.has(cellKey(p))||currentCells.has(cellKey(p))))add(actor.id,'Tethers cannot enter portals or currents');
  }
  for(const fixture of level.fixtures.filter(f=>f.kind==='gravity-switch')){
    const chamber=new Set(level.geometry.chambers.find(c=>c.id===fixture.chamberId)?.cells.map(cellKey));
    const excludedActor=level.actors.some(a=>a.kind==='dock'?chamber.has(cellKey(a.at)):a.kind==='tether'&&[a.at,{r:a.at.r+a.offset.r,c:a.at.c+a.offset.c}].some(p=>chamber.has(cellKey(p))));
    if([...currentCells].some(cell=>chamber.has(cell))||excludedActor||level.fixtures.some(f=>f.kind==='phase-door'&&chamber.has(cellKey(f.at))))add(fixture.id,'Gravity chambers cannot contain currents, tethers, visiting docks or phase doors');
  }
  const jellyForbidden=new Set([...portalCells,...trackCells,...currentCells,
    ...level.geometry.endpoints.filter(e=>e.kind==='exit').map(e=>cellKey(e.at)),
    ...level.fixtures.flatMap(f=>f.kind==='bridge'||f.kind==='gate'?f.cells.map(cellKey):[cellKey(f.at)]),
    ...level.crew.filter(c=>c.status==='active').map(c=>cellKey(c.at)),
    ...level.actors.map(a=>cellKey(a.at)),...level.pieces.filter(p=>p.kind!=='tile').map(p=>cellKey(p.at))]);
  for(const jelly of level.fixtures.filter(f=>f.kind==='jelly'))for(const p of [...jelly.coatedCells,...(jelly.preview?[jelly.preview]:[])]){
    if(jellyForbidden.has(cellKey(p))||!level.pieces.some(piece=>piece.kind==='tile'&&cellKey(piece.at)===cellKey(p)))add(jelly.id,'Jelly requires ordinary terrain without crew, special pieces, fixtures, endpoints or movement tracks');
  }
  return issues;
}
