/**
 * 合成規律の実体（規約 05 §2.2 冒頭 MUST — 2026-07-14 レビュー反映）:
 * no-restricted-{syntax,imports,globals} は「(ルール, 適用ファイル) ごとの実効定義がちょうど1つ」
 * になるよう、意味論断片（selectors.ts / restricted-imports.ts）をここでファイル集合別に統合する。
 *
 * ファイル集合は互いに素（ignores / 分割で表現 — 後置き 'off' による除外 MUST NOT）。
 * 唯一の例外は src/shared/api/client.ts の off（A-2/AM-20 の fetch 例外 —
 * gate-integrity の canonical 表に登録済みの off として扱う）。
 *
 * 集合の設計（no-restricted-syntax）:
 *   app      = src/** − client.ts − shared/i18n/messages/** − test/story ファイル
 *   messages = src/shared/i18n/messages/**（JP literal のみ免除 — 第4部 I18N-16 の有限列挙）
 *   client   = src/shared/api/client.ts（A-1 fetch セレクタのみ免除 — AM-20）
 *   tests    = src 内 test/story ＋ tests/**（i18n ランタイム系は非適用 — 05 §2.2.5 ignores）
 *
 * 集合の設計（no-restricted-imports）:
 *   app      = src/** − slices − shared/ui − client.ts
 *   slices   = src/{features,pages,entities}/**（＋ *.css 禁止 — AM-8(c)）
 *   sharedUi = src/shared/ui/**（＋ @/shared/i18n* 禁止 — R1②）
 *   client   = off（A-2 の登録済み例外）
 */
import type { Linter } from 'eslint';

import {
  API_FETCH_SYNTAX,
  I18N_RUNTIME_SYNTAX,
  STYLING_SYNTAX,
  TESTING_SYNTAX,
  type SyntaxSelector,
} from '../selectors.js';
import {
  CSS_IMPORT_PATTERN,
  RESTRICTED_IMPORT_PATHS,
  RESTRICTED_IMPORT_PATTERNS_BASE,
  SHARED_UI_I18N_PATTERN,
  SUSPENSE_QUERY_RESTRICTED_PATH,
} from '../restricted-imports.js';

/**
 * JP lint 3ノード化（AI-19・会議R4 AM-16・R5 文字域修正）。
 * 文字クラスは第4部 I18N-16 の確定正規表現をそのまま使用（1字も発明しない）:
 * ひらがな・カタカナ・CJK（records 現行域）＋々（U+3005）・〆（U+3006）・半角カナ（U+FF66-FF9D）。
 * records 現行の Literal 1本は JSXText / TemplateLiteral を素通しする実穴（AM-16 検証済み）—
 * 3ノード必須。除外の有限列挙は I18N-16（restrictions のファイル集合設計が実装）。
 */
const JP = String.raw`[々〆぀-ヿ㐀-鿿ｦ-ﾝ]`;

export const I18N_JP_SYNTAX: readonly SyntaxSelector[] = [
  {
    selector: `Literal[value=/${JP}/]`,
    message: 'ユーザ知覚文字列は t() 経由（会議R1⑦決定）。',
  },
  {
    selector: `JSXText[value=/${JP}/]`,
    message: '同上。',
  },
  {
    selector: `TemplateElement[value.cooked=/${JP}/]`,
    message: '同上。',
  },
];

export const APP_GLOB = 'src/**/*.{ts,tsx}';
export const CLIENT_TS = 'src/shared/api/client.ts';
export const MESSAGES_GLOB = 'src/shared/i18n/messages/**/*.{ts,tsx}';
export const SLICES_GLOB = 'src/{features,pages,entities}/**/*.{ts,tsx}';
export const SHARED_UI_GLOB = 'src/shared/ui/**/*.{ts,tsx}';
export const TEST_FILE_GLOBS = [
  'src/**/*.test.{ts,tsx}',
  'src/**/*.stories.{ts,tsx}',
  'tests/**/*.{ts,tsx}',
];
const TEST_IGNORE_GLOBS = ['**/*.test.*', '**/*.stories.*'];

function syntaxRule(selectors: readonly SyntaxSelector[]): Linter.RuleEntry {
  return ['error', ...selectors.map((s) => ({ selector: s.selector, message: s.message }))];
}

function importsRule(patterns: readonly unknown[]): Linter.RuleEntry {
  return ['error', { paths: [...RESTRICTED_IMPORT_PATHS], patterns: [...patterns] }];
}

/** 統合済みの配布実体。関心別 config（api/styling/i18n/testing）はこの1定義群を共有する。 */
export const restrictions: Linter.Config[] = [
  // ---- no-restricted-syntax（4集合・互いに素） ----
  {
    name: 'nene2/restrictions/syntax-app',
    files: [APP_GLOB],
    ignores: [CLIENT_TS, MESSAGES_GLOB, ...TEST_IGNORE_GLOBS],
    rules: {
      'no-restricted-syntax': syntaxRule([
        ...API_FETCH_SYNTAX,
        ...STYLING_SYNTAX,
        ...I18N_RUNTIME_SYNTAX,
        ...I18N_JP_SYNTAX,
      ]),
    },
  },
  {
    // JP literal 3ノードのみ免除（カタログの家 — 第4部 I18N-16 の有限列挙）。
    // Intl / lang / styling / fetch 禁止は適用したまま（05 §2.2.5 の互いに素設計）。
    name: 'nene2/restrictions/syntax-messages',
    files: [MESSAGES_GLOB],
    ignores: TEST_IGNORE_GLOBS,
    rules: {
      'no-restricted-syntax': syntaxRule([
        ...API_FETCH_SYNTAX,
        ...STYLING_SYNTAX,
        ...I18N_RUNTIME_SYNTAX,
      ]),
    },
  },
  {
    // A-2/AM-20: transport 生成＋recoverAuth の唯一の座席。A-1 fetch 系のみ免除。
    // styling / i18n の禁止はここにも適用する（全 off にすると製品側 format.ts 自作の座席になる）。
    name: 'nene2/restrictions/syntax-client',
    files: [CLIENT_TS],
    rules: {
      'no-restricted-syntax': syntaxRule([
        ...STYLING_SYNTAX,
        ...I18N_RUNTIME_SYNTAX,
        ...I18N_JP_SYNTAX,
      ]),
      // gate-integrity canonical 表に登録済みの off（05 §2.2 冒頭の唯一の例外）
      'no-restricted-globals': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    // テストファイル向け実効定義（05 §2.2.6 注記の統合先）。
    // 起草判断: src 内テストと tests/** に同一セレクタ集合を適用する（draft は tests/** に
    // api/styling 非適用だったが、集合を分けて維持する意味論差が会議決定に無いため統一）。
    // JP / Intl 系はテスト除外（第4部 I18N-16 の有限列挙・05 §2.2.5 ignores）。
    name: 'nene2/restrictions/syntax-tests',
    files: TEST_FILE_GLOBS,
    rules: {
      'no-restricted-syntax': syntaxRule([
        ...API_FETCH_SYNTAX,
        ...STYLING_SYNTAX,
        ...TESTING_SYNTAX,
      ]),
    },
  },

  // ---- no-restricted-imports（4集合・互いに素） ----
  {
    name: 'nene2/restrictions/imports-app',
    files: [APP_GLOB],
    ignores: [SLICES_GLOB, SHARED_UI_GLOB, CLIENT_TS],
    rules: { 'no-restricted-imports': importsRule(RESTRICTED_IMPORT_PATTERNS_BASE) },
  },
  {
    // AM-8(c): features/pages/entities からの .css import 禁止を base へ統合
    //（分割配布のままだと後勝ち全置換で当該3レイヤの axios/zustand/CSS-in-JS 禁止が消える —
    //  05 §2.2.4 第2オブジェクト注記の治療）
    name: 'nene2/restrictions/imports-slices',
    files: [SLICES_GLOB],
    rules: {
      'no-restricted-imports': importsRule([
        ...RESTRICTED_IMPORT_PATTERNS_BASE,
        CSS_IMPORT_PATTERN,
      ]),
    },
  },
  {
    // R1②: shared/ui は i18n import 禁止を base へ統合（05 §2.2.5 第3オブジェクト注記の治療）
    name: 'nene2/restrictions/imports-shared-ui',
    files: [SHARED_UI_GLOB],
    rules: {
      'no-restricted-imports': importsRule([
        ...RESTRICTED_IMPORT_PATTERNS_BASE,
        SHARED_UI_I18N_PATTERN,
      ]),
    },
  },

  // ---- no-restricted-globals（1集合＋client off） ----
  {
    name: 'nene2/restrictions/globals-app',
    files: [APP_GLOB],
    ignores: [CLIENT_TS],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'HTTP は shared/api/client.ts の apiClient 経由のみ（A-1）。' },
      ],
    },
  },

  // ---- @typescript-eslint/no-restricted-imports（単独定義） ----
  {
    name: 'nene2/restrictions/suspense-query',
    files: [APP_GLOB],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { paths: [SUSPENSE_QUERY_RESTRICTED_PATH] },
      ],
    },
  },
];
