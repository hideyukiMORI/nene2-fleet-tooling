/**
 * nene2.base — ts strictTypeChecked / prettier interop / import 解決（規約 05 §2.2.1）。
 *
 * plugin 同梱（05 §2.2 冒頭）: 製品側 eslint.config.js での plugins 追加 MUST NOT。
 * ここで登録する plugin key が rule prefix の正本（RAT-2 生成表の入力）。
 */
import comments from '@eslint-community/eslint-plugin-eslint-comments';
import prettierConfig from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import tseslint from 'typescript-eslint';
import type { Linter } from 'eslint';

export const base: Linter.Config[] = [
  // 実測: 11/14 製品が既採用（現状分析 §6）
  ...(tseslint.configs.strictTypeChecked as unknown as Linter.Config[]),
  {
    name: 'nene2/base/options',
    languageOptions: {
      parserOptions: { projectService: true },
    },
    settings: {
      // W0a 確定値: import 系 plugin は eslint-plugin-import-x（flat config ネイティブ）＋
      // eslint-import-resolver-typescript v4 の resolver-next API。
      // 実測（2026-07-14）: project 未指定だと tsconfig paths（@/ エイリアス）が解決されず
      // zones 検査が fail-open になる — project は明示 MUST。'tsconfig.json' は
      // lint 実行 cwd（正準配置 §1.2 の frontend/）からの相対。@/ 配線の最終確定は
      // W0.starter（05 §10.2）— スターター同梱現物が正本。
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ alwaysTryTypes: true, project: ['tsconfig.json'] }),
      ],
    },
  },
  {
    // O-7（会議R5議題(3)）/ I18N-16: 検出器をリポ側 eslint-disable で殺すこと MUST NOT。
    // 偽陽性の是正は 24h の standards patch レーン（fleet-tooling PR）。
    name: 'nene2/base/no-restricted-disable',
    plugins: { 'eslint-comments': comments as never },
    rules: {
      'eslint-comments/no-restricted-disable': [
        'error',
        'better-tailwindcss/no-unknown-classes',
        'no-restricted-syntax',
      ],
    },
  },
  // 整形は pinned prettier に委譲（lint と整形の二重管轄禁止）
  prettierConfig as Linter.Config,
];
