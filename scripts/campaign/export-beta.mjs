import { rolldown } from 'rolldown';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

// Freeze the reviewed lesson definitions into release content. Development
// solutions and solver traces are never imported into the shipped catalog.
const bundle = await rolldown({ input: 'src/campaign/content/lesson-seeds.ts' });
const result = await bundle.generate({ format: 'esm' });
await bundle.close();
const code = result.output.find(item => item.type === 'chunk')?.code;
if (!code) throw new Error('Could not bundle lesson definitions');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const { authoredLessonSeeds } = await import(moduleUrl);
const levels = authoredLessonSeeds.filter(level => level.id <= 805 && !level.mechanics.some(mechanic => mechanic.id === 'portals'));
if (levels.length !== 102 || levels[0]?.id !== 1 || levels.at(-1)?.id !== 805) {
  throw new Error(`Unexpected reviewed beta set: ${levels.length} levels`);
}
const json = `${JSON.stringify(levels)}\n`;
await writeFile('src/campaign/content/beta-levels.json', json);
console.log(`Exported ${levels.length} fixed levels (IDs ${levels[0].id}–${levels.at(-1).id}); SHA-256 ${createHash('sha256').update(json).digest('hex')}`);
