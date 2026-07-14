/**
 * codemod 写像表 v1（versioned — 使い捨てスクリプト化 MUST NOT・M-1）。
 *
 * 出典:
 * - 確定写像: 議事録 R2 ⑥(B)「codemod 写像表 v1」＋ AM-3 追記
 *   （accent-weak→accent-soft / brand-violet→x-brand-violet / danger-hover→x-danger-hover）。
 * - vault 個別表: AI-13（tokens 管轄で確定）— nene-vault themes/default.css の現物列挙から作成。
 * - 是正リスト: R2⑥(B) 第1波（payout dead 17・records text-text-secondary 16）＋
 *   R5 議題(3) 実弾成果（records silent no-op 群）＋ AI-18 必須収載（payout typography）。
 *
 * x- 送りの個別名は tokens の技術判断（AM-3 の brand-violet 前例と同型 — AI-5 に載せない）。
 */

import { EXCLUDED_NAMESPACES, isContractTokenName, isExtensionTokenName } from './contract.js';

export const CODEMOD_MAP_VERSION = '1.0.0';

export type MappingTableId = 'common' | 'origin' | 'vault';

/**
 * 共通表（records/payout 系 → 契約 v1）。キーは `--color-` を除いた部分。
 * 値が `x-` で始まるものは拡張トークン送り。
 */
export const COMMON_TABLE: Readonly<Record<string, string>> = {
  // ⑥(B) 確定写像
  fg: 'text-primary',
  'fg-muted': 'text-muted',
  'fg-faint': 'text-faint',
  'fg-inverse': 'text-inverse',
  ok: 'success',
  warning: 'warn',
  'accent-contrast': 'on-accent',
  // AM-3 写像表追記
  'accent-weak': 'accent-soft',
  'brand-violet': 'x-brand-violet',
  'danger-hover': 'x-danger-hover',
  // records 現物の *-weak → *-soft（accent-weak→accent-soft と同型 — tokens 技術判断）
  'success-weak': 'success-soft',
  'warning-weak': 'warn-soft',
  'danger-weak': 'danger-soft',
  // records ドメイントークンの x- 送り（AM-3 brand-violet 前例と同型 — tokens 技術判断）
  'sidebar-bg': 'x-sidebar-bg',
  'sidebar-text': 'x-sidebar-text',
  'sidebar-text-muted': 'x-sidebar-text-muted',
  'sidebar-active-bg': 'x-sidebar-active-bg',
  'sidebar-active-text': 'x-sidebar-active-text',
  'sidebar-active-tint': 'x-sidebar-active-tint',
  'sidebar-hover-bg': 'x-sidebar-hover-bg',
  'sidebar-border': 'x-sidebar-border',
};

/** origin 個別表（議事録: primary・muted(origin) → text-primary・text-muted） */
export const ORIGIN_TABLE: Readonly<Record<string, string>> = {
  primary: 'text-primary',
  muted: 'text-muted',
};

/**
 * vault 個別表（AI-13 — nene-vault/frontend/src/shared/ui/theme/themes/default.css の
 * 全 --color-* 現物 40 個の写像。凍結レビュー資料に「要確認」印付きで全行掲載）。
 */
export const VAULT_TABLE: Readonly<Record<string, string>> = {
  // 面（vault は bg=ページ地・surface=カード面）
  bg: 'surface',
  surface: 'surface-raised',
  'surface-2': 'surface-overlay',
  sunk: 'surface-sunken',
  'sunk-2': 'x-sunk-deep',
  // 文字（line(vault)→border は議事録確定・text 系は同名整合）
  text: 'text-primary',
  'text-muted': 'text-muted',
  'text-faint': 'text-faint',
  ink: 'x-ink',
  'ink-2': 'x-ink-deep',
  // 線
  line: 'border',
  'line-2': 'x-line-mid',
  'line-strong': 'border-strong',
  // navy = ブランドロール → accent
  navy: 'accent',
  'navy-hover': 'accent-hover',
  'navy-soft': 'accent-soft',
  'navy-deep': 'x-navy-deep',
  'navy-line': 'x-navy-line',
  'on-navy': 'on-accent',
  // brass = 第2アクセント → x- 送り
  brass: 'x-brass',
  'brass-deep': 'x-brass-deep',
  'brass-soft': 'x-brass-soft',
  'brass-line': 'x-brass-line',
  'on-brass': 'x-on-brass',
  // seal（ブランドマーク専用）
  seal: 'x-seal',
  'seal-bright': 'x-seal-bright',
  // status
  success: 'success',
  'success-soft': 'success-soft',
  danger: 'danger',
  'danger-soft': 'danger-soft',
  'danger-hover': 'x-danger-hover',
  warning: 'warn',
  'warning-soft': 'warn-soft',
  'warning-ink': 'on-warn',
  // rail（ダークサイドバー）→ x- 送り
  rail: 'x-rail',
  'rail-2': 'x-rail-deep',
  'rail-faint': 'x-rail-faint',
  'rail-ink': 'x-rail-ink',
  'rail-line': 'x-rail-line',
  'rail-text': 'x-rail-text',
};

const TABLES: Record<MappingTableId, Readonly<Record<string, string>>> = {
  common: COMMON_TABLE,
  origin: ORIGIN_TABLE,
  vault: VAULT_TABLE,
};

/**
 * CSS カスタムプロパティ名の写像。
 * 順序: 契約/拡張トークンはそのまま → 除外名前空間は null → 個別表 → common →
 * 汎用 `*-ink → on-*`（⑥(B)） → 非 color/shadow カテゴリの機械的 x- 送り → null（未知 = reject）。
 */
export function mapTokenName(name: string, table: MappingTableId = 'common'): string | null {
  if (isContractTokenName(name) || isExtensionTokenName(name)) return name;
  if (EXCLUDED_NAMESPACES.some((ns) => name.startsWith(ns))) return null;

  if (name.startsWith('--color-')) {
    const key = name.slice('--color-'.length);
    const specific = TABLES[table][key] ?? COMMON_TABLE[key];
    if (specific !== undefined) return `--color-${specific}`;
    const ink = /^(.+)-ink$/.exec(key);
    if (ink) return `--color-on-${ink[1]}`;
    return null; // 未知の color キー — silent drop 禁止・呼び出し側で error
  }
  if (name.startsWith('--shadow-')) {
    // 契約 4 キー以外の shadow は x- 送り（--shadow-glow → --shadow-x-glow）
    const key = name.slice('--shadow-'.length);
    return `--shadow-x-${key}`;
  }
  // 非契約カテゴリ（typography/radius/spacing 等）は v1 スコープ外 — 機械的 x- 送り
  // （AM-3 scope 宣言「x- 拡張で書き v2 で契約化を再審」の写像実装 — tokens 技術判断）
  const m = /^--([a-z][a-z0-9]*)-(.+)$/.exec(name);
  if (m) return `--${m[1]}-x-${m[2]}`;
  return null;
}

/* ------------------------------------------------------------------ */
/* 是正リスト v1（写像表に同梱 — R2⑩「dead class 是正リスト同梱」）        */
/* ------------------------------------------------------------------ */

export interface RemediationItem {
  repo: string;
  kind: 'dead-class' | 'missing-root-token' | 'typography-warning';
  /** 対象（クラス綴り or トークン名） */
  from: string;
  /** 是正先（確定していない場合は undefined — 凍結レビューで確定） */
  to?: string;
  /** 議事録に記録された実測箇所数（記録がないものは undefined） */
  count?: number;
  /** 是正先が会議決定そのものか（false = tokens 起草判断・レビューで確定） */
  confirmed: boolean;
  source: string;
  note?: string;
}

export const REMEDIATION_V1: readonly RemediationItem[] = [
  // 第1波（R2⑥(B)・AI-8）— known-utility lint の実弾テストを兼ねる
  {
    repo: 'nene-payout',
    kind: 'dead-class',
    from: 'text-primary',
    to: 'text-text-primary',
    confirmed: true,
    source: 'R2⑥(B)/AI-8 — payout dead class 17（text-primary/text-muted 合算）',
  },
  {
    repo: 'nene-payout',
    kind: 'dead-class',
    from: 'text-muted',
    to: 'text-text-muted',
    confirmed: true,
    source: 'R2⑥(B)/AI-8 — 同上',
  },
  {
    repo: 'nene-records',
    kind: 'dead-class',
    from: 'text-text-secondary',
    to: 'text-text-muted',
    count: 16,
    confirmed: false,
    source: 'R2⑥(B)/AI-7(b) — トークン定義 0 件の silent no-op。是正先 muted は tokens 起草判断',
  },
  // R5 議題(3) 実弾成果（規約発効前からの既存バグ — AI-20）
  {
    repo: 'nene-records',
    kind: 'dead-class',
    from: 'text-text',
    to: 'text-text-primary',
    count: 9,
    confirmed: true,
    source: 'R5 議題(3) — NotificationChannelForm.tsx:207 ほか',
  },
  {
    repo: 'nene-records',
    kind: 'missing-root-token',
    from: '--color-surface-sunken',
    to: 'root @theme へ宣言追加',
    confirmed: true,
    source: 'R5 訂正1 — 契約語彙を正しく綴っても no-op する新故障類型（局所テーマのみに存在）',
  },
  {
    repo: 'nene-records',
    kind: 'dead-class',
    from: 'hover:bg-surface-hover',
    to: 'hover:bg-surface-overlay',
    confirmed: false,
    source: 'R5 議題(3) — ホバー無反応で出荷中。是正先 overlay は tokens 起草判断',
  },
  {
    repo: 'nene-records',
    kind: 'dead-class',
    from: 'border-border-subtle',
    to: 'border-border',
    count: 2,
    confirmed: false,
    source: 'R5 議題(3) — 是正先 border は tokens 起草判断',
  },
  {
    repo: 'nene-records',
    kind: 'typography-warning',
    from: 'text-body-sm',
    confirmed: true,
    source: 'R5 議題(3) — 色系 block 対象外・oracle warning レポート対象（AI-18 棚卸しへ）',
  },
  {
    repo: 'nene-payout',
    kind: 'typography-warning',
    from: 'text-body',
    confirmed: true,
    source: 'AI-18 必須収載 — shared/ui primitives 内の契約外無言依存（4クラスの一部）',
  },
  {
    repo: 'nene-payout',
    kind: 'typography-warning',
    from: 'text-heading',
    confirmed: true,
    source: 'AI-18 必須収載 — 同上',
  },
] as const;

export const CODEMOD_MAP_V1 = {
  version: CODEMOD_MAP_VERSION,
  contract: '1.0',
  tables: TABLES,
  remediation: REMEDIATION_V1,
} as const;
