// Proves what the RN proof claims, from an unminified dev bundle where every module is
// defined with its path relative to examples/rn:
//   - the shared src/core + src/react are bundled straight from the repo (../../src/...)
//   - src/web is not bundled
//   - exactly one copy of React, from examples/rn/node_modules
//   - nothing comes from the repo root's node_modules (../../node_modules/...)
// Run `npm run check:bundle`, which exports the bundle first.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-dev/_expo/static/js/android';
const file = readdirSync(dir).find((f) => f.endsWith('.js'));
if (!file) throw new Error(`No bundle in ${dir}`);
const bundle = readFileSync(join(dir, file), 'utf8');

const unique = (re) => [...new Set(bundle.match(re) ?? [])].sort();
const shared = unique(/"\.\.\/\.\.\/src\/(core|react)\/[^"]+\.ts"/g);
const web = unique(/"\.\.\/\.\.\/src\/web\/[^"]+"/g);
const rootNodeModules = unique(/"\.\.\/\.\.\/node_modules\/[^"]+"/g);
const reactEntries = unique(/"[^"]*node_modules\/react\/index\.js"/g);

console.log(`shared src modules: ${shared.length}`);
for (const s of shared) console.log(`  ${s}`);
console.log(`src/web modules: ${web.length}`);
console.log(`modules from root node_modules: ${rootNodeModules.length}`);
console.log(`react entry points: ${reactEntries.join(', ')}`);

const ok =
  shared.length > 0 &&
  web.length === 0 &&
  rootNodeModules.length === 0 &&
  reactEntries.length === 1 &&
  reactEntries[0] === '"node_modules/react/index.js"';
console.log(ok ? 'OK' : 'FAILED');
process.exit(ok ? 0 : 1);
