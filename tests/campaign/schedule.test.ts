import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import { MECHANIC_SCHEDULE, first, teachingAt, validateSchedule } from '../../src/campaign/schedule';
import { CHAPTERS, chapterForLevel } from '../../src/campaign/chapters';

describe('fixed campaign schedule',()=>{
  it('retains five existing and adds twenty distinct mechanics through level 961',()=>{
    const ids=MECHANIC_SCHEDULE.map(m=>m.id),newIds=MECHANIC_SCHEDULE.filter(m=>!m.existing);
    expect(ids).toHaveLength(25);expect(new Set(ids).size).toBe(25);expect(newIds).toHaveLength(20);
    expect(first('rendezvous')).toBe(961);
  });
  it('matches every approved rollout CSV entry',()=>{
    const rows=readFileSync(new URL('../../docs/campaign-mechanics.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1);
    expect(MECHANIC_SCHEDULE).toEqual(rows.map(row=>{const [id,name,firstLevel,chapter,existing,evidence,prerequisites]=row.split(',');
      return {id,name,firstLevel:Number(firstLevel),chapter:Number(chapter),existing:existing==='true',evidence,prerequisites:prerequisites?prerequisites.split('|'):[]};}));
  });
  it('completes prerequisite teaching before dependent introduction and reserves five distinct stages',()=>{
    expect(validateSchedule(MECHANIC_SCHEDULE)).toEqual([]);
    expect(teachingAt(4)).toEqual({mechanicId:'crates',stage:'demonstration'});
    expect(teachingAt(8)).toEqual({mechanicId:'crates',stage:'combination'});
    expect(teachingAt(9)).toBeNull();
    const bad=structuredClone(MECHANIC_SCHEDULE);bad[1]!.firstLevel=7;
    expect(validateSchedule(bad).some(issue=>issue.code==='teaching-overlap')).toBe(true);
    expect(validateSchedule([...MECHANIC_SCHEDULE,MECHANIC_SCHEDULE[0]!]).some(issue=>issue.code==='duplicate-mechanic')).toBe(true);
  });
  it('maps exactly 20 chapters of 50 levels with room and VIP schedules',()=>{
    expect(CHAPTERS).toHaveLength(20);
    expect(chapterForLevel(50).name).toBe('Home Orbit');
    expect(chapterForLevel(51).name).toBe('Ember Belt');
    expect(chapterForLevel(1000).roomName).toBe('Starfall Ballroom');
    expect(CHAPTERS[19]!.vipLevels).toEqual([975,995]);
    expect(()=>chapterForLevel(0)).toThrow();
  });
});
