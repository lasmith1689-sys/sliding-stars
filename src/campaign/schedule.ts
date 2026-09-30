import type { MechanicId, ValidationIssue } from './types';
export interface MechanicIntroduction {id:MechanicId;name:string;firstLevel:number;chapter:number;existing:boolean;evidence:'A'|'O';prerequisites:MechanicId[]}
export const MECHANIC_SCHEDULE:MechanicIntroduction[] = [
  {id:'crates',name:'Supply crates',firstLevel:4,chapter:1,existing:true,evidence:'A',prerequisites:[]},
  {id:'ice',name:'Ice crystals',firstLevel:16,chapter:1,existing:true,evidence:'O',prerequisites:['crates']},
  {id:'rovers',name:'Rescue rovers',firstLevel:31,chapter:1,existing:true,evidence:'O',prerequisites:[]},
  {id:'reactors',name:'Reactors',firstLevel:56,chapter:2,existing:true,evidence:'A',prerequisites:['crates']},
  {id:'comets',name:'Frozen comets',firstLevel:81,chapter:2,existing:true,evidence:'O',prerequisites:['ice']},
  {id:'exits',name:'Evacuation exits',firstLevel:111,chapter:3,existing:false,evidence:'A',prerequisites:[]},
  {id:'waves',name:'Incoming rescue waves',firstLevel:146,chapter:3,existing:false,evidence:'A',prerequisites:['exits']},
  {id:'moonwhales',name:'Moon-whale transfers',firstLevel:186,chapter:4,existing:false,evidence:'A',prerequisites:['rovers']},
  {id:'pups',name:'Moon-pup herding',firstLevel:231,chapter:5,existing:false,evidence:'A',prerequisites:['rovers']},
  {id:'currents',name:'Orbital currents',firstLevel:276,chapter:6,existing:false,evidence:'A',prerequisites:['moonwhales']},
  {id:'pirates',name:'Pirate-drone interception',firstLevel:326,chapter:7,existing:false,evidence:'A',prerequisites:['rovers','reactors']},
  {id:'portals',name:'Paired portals',firstLevel:376,chapter:8,existing:false,evidence:'O',prerequisites:['exits','currents']},
  {id:'bridges',name:'Fold-out bridges',firstLevel:426,chapter:9,existing:false,evidence:'O',prerequisites:['ice','rovers']},
  {id:'shelter',name:'Shelter requests',firstLevel:471,chapter:10,existing:false,evidence:'A',prerequisites:['waves']},
  {id:'gardens',name:'Moon gardens',firstLevel:516,chapter:11,existing:false,evidence:'O',prerequisites:['crates','exits']},
  {id:'keys',name:'Star keys and gates',firstLevel:561,chapter:12,existing:false,evidence:'O',prerequisites:['exits','bridges']},
  {id:'gravity',name:'Gravity switches',firstLevel:611,chapter:13,existing:false,evidence:'O',prerequisites:['portals']},
  {id:'solar',name:'Solar collectors',firstLevel:661,chapter:14,existing:false,evidence:'O',prerequisites:['reactors']},
  {id:'jelly',name:'Friendly space jelly',firstLevel:711,chapter:15,existing:false,evidence:'O',prerequisites:['ice','reactors']},
  {id:'docks',name:'Visiting shuttle docks',firstLevel:756,chapter:16,existing:false,evidence:'O',prerequisites:['rovers','currents']},
  {id:'phase',name:'Phase doors',firstLevel:801,chapter:17,existing:false,evidence:'O',prerequisites:['keys']},
  {id:'relays',name:'Signal relays',firstLevel:841,chapter:17,existing:false,evidence:'O',prerequisites:['solar']},
  {id:'tethers',name:'Tethered rescue pairs',firstLevel:881,chapter:18,existing:false,evidence:'O',prerequisites:['comets','moonwhales']},
  {id:'repair',name:'Repair bots',firstLevel:921,chapter:19,existing:false,evidence:'O',prerequisites:['keys','rovers']},
  {id:'rendezvous',name:'Shuttle rendezvous',firstLevel:961,chapter:20,existing:false,evidence:'O',prerequisites:['docks','phase','moonwhales']},
];
export function first(id:MechanicId):number {return MECHANIC_SCHEDULE.find(entry=>entry.id===id)!.firstLevel;}
export const TEACHING_STAGES=['demonstration','guided','independent-1','independent-2','combination'] as const;
export function teachingAt(level:number):{mechanicId:MechanicId;stage:typeof TEACHING_STAGES[number]}|null {
  const entry=MECHANIC_SCHEDULE.find(m=>level>=m.firstLevel&&level<=m.firstLevel+4);
  return entry?{mechanicId:entry.id,stage:TEACHING_STAGES[level-entry.firstLevel]!}:null;
}
export function validateSchedule(entries:readonly MechanicIntroduction[]):ValidationIssue[] {
  const issues:ValidationIssue[]=[],ids=new Set<string>(),occupied=new Set<number>();
  for(const entry of entries){
    const issue=(code:string,message:string)=>issues.push({code,entityId:entry.id,message});
    if(ids.has(entry.id))issue('duplicate-mechanic','Duplicate mechanic ID');ids.add(entry.id);
    if(!Number.isInteger(entry.firstLevel)||entry.firstLevel<4||entry.firstLevel+4>1000)issue('introduction-range','Invalid introduction level');
    if(entry.chapter!==Math.ceil(entry.firstLevel/50))issue('chapter','Introduction chapter mismatch');
    for(let level=entry.firstLevel;level<=entry.firstLevel+4;level++){
      if(occupied.has(level))issue('teaching-overlap',`Teaching overlaps at ${level}`);occupied.add(level);
    }
    for(const prerequisite of entry.prerequisites){
      const prior=entries.find(m=>m.id===prerequisite);
      if(!prior||prior.firstLevel+4>=entry.firstLevel)issue('prerequisite','Prerequisite teaching must finish before introduction');
    }
  }
  return issues;
}
