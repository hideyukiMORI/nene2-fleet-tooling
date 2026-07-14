// Repo-local lint for the tooling monorepo itself.
// NOTE: this is NOT the fleet-distributed config (that is packages/nene2-standards,
// unimplemented as of W0a stage1). Keep this minimal and unopinionated.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // scripts/*.mjs は Node 実行前提（最小定義 — globals パッケージ依存を増やさない）
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  {
    rules: {
      // CLI prints via console by design.
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
