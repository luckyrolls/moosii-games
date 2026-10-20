// Builds assets/words-6.json from the repo's ENABLE list (public domain; see
// src/web/wordlist/NOTICE.md). All Word fixtures are 6 letters, so only that length is bundled.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '../../../src/web/wordlist/data/words-6.txt');
const words = readFileSync(source, 'utf8').split('\n').filter((w) => /^[A-Z]{6}$/.test(w));
writeFileSync(join(here, '../assets/words-6.json'), JSON.stringify(words));
console.log(`wrote ${words.length} words`);
