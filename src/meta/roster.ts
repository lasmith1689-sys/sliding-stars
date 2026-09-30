/** Curated station modules and the VIP crew that fill them, grouped into a
 * catalog of stations. Completing one station unlocks the next themed set. */
export interface StationModule { id: string; name: string }
export interface Vip { id: string; name: string; module: string }
export interface StationDef { id: string; name: string; theme: string; modules: StationModule[]; vips: Vip[] }

const STATION_1: StationDef = {
  id: 'homestead', name: 'Home Station', theme: 'the original colony',
  modules: [
    { id: 'greenhouse', name: 'Greenhouse' }, { id: 'galley', name: 'Galley' },
    { id: 'observatory', name: 'Observatory' }, { id: 'petbay', name: 'Pet Bay' },
    { id: 'recdeck', name: 'Rec Deck' }, { id: 'medbay', name: 'Medbay' },
  ],
  vips: [
    { id: 'botanist', name: 'Astro-Botanist', module: 'greenhouse' }, { id: 'florist', name: 'Zero-G Florist', module: 'greenhouse' },
    { id: 'chef', name: 'Star Chef', module: 'galley' }, { id: 'icecream', name: 'Ice-Cream Vendor', module: 'galley' },
    { id: 'astronomer', name: 'Astronomer', module: 'observatory' }, { id: 'navigator', name: 'Navigator', module: 'observatory' },
    { id: 'vet', name: 'Space Vet', module: 'petbay' }, { id: 'groomer', name: 'Pet Groomer', module: 'petbay' },
    { id: 'racer', name: 'Go-Kart Racer', module: 'recdeck' }, { id: 'dj', name: 'Zero-G DJ', module: 'recdeck' },
    { id: 'medic', name: 'Medic', module: 'medbay' }, { id: 'nurse', name: 'Nurse', module: 'medbay' },
  ],
};

const STATION_2: StationDef = {
  id: 'boardwalk', name: 'The Boardwalk Ring', theme: 'an orbital seaside town',
  modules: [
    { id: 'arcade', name: 'Arcade' }, { id: 'diner', name: 'Diner' },
    { id: 'cinema', name: 'Cinema' }, { id: 'bakery', name: 'Bakery' },
    { id: 'library', name: 'Library' }, { id: 'gym', name: 'Gym' },
  ],
  vips: [
    { id: 'arcade_champ', name: 'Arcade Champ', module: 'arcade' }, { id: 'claw_whiz', name: 'Claw-Machine Whiz', module: 'arcade' },
    { id: 'cook', name: 'Short-Order Cook', module: 'diner' }, { id: 'soda_jerk', name: 'Soda Jerk', module: 'diner' },
    { id: 'projectionist', name: 'Projectionist', module: 'cinema' }, { id: 'usher', name: 'Usher', module: 'cinema' },
    { id: 'baker', name: 'Baker', module: 'bakery' }, { id: 'donut_fryer', name: 'Donut Fryer', module: 'bakery' },
    { id: 'librarian', name: 'Librarian', module: 'library' }, { id: 'storyteller', name: 'Storyteller', module: 'library' },
    { id: 'yogi', name: 'Yoga Instructor', module: 'gym' }, { id: 'boxing_coach', name: 'Boxing Coach', module: 'gym' },
  ],
};

export const STATIONS: StationDef[] = [STATION_1, STATION_2];

/** Backward-compatible flat views (station 1) — used where a single set is expected. */
export const MODULES = STATION_1.modules;
export const VIP_ROSTER = STATION_1.vips;

export function stationDef(index: number): StationDef {
  return STATIONS[Math.max(0, Math.min(index, STATIONS.length - 1))]!;
}

const ALL_VIPS = STATIONS.flatMap((s) => s.vips);
const ALL_MODULES = STATIONS.flatMap((s) => s.modules);

export function vipById(id: string): Vip | undefined { return ALL_VIPS.find((v) => v.id === id); }
export function vipsOfModule(moduleId: string): Vip[] { return ALL_VIPS.filter((v) => v.module === moduleId); }
export function moduleOf(vipId: string): string | undefined { return vipById(vipId)?.module; }
export function moduleById(id: string): StationModule | undefined { return ALL_MODULES.find((m) => m.id === id); }
