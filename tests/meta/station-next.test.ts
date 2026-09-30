import {emptyStation,recordWin,buildModule,canExpand} from '../../src/meta/station';
import {STATIONS} from '../../src/meta/roster';
test('first construction is earned by three rescues and cannot build a locked room',()=>{
 const s=recordWin(emptyStation(),['botanist'],3);
 expect(canExpand(s)).toBe(true);
 expect(buildModule(s,'galley').state).toEqual(s);
 expect(buildModule(s,'greenhouse').state.builtModules).toEqual(['greenhouse']);
});
test('completed stations remain visitable and the catalog never repeats indefinitely',()=>{
 let s=emptyStation();
 for(const catalog of STATIONS){
  s=recordWin(s,catalog.vips.map(v=>v.id),30);
  for(const room of catalog.modules) s=buildModule(s,room.id).state;
 }
 expect(s.stationsCompleted).toBe(2);expect(s.currentStation).toBe(1);
 expect(s.archives?.length).toBe(2);expect(s.builtModules).toHaveLength(6);
 expect(canExpand(s)).toBe(false);
 expect(buildModule(s,'gym').state).toEqual(s);
});
