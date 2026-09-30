import { existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,rmdirSync,writeFileSync } from 'node:fs';
import { dirname,join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parseCampaignChapter,parseCampaignLevel,parseSolutionTrace } from '../../src/campaign/schema';
import { solveCampaign,type SearchLimits } from '../../src/campaign/solver';
import { replayTrace,validateCandidate,validateForRelease } from '../../src/campaign/validator';
import { getAuthoredLessonLevel,authoredLessonLevels } from '../../src/campaign/lessons';
import { lessonSolutionTraces } from '../../src/campaign/content/lesson-solutions.dev';
import type { CampaignLevel,SolutionTrace,ValidationIssue } from '../../src/campaign/types';

interface Entry {level:CampaignLevel;trace?:SolutionTrace}
interface Proof {level:CampaignLevel;trace:SolutionTrace}
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const read=(path:string):unknown=>JSON.parse(readFileSync(resolve(path),'utf8'));
const errorMessage=(error:unknown)=>error instanceof Error?error.message:String(error);
const issue=(code:string,message:string,levelId?:number):ValidationIssue=>({code,message,...(levelId===undefined?{}:{levelId})});
function output(value:unknown,path?:string){
  const json=JSON.stringify(value,null,2);
  if(path){mkdirSync(dirname(resolve(path)),{recursive:true});writeFileSync(resolve(path),`${json}\n`);}
  console.log(json);
}
function options(args:string[]):Map<string,string>{
  const result=new Map<string,string>(),flags=new Set(['--lessons','--help']),values=new Set(['--input','--lesson','--trace','--release','--traces','--out','--maxNodes','--maxDepth','--maxMilliseconds']);
  for(let i=0;i<args.length;i++){
    const name=args[i]!;if(result.has(name))throw new Error(`Duplicate option ${name}`);
    if(flags.has(name)){result.set(name,'true');continue;}
    if(!values.has(name))throw new Error(`Unknown option ${name}`);
    const value=args[++i];if(value===undefined||value.startsWith('--'))throw new Error(`Missing value for ${name}`);result.set(name,value);
  }return result;
}
function budgets(opts:Map<string,string>):SearchLimits {
  const number=(name:string,fallback:number)=>{const value=opts.has(name)?Number(opts.get(name)):fallback;if(!Number.isSafeInteger(value)||value<0)throw new Error(`Invalid search limit ${name}`);return value;};
  return {maxNodes:number('--maxNodes',10000),maxDepth:number('--maxDepth',20),maxMilliseconds:number('--maxMilliseconds',10000)};
}
function entry(value:unknown):Entry {
  if(record(value)&&'level'in value)return {level:parseCampaignLevel(value.level),...('trace'in value?{trace:parseSolutionTrace(value.trace)}:{})};
  return {level:parseCampaignLevel(value)};
}
function select(opts:Map<string,string>,command:string):{entries:Entry[];issues:ValidationIssue[];scope:string;expected:number}{
  const choices=['--input','--lesson','--lessons','--release'].filter(key=>opts.has(key));
  if(choices.length!==1)throw new Error('Select exactly one of --input, --lesson, --lessons, --release');
  if(opts.has('--trace')&&(opts.has('--lessons')||opts.has('--release')))throw new Error('--trace only applies to one input or lesson');
  if(opts.has('--traces')&&!opts.has('--release'))throw new Error('--traces requires --release');
  const entries:Entry[]=[],issues:ValidationIssue[]=[];
  if(opts.has('--release')){
    if(command!=='validate'&&command!=='report')throw new Error('--release is only available for validate/report');
    if(!opts.has('--traces'))throw new Error('--release requires --traces directory');
    for(let chapter=1;chapter<=20;chapter++){
      const path=join(opts.get('--release')!,`chapter-${String(chapter).padStart(2,'0')}.json`);
      if(!existsSync(path)){issues.push(issue('missing-chapter',`Missing ${path}`));continue;}
      try{
        for(const level of parseCampaignChapter(read(path),chapter)){
          const tracePath=join(opts.get('--traces')!,`level-${String(level.id).padStart(4,'0')}.json`);
          if(!existsSync(tracePath)){issues.push(issue('missing-trace',`Missing ${tracePath}`,level.id));continue;}
          try{const value=read(tracePath);entries.push({level,trace:parseSolutionTrace(record(value)&&'trace'in value?value.trace:value)});}
          catch(error){issues.push(issue('trace-schema',errorMessage(error),level.id));}
        }
      }catch(error){issues.push(issue('chapter-schema',`${path}: ${errorMessage(error)}`));}
    }
    return {entries,issues,scope:'release',expected:1000};
  }
  if(opts.has('--lessons')){
    if(command==='solve')throw new Error('Solve one explicit lesson or input at a time');
    for(const level of authoredLessonLevels)entries.push({level,trace:lessonSolutionTraces.find(t=>t.levelId===level.id)});
  }else if(opts.has('--lesson')){
    const id=Number(opts.get('--lesson')),level=getAuthoredLessonLevel(id);if(!level)throw new Error(`No authored lesson ${id}`);
    entries.push({level,...(command==='replay'?{trace:lessonSolutionTraces.find(t=>t.levelId===id)}:{})});
  }else{
    const value=read(opts.get('--input')!);
    entries.push(...(Array.isArray(value)?value.map(entry):[entry(value)]));
    if(!entries.length)throw new Error('Input is empty');
  }
  if(opts.has('--trace')){
    if(entries.length!==1)throw new Error('--trace requires exactly one level');
    const value=read(opts.get('--trace')!);entries[0]!.trace=parseSolutionTrace(record(value)&&'trace'in value?value.trace:value);
  }
  if(new Set(entries.map(e=>e.level.id)).size!==entries.length)throw new Error('Duplicate input level ID');
  return {entries,issues,scope:opts.has('--lessons')?'lesson-fixtures':'candidate',expected:entries.length};
}

/** Serialization plus a new Node/Vite instance: never shares search states or module memory. */
function freshReplay(proofs:Proof[],root:string):{won:boolean;pid?:number;issues:ValidationIssue[]}{
  const directory=mkdtempSync(join(tmpdir(),'sliding-stars-replay-'));
  const path=join(directory,'proofs.json');
  try{
    writeFileSync(path,JSON.stringify(proofs));
    const child=spawnSync(process.execPath,[join(root,'scripts/campaign/replay.mts'),'--input',path],{encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});
    if(child.error)return {won:false,issues:[issue('fresh-process',errorMessage(child.error))]};
    const value:unknown=JSON.parse(child.stdout);
    if(child.status!==0||!record(value)||value.won!==true||typeof value.pid!=='number'||value.pid===process.pid)
      return {won:false,issues:[issue('fresh-process',`Replay failed (${child.status}): ${child.stdout||child.stderr}`)]};
    return {won:true,pid:value.pid,issues:[]};
  }catch(error){return {won:false,issues:[issue('fresh-process',errorMessage(error))]};}
  finally{rmSync(path,{force:true});rmdirSync(directory);}
}

export async function run(command:string,args:string[],root:string):Promise<number>{
  const opts=options(args);
  if(opts.has('--help')){console.log('Campaign '+command+': choose --input level-or-proof.json | --lesson ID | --lessons | --release chapter-directory --traces trace-directory. Optional --trace trace.json --out file.json --maxNodes 10000 --maxDepth 20 --maxMilliseconds 10000. Release expects all 20 chapters and level-0001.json through level-1000.json. Exit 1 means invalid or unresolved.');return 0;}
  const limits=budgets(opts),selection=select(opts,command),issues=[...selection.issues];
  if(command==='replay'){
    const results=selection.entries.map(({level,trace})=>({levelId:level.id,...(trace?replayTrace(level,trace):{won:false,issues:[issue('missing-trace','Replay requires a trace',level.id)]})}));
    issues.push(...results.flatMap(r=>r.issues));const won=issues.length===0&&results.length>0&&results.every(r=>r.won);
    output({won,pid:process.pid,issues,results},opts.get('--out'));return won?0:1;
  }
  if(command==='solve'){
    if(selection.entries.length!==1)throw new Error('Solve requires exactly one level');
    const {level}=selection.entries[0]!,invalid=validateCandidate(level);
    if(invalid.length){output({status:'invalid',issues:invalid});return 1;}
    const result=solveCampaign(level,limits);
    if(result.status!=='solved'){output({...result,levelId:level.id,limits});return 1;}
    const freshProcess=freshReplay([{level,trace:result.trace}],root);
    if(!freshProcess.won){output({status:'invalid',issues:freshProcess.issues});return 1;}
    const path=opts.get('--out');if(path){mkdirSync(dirname(resolve(path)),{recursive:true});writeFileSync(resolve(path),JSON.stringify({level,trace:result.trace},null,2)+'\n');}
    output({...result,levelId:level.id,limits,freshProcess,...(path?{written:resolve(path)}:{})});return 0;
  }
  const proofs:Proof[]=[],results:{levelId:number;status:string;issues:ValidationIssue[]}[]=[];
  for(const {level,trace} of selection.entries){
    let itemIssues=validateCandidate(level),status='invalid';
    if(!itemIssues.length){
      const result=trace?{status:'solved' as const,trace}:solveCampaign(level,limits);
      itemIssues=validateForRelease(level,result);status=itemIssues.length?(result.status==='solved'?'invalid':result.status):'verified';
      if(result.status==='solved'&&!itemIssues.length)proofs.push({level,trace:result.trace});
    }
    issues.push(...itemIssues);results.push({levelId:level.id,status,issues:itemIssues});
  }
  const freshProcess=proofs.length?freshReplay(proofs,root):null;
  if(freshProcess)issues.push(...freshProcess.issues);
  const verified=freshProcess?.won?proofs.length:0;
  const passed=issues.length===0&&verified===selection.expected;
  output({status:passed?'passed':'failed',scope:selection.scope,expectedLevels:selection.expected,verifiedLevels:verified,limits,issues,results,freshProcess},opts.get('--out'));
  return passed?0:1;
}
