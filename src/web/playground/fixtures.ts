/** Every JSON file under /fixtures, loaded at build time. Validation happens later, at runtime. */
const modules = import.meta.glob<unknown>('/fixtures/**/*.json', { eager: true, import: 'default' });

export interface FixtureEntry {
  /** Path relative to the repo root, e.g. "fixtures/financial-money-basics.json". */
  path: string;
  data: unknown;
}

export const fixtures: FixtureEntry[] = Object.entries(modules)
  .map(([path, data]) => ({ path: path.replace(/^\//, ''), data }))
  .sort((a, b) => a.path.localeCompare(b.path));
