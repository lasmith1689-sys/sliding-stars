import {createServer} from 'vite';
import {readFileSync,writeFileSync} from 'node:fs';
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try {
 const {getAuthoredLessonLevel}=await server.ssrLoadModule('/src/campaign/lessons.ts');
 const {loadCampaignLevel}=await server.ssrLoadModule('/src/campaign/engine/load.ts');
 const {transition}=await server.ssrLoadModule('/src/campaign/engine/turn.ts');
 const {hashState}=await server.ssrLoadModule('/src/campaign/engine/hash.ts');
 const traces=[];
 for(const id of [471,472,473,474,475]){
  const path=`validation/campaign/traces/level-${String(id).padStart(4,'0')}.json`,proof=JSON.parse(readFileSync(path,'utf8')),level=getAuthoredLessonLevel(id),actions=proof.trace.actions;
  let state=loadCampaignLevel(level);const initialHash=hashState(state),counts=[state.crew.map(c=>({id:c.id,shelter:c.shelterMoves,rescue:c.rescueMoves}))];
  for(const action of actions){const result=transition(state,action);if(!result.accepted)throw Error(`${id}: ${result.rejection}`);state=result.state;counts.push(state.crew.map(c=>({id:c.id,shelter:c.shelterMoves,rescue:c.rescueMoves,status:c.status})));}
  if(state.status!=='won')throw Error(`${id}: ${state.status}`);
  const trace={levelId:id,campaignVersion:level.campaignVersion,rulesVersion:level.rulesVersion,initialHash,actions,finalHash:hashState(state)};traces.push(trace);writeFileSync(path,JSON.stringify({level,trace},null,2)+'\n');console.log(JSON.stringify({id,actions,counts}));
 }
 const path='src/campaign/content/lesson-solutions.dev.ts',source=readFileSync(path,'utf8').split('\n').filter(line=>!traces.some(t=>line.includes('"levelId":'+t.levelId+','))).join('\n');writeFileSync(path,source.replace('SolutionTrace[]=[','SolutionTrace[]=[\n'+traces.map(t=>'  '+JSON.stringify(t)+',').join('\n')));
}finally {await server.close();}
