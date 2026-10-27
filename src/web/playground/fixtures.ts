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

/** Jigsaw puzzles: fixtures/jigsaw/*.json and fixtures/jigsaw/invalid/*.json. */
export const jigsawFixtures: FixtureEntry[] = toEntries(
  import.meta.glob<unknown>(['/fixtures/jigsaw/*.json', '/fixtures/jigsaw/invalid/*.json'], { eager: true, import: 'default' }),
);

/** Jigsaw images as served URLs, keyed by their path relative to fixtures/jigsaw/ (e.g. "images/x.png"). */
export const jigsawImageUrls: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('/fixtures/jigsaw/images/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }),
  ).map(([path, url]) => [path.replace(/^\/fixtures\/jigsaw\//, ''), url]),
);
