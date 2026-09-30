import {INTRO} from '../../src/levels/intro';
import {solve} from '../../src/core/solver';
import {loadLevel} from '../../src/core/level';
import {findMatches} from '../../src/core/match';
test('authored introduction has no automatic opening matches and every lesson is beatable',()=>{
 for(const def of INTRO){expect(findMatches(loadLevel(def))).toHaveLength(0);expect(solve(def,50).solved,`lesson ${def.id}`).toBe(true);}
 expect(INTRO[2]!.survivors.some(s=>s.vip==='botanist')).toBe(true);
 expect(INTRO.reduce((n,d)=>n+d.goal.n,0)).toBeGreaterThanOrEqual(3);
});
