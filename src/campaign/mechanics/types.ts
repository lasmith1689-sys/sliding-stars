import type {GravityDef,GravityRuntime} from './gravity';
import type {KeysDef,KeysRuntime} from './keys';
import type { ShelterDef,ShelterRuntime } from './shelter';
import type { CratesDef,CratesRuntime } from './crates';
import type { IceDef,IceRuntime } from './ice';
import type { RoversDef,RoversRuntime } from './rovers';
import type { ReactorsDef,ReactorsRuntime } from './reactors';
import type { CometsDef,CometsRuntime } from './comets';
import type { ExitsDef,ExitsRuntime } from './exits';
import type { WavesDef,WavesRuntime } from './waves';
import type { MoonwhalesDef,MoonwhalesRuntime } from './moonwhales';
import type { PupsDef,PupsRuntime } from './pups';
import type { CurrentsDef,CurrentsRuntime } from './currents';
import type { PiratesDef,PiratesRuntime } from './pirates';
import type { PortalsDef,PortalsRuntime } from './portals';
import type { BridgesDef,BridgesRuntime } from './bridges';
import type { GardensDef,GardensRuntime } from './gardens';
import type { SolarDef,SolarRuntime } from './solar';
import type { JellyDef,JellyRuntime } from './jelly';
import type { DocksDef,DocksRuntime } from './docks';
import type { PhaseDef,PhaseRuntime } from './phase';
/** Module-owned contracts are aggregated without importing behavior at runtime. */
export const MECHANIC_IDS = ['crates','ice','rovers','reactors','comets','exits','waves','moonwhales','pups','currents','pirates','portals','bridges','shelter','gardens','keys','gravity','solar','jelly','docks','phase','relays','tethers','repair','rendezvous'] as const;
export type MechanicId = typeof MECHANIC_IDS[number];

export type MechanicDef =
  | CratesDef | IceDef | RoversDef | ReactorsDef | CometsDef
  | ExitsDef
  | WavesDef
  | MoonwhalesDef
  | PupsDef
  | CurrentsDef
  | PiratesDef
  | PortalsDef
  | BridgesDef
  | ShelterDef
  | GardensDef
  | KeysDef
  | GravityDef
  | SolarDef
  | JellyDef
  | DocksDef
  | PhaseDef
  | {id:'relays';fixtureIds:string[]}
  | {id:'tethers';actorIds:string[]}
  | {id:'repair';actorIds:string[]}
  | {id:'rendezvous';endpointIds:[string,string];passengerIds:[string,string]};

/** Feature-wide state only; per-entity counters live on actors and fixtures. */
export type MechanicRuntime =
  | CratesRuntime | IceRuntime | RoversRuntime | ReactorsRuntime | CometsRuntime
  | ExitsRuntime
  | WavesRuntime
  | MoonwhalesRuntime
  | PupsRuntime
  | CurrentsRuntime
  | PiratesRuntime
  | PortalsRuntime
  | BridgesRuntime
  | ShelterRuntime
  | GardensRuntime
  | KeysRuntime
  | GravityRuntime
  | SolarRuntime
  | JellyRuntime
  | DocksRuntime
  | PhaseRuntime
  | {id:'relays';nextNode:number}
  | {id:'tethers';releasedIds:string[]}
  | {id:'repair';completedJobIds:string[]}
  | {id:'rendezvous';departed:boolean};
