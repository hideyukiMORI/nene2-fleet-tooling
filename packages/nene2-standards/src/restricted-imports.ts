/**
 * no-restricted-imports の paths / patterns 群（意味論の正本: 規約 05 §2.2.2〜2.2.5）。
 * 統合は configs/restrictions.ts（合成規律 — 05 §2.2 冒頭）。
 */

export interface RestrictedPath {
  readonly name: string;
  readonly message: string;
  readonly importNames?: readonly string[];
}

export interface RestrictedPattern {
  readonly group: readonly string[];
  readonly message: string;
}

/** A-1/A-2＋恒久禁止ライブラリ（会議R3④A-1/A-2・R1③⑤⑦決定 — 05 §2.2.3）。 */
export const RESTRICTED_IMPORT_PATHS: readonly RestrictedPath[] = [
  {
    name: '@hideyukimori/nene2-client',
    message: 'transport 生成は shared/api/client.ts の1ファイルのみ（A-2）。',
  },
  { name: 'axios', message: 'A-1 違反。' },
  { name: 'ky', message: 'A-1 違反。' },
  { name: 'zustand', message: '会議R1③決定: client state ライブラリ導入 MUST NOT。' },
  { name: 'jotai', message: '同上。' },
  { name: 'redux', message: '同上。' },
  { name: '@reduxjs/toolkit', message: '同上。' },
  { name: 'i18next', message: '会議R1⑦決定: 外部 i18n ライブラリ MUST NOT。' },
  { name: 'react-i18next', message: '同上。' },
  { name: 'react-intl', message: '同上。' },
  { name: '@lingui/core', message: '同上。' },
  { name: 'styled-components', message: '会議R1⑤決定: ランタイム CSS-in-JS 恒久 MUST NOT。' },
  {
    // paths は module 名の完全一致 — patterns（gitignore 意味論）に置くと
    // '@/shared/ui/<component>'（R1① の正例）まで全滅する（#19 素振り実測）
    name: '@/shared/ui',
    message:
      'shared/ui の集約バレルは存在しない。@/shared/ui/<component> を import する（会議R1①決定）。',
  },
];

/** fsd（05 §2.2.2）＋CSS-in-JS patterns（05 §2.2.3）— src/** 全域の基本 patterns。 */
export const RESTRICTED_IMPORT_PATTERNS_BASE: readonly RestrictedPattern[] = [
  {
    group: ['../../*'],
    message: 'スライス跨ぎの相対 import MUST NOT。スライス外は @/ 絶対形で書く（第1部 1-4）。',
  },
  {
    // '@/shared/ui' 自体（拡張子なし集約バレル）は paths 側の完全一致で禁止（#19）
    group: ['@/shared/ui/index*'],
    message:
      'shared/ui の集約バレルは存在しない。@/shared/ui/<component> を import する（会議R1①決定）。',
  },
  {
    group: ['@emotion/*'],
    message: '会議R1⑤決定: ランタイム CSS-in-JS 恒久 MUST NOT。',
  },
];

/** features/pages/entities のみ追加（会議R4 AM-8(c)決定 — 05 §2.2.4 第2オブジェクトの統合先）。 */
export const CSS_IMPORT_PATTERN: RestrictedPattern = {
  group: ['*.css'],
  message: 'CSS の import は app エントリと shared/ui/theme のみ（会議R4 AM-8決定）。',
};

/** shared/ui のみ追加（会議R1②決定 — 05 §2.2.5 第3オブジェクトの統合先）。 */
export const SHARED_UI_I18N_PATTERN: RestrictedPattern = {
  group: ['@/shared/i18n*'],
  message:
    'shared/ui から useTranslation/t の import MUST NOT。文字列は required prop で受ける（会議R1②決定）。',
};

/** useSuspenseQuery 系の新規使用禁止（会議R1③決定 — @typescript-eslint 側ルールで単独定義）。 */
export const SUSPENSE_QUERY_RESTRICTED_PATH: RestrictedPath = {
  name: '@tanstack/react-query',
  importNames: ['useSuspenseQuery', 'useSuspenseQueries', 'useSuspenseInfiniteQuery'],
  message: '非 Suspense 既定（会議R1③決定）。解除は router 層整備後の ADR のみ。',
};
