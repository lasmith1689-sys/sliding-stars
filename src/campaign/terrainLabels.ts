import type {Tier} from '../core/types';

const names:Record<Tier,string>={1:'Void',2:'Debris',3:'Platform',4:'Biosphere',5:'Habitat'};
const art:Record<Tier,string>={1:'tile-1-void',2:'tile-2-debris',3:'tile-3-platform',4:'tile-4-biosphere',5:'tile-5-pad'};

export const terrainName=(tier:Tier):string=>names[tier];
export const terrainArtName=(tier:Tier):string=>art[tier];
