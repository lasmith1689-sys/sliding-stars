import {rolldown} from 'rolldown';
import {writeFile} from 'node:fs/promises';
const bundle=await rolldown({input:'scripts/campaign/finish-lessons.ts'}),built=await bundle.generate({format:'esm'});await bundle.close();
const code=built.output.find(item=>item.type==='chunk')?.code;if(!code)throw Error('No lesson proof bundle');
const {proveFinishLessons}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
let proofs;try{proofs=proveFinishLessons();}catch(error){console.error(error.message);process.exit(1);}
await writeFile('src/campaign/content/finish-solutions.dev.json',JSON.stringify(proofs,null,2)+'\n');
await writeFile('validation/campaign/finish-mechanics-proofs.json',JSON.stringify({lessons:proofs.length,boosterFree:true,proofs},null,2)+'\n');
console.log(JSON.stringify(proofs.map(trace=>({level:trace.levelId,moves:trace.actions.length}))));
