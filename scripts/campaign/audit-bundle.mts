import { build } from 'vite';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const forbidden=/(?:\/campaign\/(?:solver|validator)\.ts|\/lesson-solutions\.dev\.ts|\/scripts\/campaign\/|\/validation\/campaign\/traces\/)/;
let modules=0,chunks=0;
await build({root,logLevel:'error',build:{write:false},plugins:[{
  name:'audit-campaign-production-boundary',
  generateBundle(_options,bundle){
    for(const id of this.getModuleIds()){
      modules++;if(forbidden.test(id.replaceAll('\\','/')))throw new Error(`Development campaign module in production graph: ${id}`);
    }
    for(const file of Object.values(bundle)){
      if(file.type!=='chunk')continue;chunks++;
      if(/lessonSolutionTraces|solveCampaign|sliding-stars-replay-|campaign-preview/.test(file.code))throw new Error(`Development campaign marker in ${file.fileName}`);
    }
  },
}]});
console.log(JSON.stringify({status:'passed',modules,chunks,developmentCampaignModules:0}));
