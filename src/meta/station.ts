import { stationDef, moduleOf, vipsOfModule, STATIONS } from './roster';

/** Persistent progress for the ever-expanding fleet of stations (localStorage). */
export interface StationState {
  archives?: Array<{catalogIndex:number; builtModules:string[]; theme:string; arrangement:string}>;
  theme?: 'aurora'|'sunset'|'starlight';
  arrangement?: 'orbit'|'garden';
  totalRescued: number;      // lifetime overall score — never resets
  stationRescued: number;    // rescues toward the current station's builds — resets on completion
  currentStation: number;    // index into STATIONS
  stationsCompleted: number; // fully-built stations (shown in the station view)
  collectedVips: string[];   // lifetime collected VIP ids (globally unique)
  builtModules: string[];    // built for the CURRENT station — resets on completion
}

export const RESCUES_PER_MODULE = 5;
const KEY = 'sliding-stars-station';

export function emptyStation(): StationState {
  return { totalRescued: 0, stationRescued: 0, currentStation: 0, stationsCompleted: 0, collectedVips: [], builtModules: [],archives:[],theme:'aurora',arrangement:'orbit' };
}

/** Bank rescued VIPs (deduped) and add rescues to the lifetime + current-station totals. */
export function recordWin(s: StationState, rescuedVipIds: string[], rescuedCount: number): StationState {
  const collected = new Set(s.collectedVips);
  for (const id of rescuedVipIds) collected.add(id);
  return {
    ...s,
    collectedVips: [...collected],
    totalRescued: s.totalRescued + rescuedCount,
    stationRescued: s.stationRescued + rescuedCount,
  };
}

/** Modules of the CURRENT station with at least one collected VIP of their category. */
export function unlockedModules(s: StationState): string[] {
  const have = new Set(s.collectedVips.map(moduleOf).filter((m): m is string => !!m));
  return stationDef(s.currentStation).modules.map((m) => m.id).filter((id) => have.has(id));
}

/** Unlocked modules of the current station not yet built. */
export function buildableModules(s: StationState): string[] {
  const built = new Set(s.builtModules);
  return unlockedModules(s).filter((id) => !built.has(id));
}

/** An expansion is available with an unlocked-unbuilt module and enough rescues. */
export function canExpand(s: StationState): boolean {
  return s.stationsCompleted<STATIONS.length&&buildableModules(s).length > 0 && s.stationRescued >= buildCost(s);
}
export function buildCost(s:StationState):number {return s.builtModules.length===0?3:(s.builtModules.length+1)*RESCUES_PER_MODULE;}

/**
 * Build a module for the current station. If it completes the station (all
 * modules built), advance to the next station and reset per-station progress.
 */
export function buildModule(s: StationState, moduleId: string): { state: StationState; completed: boolean } {
  if (!canExpand(s)||!buildableModules(s).includes(moduleId)) return { state: s, completed: false };
  const built = [...s.builtModules, moduleId];
  const total = stationDef(s.currentStation).modules.length;
  if (built.length >= total) {
    return {
      state: {
        ...s, builtModules: s.currentStation<STATIONS.length-1?[]:built, stationRescued: 0,
        currentStation: Math.min(STATIONS.length-1,s.currentStation + 1), stationsCompleted: s.stationsCompleted + 1,
        archives:[...(s.archives??[]),{catalogIndex:s.currentStation,builtModules:built,theme:s.theme??'aurora',arrangement:s.arrangement??'orbit'}],
      },
      completed: true,
    };
  }
  return { state: { ...s, builtModules: built }, completed: false };
}

/** Collected VIPs that live in a given module. */
export function residentsOf(s: StationState, moduleId: string): string[] {
  const ids = new Set(vipsOfModule(moduleId).map((v) => v.id));
  return s.collectedVips.filter((id) => ids.has(id));
}

export function loadStation(storage: Storage = localStorage): StationState {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return emptyStation();
    const p = JSON.parse(raw) as Partial<StationState>;
    const totalRescued = p.totalRescued ?? 0;
    return {
      totalRescued,
      stationRescued: p.stationRescued ?? totalRescued,
      currentStation: p.currentStation ?? 0,
      stationsCompleted: p.stationsCompleted ?? 0,
      collectedVips: p.collectedVips ?? [],
      builtModules: p.builtModules ?? [],
      archives:p.archives??[],theme:p.theme??'aurora',arrangement:p.arrangement??'orbit',
    };
  } catch { return emptyStation(); }
}

export function saveStation(s: StationState, storage: Storage = localStorage): void {
  try { storage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore quota/security */ }
}
