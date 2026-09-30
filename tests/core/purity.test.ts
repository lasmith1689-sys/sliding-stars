import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN = [/from ['"]pixi\.js['"]/, /src\/render/, /src\/ui/, /src\/input/, /src\/audio/,
  /\bdocument\b/, /\bwindow\b/, /\bnavigator\b/];

test('src/core imports nothing from the render world', () => {
  const dir = join(__dirname, '../../src/core');
  for (const f of readdirSync(dir)) {
    const text = readFileSync(join(dir, f), 'utf8');
    for (const re of FORBIDDEN) expect(text).not.toMatch(re);
  }
});
