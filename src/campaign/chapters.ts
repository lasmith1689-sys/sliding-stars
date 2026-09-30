import { MECHANIC_SCHEDULE } from './schedule';
const SETTINGS = [
  ['Home Orbit','Arrival Lounge'],['Ember Belt','Cloud Kitchen'],['Shuttle Harbor','Parcel Post'],
  ['Moonwhale Cove','Moonwhale Lookout'],['Pawprint Moon','Pup Nursery'],['Ribbon Nebula','Ribbon Garden'],
  ['Mischief Patrol','Toy Workshop'],['Twin-Star Crossing','Stargate Pavilion'],['Patchwork Orbit','Bridge House'],
  ['Cozy Comet Inn','Guest Lodge'],['Moonflower Fields','Moonflower Conservatory'],['Keylight Station','Keylight Gallery'],
  ['Sideways Sky','Tumble Observatory'],['Sunpetal Reach','Sunpetal Atrium'],['Jellymoon Lagoon','Jelly Tea Room'],
  ['Wandering Harbor','Shuttle Café'],['Lantern Passage','Lantern Walk'],['Together Constellation','Friendship Dome'],
  ['Little Fixers','Fixer Garage'],['Home Among the Stars','Starfall Ballroom'],
] as const;
export const CHAPTERS=SETTINGS.map(([name,roomName],index)=>({
  id:index+1,name,roomName,firstLevel:index*50+1,lastLevel:(index+1)*50,annex:Math.floor(index/4)+1,
  vipLevels:[index*50+25,index*50+45] as [number,number],mechanicIds:MECHANIC_SCHEDULE.filter(m=>m.chapter===index+1).map(m=>m.id),
}));
export function chapterForLevel(level:number){
  if(!Number.isInteger(level)||level<1||level>1000)throw new Error('Campaign level must be an integer from 1 to 1000');
  return CHAPTERS[Math.floor((level-1)/50)]!;
}
