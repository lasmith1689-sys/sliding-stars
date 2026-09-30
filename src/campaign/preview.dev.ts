/** Explicit DEV-only fixtures; this module is dynamically imported behind import.meta.env.DEV. */
import {getAuthoredLessonLevel} from './lessons';
import {createCampaignSave} from '../session/campaignSession';
import {migrateRun} from '../session/migrate';
import {GameSession} from '../meta/run';
import {INTRO} from '../levels/intro';
import {parseCampaignLevel} from './schema';
import type {CampaignLevel,GeometryDef} from './types';
import type {SaveStorage,LevelProvider,SaveV2} from '../session/types';
import type {Pos,Tier} from '../core/types';
function tallFixture():CampaignLevel {
 const rows=['5123412','5341234','2512341','.234123','234X234','341234.','4123412','1234123','234123S'];
 const mask=rows.map(row=>[...row].map(c=>c!=='.')),cells=mask.flatMap((row,r)=>row.flatMap((yes,c)=>yes?[{r,c}]:[]));
 const geometry:GeometryDef={rows:9,cols:7,mask,inactiveCells:[],refillSources:[],gravitySegments:[],chambers:[{id:'room',cells,directions:['down']}],routes:[],connections:[],endpoints:[]};
 for(let c=0;c<7;c++)for(let r=0;r<9;r++)if(mask[r]![c]&&(!r||!mask[r-1]![c])){const run:Pos[]=[];for(let rr=r;rr<9&&mask[rr]![c];rr++)run.push({r:rr,c});const id=`column-${c}-${r}`;geometry.gravitySegments.push({id,cells:run,direction:'down',chamberId:'room'});geometry.refillSources.push({id:`source-${c}-${r}`,at:{r,c},segmentId:id});}
 const pieces:CampaignLevel['pieces']=rows.flatMap((row,r)=>[...row].flatMap((ch,c)=>ch==='.'||ch==='X'?[]:[ch==='S'?{id:`tile-${r}-${c}`,kind:'station' as const,at:{r,c},facing:'left' as const}:{id:`tile-${r}-${c}`,kind:'tile' as const,at:{r,c},tier:Number(ch) as Tier}]));
 const level=getAuthoredLessonLevel(1)!;
 return parseCampaignLevel({...level,id:4,geometry,pieces,fixtures:[{id:'preview-crate',kind:'crate',at:{r:4,c:3},hp:3}],mechanics:[{id:'crates',fixtureIds:['preview-crate']}],goals:[...level.goals,{id:'supplies',type:'recoverSupplies',eligible:{type:'ids',ids:['preview-crate']}}],presentationId:'development-layout-fixture',lessonId:null});
}
export function previewSetup(base:SaveStorage,params:URLSearchParams):{storage:SaveStorage;provider:LevelProvider;initial:()=>Promise<SaveV2>} {
 const id=Number(params.get('campaign-preview')||1),fixture=params.get('fixture')??'lesson',slot=params.get('slot')??'default';
 const prefix=`sliding-stars-development-preview:${id}:${fixture}:${slot}:`;
 const storage:SaveStorage={getItem:key=>base.getItem(prefix+key),setItem:(key,value)=>base.setItem(prefix+key,value)};
 const provider:LevelProvider=async number=>{const level=getAuthoredLessonLevel(number);if(!level)throw Error(`Authored preview lesson ${number} is not present. Full campaign content arrives with the release catalog.`);return level;};
 const initial=async()=>{
  if(fixture==='legacy'){const old=new GameSession(INTRO[0]!,{getItem:()=>null,setItem:()=>{}});old.data.seenTips.push('welcome');return migrateRun(old.data);}
  const level=fixture==='tall'?tallFixture():await provider(id);if(fixture==='loss')level.moveLimit=1;
  if(fixture==='key-mismatch'&&id===563){
   const key=level.pieces.find(p=>p.id==='key-1')!,tile=level.pieces.find(p=>p.at.r===1&&p.at.c===0)!;
   tile.at={...key.at};key.at={r:1,c:0};
  }
  return createCampaignSave(level);
 };
 return {storage,provider,initial};
}
