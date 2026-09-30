import { expect,it } from 'vitest';
import { replayTrace } from '../../src/campaign/validator';
import { getAuthoredLessonLevel } from '../../src/campaign/lessons';
import { lessonSolutionTraces } from '../../src/campaign/content/lesson-solutions.dev';
import { spawnSync } from 'node:child_process';
import { mkdtempSync,readFileSync,rmSync,rmdirSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';

const level=getAuthoredLessonLevel(2)!;
const trace=lessonSolutionTraces.find(t=>t.levelId===2)!;
it('replays a serialized authored trace through shipped rules',()=>{
  expect(replayTrace(level,JSON.parse(JSON.stringify(trace)))).toEqual({won:true,issues:[]});
});
it.each([
  {change:{initialHash:'wrong'},code:'initial-hash'},
  {change:{finalHash:'wrong'},code:'final-hash'},
  {change:{levelId:3},code:'trace-level'},
  {change:{rulesVersion:'campaign-2'},code:'trace-schema'},
  {change:{actions:[]},code:'not-won'},
  {change:{actions:[{type:'swap',from:{r:0,c:0},to:{r:0,c:1}}]},code:'rejected-action'},
  {change:{actions:[{type:'booster',kind:'demo',at:{r:0,c:0}}]},code:'booster-action'},
  {change:{actions:[...trace.actions,trace.actions[0]]},code:'after-terminal'},
])('rejects an invalid trace: $code',({change,code})=>{
  const result=replayTrace(level,{...trace,...change});
  expect(result.won).toBe(false);expect(result.issues.map(i=>i.code)).toContain(code);
});

it('CLI solves to disk, replays in a fresh process, rejects tampering and blocks empty release catalogs',()=>{
  const directory=mkdtempSync(join(tmpdir(),'campaign-cli-test-'));
  const run=(name:string,args:string[])=>spawnSync(process.execPath,[resolve(`scripts/campaign/${name}.mts`),...args],{encoding:'utf8',timeout:60000});
  try{
    const file=join(directory,'proof.json');
    const solve=run('solve',['--lesson','2','--maxNodes','3000','--maxDepth','2','--maxMilliseconds','15000','--out',file]);
    expect(solve.status,solve.stderr||solve.stdout).toBe(0);
    const result=JSON.parse(solve.stdout);
    expect(result.status).toBe('solved');expect(result.freshProcess.pid).not.toBe(process.pid);
    expect(JSON.parse(readFileSync(file,'utf8')).trace.actions).toHaveLength(2);
    const replay=run('replay',['--input',file]);
    expect(replay.status,replay.stderr||replay.stdout).toBe(0);expect(JSON.parse(replay.stdout).won).toBe(true);
    const bundle=JSON.parse(readFileSync(file,'utf8'));bundle.trace.finalHash='wrong';writeFileSync(file,JSON.stringify(bundle));
    const bad=run('replay',['--input',file]);expect(bad.status).toBe(1);expect(JSON.parse(bad.stdout).issues[0].code).toBe('final-hash');
    const empty=run('validate',['--release',directory,'--traces',directory]);
    expect(empty.status).toBe(1);const report=JSON.parse(empty.stdout);
    expect(report.status).toBe('failed');expect(report.issues.filter((i:{code:string})=>i.code==='missing-chapter')).toHaveLength(20);
    const timeout=run('report',['--lesson','2','--maxNodes','0']);
    expect(timeout.status).toBe(1);expect(JSON.parse(timeout.stdout).issues.some((i:{code:string})=>i.code==='unresolved')).toBe(true);
  }finally{rmSync(join(directory,'proof.json'),{force:true});rmdirSync(directory);}
},60000);
