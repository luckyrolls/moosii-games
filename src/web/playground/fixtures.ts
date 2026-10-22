/** Fixture JSON files, loaded at build time. Validation happens later, at runtime. */

export interface FixtureEntry {
  /** Path relative to the repo root, e.g. "fixtures/financial-money-basics.json". */
  path: string;
  data: unknown;
}

function toEntries(modules: Record<string, unknown>): FixtureEntry[] {
  return Object.entries(modules)
    .map(([path, data]) => ({ path: path.replace(/^\//, ''), data }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Groups puzzles: fixtures/*.json and fixtures/invalid/*.json. */
export const fixtures: FixtureEntry[] = toEntries(
  import.meta.glob<unknown>(['/fixtures/*.json', '/fixtures/invalid/*.json'], { eager: true, import: 'default' }),
);

/** Word puzzles: fixtures/word/*.json and fixtures/word/invalid/*.json. */
export const wordFixtures: FixtureEntry[] = toEntries(
  import.meta.glob<unknown>(['/fixtures/word/*.json', '/fixtures/word/invalid/*.json'], { eager: true, import: 'default' }),
);

/** Take a Moment config: fixtures/moment/*.json and fixtures/moment/invalid/*.json. */
export const momentFixtures: FixtureEntry[] = toEntries(
  import.meta.glob<unknown>(['/fixtures/moment/*.json', '/fixtures/moment/invalid/*.json'], { eager: true, import: 'default' }),
);
