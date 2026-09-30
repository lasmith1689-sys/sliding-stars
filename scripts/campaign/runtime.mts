import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import type { run as Run } from './commands';

/** Existing Vite loader resolves the shipped source's extensionless TS imports. */
export async function launch(command:string):Promise<void>{
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const server=await createServer({root,configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'error'});
  try{
    const module=await server.ssrLoadModule('/scripts/campaign/commands.ts') as {run:typeof Run};
    process.exitCode=await module.run(command,process.argv.slice(2),root);
  }catch(error){
    console.log(JSON.stringify({status:'error',issues:[{code:'cli',message:error instanceof Error?error.message:String(error)}]}));process.exitCode=1;
  }finally{await server.close();}
}
