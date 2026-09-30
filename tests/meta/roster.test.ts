import { MODULES, VIP_ROSTER, STATIONS, stationDef, vipById, vipsOfModule, moduleOf } from '../../src/meta/roster';

test('every VIP belongs to a real module; ids are unique', () => {
  const moduleIds = new Set(MODULES.map((m) => m.id));
  const vipIds = new Set<string>();
  for (const v of VIP_ROSTER) {
    expect(moduleIds.has(v.module)).toBe(true);
    expect(vipIds.has(v.id)).toBe(false);
    vipIds.add(v.id);
  }
  expect(VIP_ROSTER.length).toBeGreaterThanOrEqual(12);
});

test('lookups resolve', () => {
  expect(vipById('botanist')?.module).toBe('greenhouse');
  expect(moduleOf('chef')).toBe('galley');
  expect(vipsOfModule('petbay').map((v) => v.id).sort()).toEqual(['groomer', 'vet']);
});

test('there are at least two seeded stations, each with 6 modules and 12 crew', () => {
  expect(STATIONS.length).toBeGreaterThanOrEqual(2);
  for (const st of STATIONS.slice(0, 2)) {
    expect(st.modules).toHaveLength(6);
    expect(st.vips).toHaveLength(12);
  }
});

test('VIP ids are globally unique across stations', () => {
  const ids = STATIONS.flatMap((s) => s.vips.map((v) => v.id));
  expect(new Set(ids).size).toBe(ids.length);
});

test('lookups resolve a station-2 VIP to its module', () => {
  const arcadeVip = STATIONS[1]!.vips[0]!;
  expect(vipById(arcadeVip.id)).toBeDefined();
  expect(moduleOf(arcadeVip.id)).toBe(arcadeVip.module);
});

test('stationDef clamps out-of-range indices to the last station', () => {
  expect(stationDef(999).id).toBe(STATIONS[STATIONS.length - 1]!.id);
});
