import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Browser globals that must never appear in the portable layers (src/core, src/react).
// Those layers are reused unchanged in React Native, where none of these exist.
const DOM_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'KeyboardEvent',
  'MouseEvent',
  'getComputedStyle',
  'matchMedia',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'setInterval',
  'alert',
].map((name) => ({
  name,
  message: 'Portable layers (src/core, src/react) must not use DOM/browser APIs or timers.',
}));

const NO_WEB_LAYER = {
  group: ['**/web', '**/web/**'],
  message: 'Lower layers must not import from src/web.',
};

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: { ecmaVersion: 2022 },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Config files run in Node.
  {
    files: ['*.config.{ts,js}'],
    languageOptions: { globals: globals.node },
  },

  // src/core: pure TypeScript. No React, no DOM.
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'src/core is pure TypeScript: no React.' },
            { name: 'react-dom', message: 'src/core is pure TypeScript: no React DOM.' },
          ],
          patterns: [
            { group: ['react/*', 'react-dom/*'], message: 'src/core is pure TypeScript: no React.' },
            { group: ['**/react', '**/react/**'], message: 'src/core must not import from src/react.' },
            NO_WEB_LAYER,
          ],
        },
      ],
      'no-restricted-globals': ['error', ...DOM_GLOBALS],
    },
  },

  // src/react: shared hooks. React allowed, React DOM and DOM APIs are not.
  {
    files: ['src/react/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'react-dom', message: 'src/react is reused in React Native: no React DOM.' }],
          patterns: [
            { group: ['react-dom/*'], message: 'src/react is reused in React Native: no React DOM.' },
            NO_WEB_LAYER,
          ],
        },
      ],
      'no-restricted-globals': ['error', ...DOM_GLOBALS],
    },
  },
  // Hook tests need a DOM environment to render; the rule is about shipped code.
  {
    files: ['src/react/**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off', 'no-restricted-globals': 'off' },
  },

  // src/web: browser renderer.
  {
    files: ['src/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // src/web/components: copied into moosii-reader as-is, so it must not depend on scaffolding.
  {
    files: ['src/web/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/playground', '**/playground/**'],
              message: 'src/web/components must not import from src/web/playground.',
            },
          ],
        },
      ],
    },
  },
);
