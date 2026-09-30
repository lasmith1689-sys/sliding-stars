import type { LevelDef } from '../../src/core/types';

// Frozen inputs for future conversion tests. Do not import the live definitions here.
export const LEGACY_INTRO_FIXTURES: LevelDef[] = [
 {id:1,mask:['###','###','###'],tiles:['512','534','251'],survivors:[{r:0,c:0}],goal:{type:'rescueN',n:1},seed:7,needMoves:20},
 {id:2,mask:['.###.','#####','##.##','#####','.###.','.###.'],tiles:['.121.','21312','13.31','32323','.434.','.545.'],survivors:[{r:5,c:1}],goal:{type:'rescueN',n:1},seed:11,needMoves:20},
 {id:3,mask:['.###.','#####','##.##','#####','.###.','.###.'],tiles:['.121.','21312','13.31','32323','.434.','.545.'],survivors:[{r:5,c:1,vip:'botanist'},{r:1,c:2}],vipSurvivor:0,goal:{type:'rescueN',n:2},seed:11,needMoves:25},
];
export const LEGACY_LESSON_FIXTURES = [
 'Welcome, Commander. Slide the bottom flowering habitat left to join three habitats. Crew ride the match into their new station.',
 'Build a way home. Match three biospheres to grow a flowering habitat, then three habitats to make a station.',
 'Rescue our botanist and the drifter. Raise terrain beneath crew or make a pod. Your first greenhouse is almost earned.',
];
