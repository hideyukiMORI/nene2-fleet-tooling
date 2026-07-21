/**
 * codemod 写像表 v1（versioned — 使い捨てスクリプト化 MUST NOT・M-1）。
 *
 * 出典:
 * - 確定写像: 議事録 R2 ⑥(B)「codemod 写像表 v1」＋ AM-3 追記
 *   （accent-weak→accent-soft / brand-violet→x-brand-violet / danger-hover→x-danger-hover）。
 * - vault 個別表: AI-13（tokens 管轄で確定）— nene-vault themes/default.css の現物列挙から作成。
 * - suite 個別表: #23（suite W1 stage1 実測）— nene-suite PR #381 の実証済み SUITE_MAP を正とする
 *   （契約 17・x- 27・prefix-less 全名写像）。
 * - origin 個別表: #24（origin W1 実測）— nene-origin themes/default.css+dark.css の現物全 --color- 列挙。
 * - 是正リスト: R2⑥(B) 第1波（payout dead 17・records text-text-secondary 16）＋
 *   R5 議題(3) 実弾成果（records silent no-op 群）＋ AI-18 必須収載（payout typography）。
 *
 * x- 送りの個別名は tokens の技術判断（AM-3 の brand-violet 前例と同型 — AI-5 に載せない）。
 */

import {
  EXCLUDED_NAMESPACES,
  isContractTokenName,
  isExtensionTokenName,
  TAILWIND_V4_NAMESPACES,
  tailwindNamespaceOf,
} from './contract.js';

// 表と照合関数の正本は contract.ts（葉）— ここは再輸出のみ（#49。1枚を3つが見る不変条件）
export { TAILWIND_V4_NAMESPACES, tailwindNamespaceOf };

// 1.1.0: C part-1（#92）— 未知 namespace の x-送り（fallback 発明）を廃し reject へ。
// 1.2.0: C part-2 束 — LEGACY_PREFIX_HINTS（#125）＋FIELD_TABLE 正本化（#127）。
//   ＋published 1.1.0（silent x-送り＝gap-x-stack 衝突）と main 1.1.0（reject）の挙動乖離を
//   版で区別する是正を兼ねる（§4-4・origin W1 #300 実測 2026-07-21）。正本は 1.2.0。
export const CODEMOD_MAP_VERSION = '1.2.0';

/**
 * Tailwind v4 の theme variable namespace（**長い namespace が短い prefix より先**）。
 *
 * **これは Tailwind の規則であって NeNe 語彙の写像判断ではない**（codemod.ts の
 * NAMESPACE_UTILITY_ROOTS と同じ責務分界）。x- 送り（rule 6）と utility class 翻訳
 * （codemod.ts `namespaceOf`）の**両方がこの1枚を正本にする** — 二重定義すると
 * 「表は font-weight を知っているが x- 送りは知らない」という #17 の食い違いが再発する。
 *
 * 順序の不変条件（テストで固定）: multi-segment namespace は、その prefix になる
 * 短い namespace より **必ず前**（`font-weight` は `font` より前・`inset-shadow`/
 * `text-shadow`/`drop-shadow` は `shadow` より前）。
 *
 * 実測（tailwindcss 4.3.2 の emit — #17）:
 *  - `--font-weight-x-medium` → `.font-x-medium { font-weight: … }`（意味論 保存）
 *  - `--font-x-weight-medium` → `.font-x-weight-medium { font-family: … }`（意味論 破壊）
 */

/**
 * トークン名の namespace を返す（既知 v4 namespace を長い順に照合・**表に無ければ null**）。
 * 未知 namespace（`--z-*` 等）は C part-1（#92）で reject へ落ちる — namespace を発明しない。
 */

export type MappingTableId = 'common' | 'origin' | 'vault' | 'suite' | 'field';

/**
 * 写像の結果類型（#24 point5 — 「fatal null」と「pass-through」を型で区別する）。
 * - `contract`    : 既に契約/拡張トークン — 不変（rewrite 不要）。
 * - `rename`      : 旧語彙 → 契約/拡張ターゲットへ改名。
 * - `passthrough` : 除外 namespace（--breakpoint-* ・ --container-*）。Tailwind の正規 @theme
 *                   トークンとして宣言は正当 — 変換対象外・宣言はそのまま維持（fatal ではない）。
 * - `reject`      : 未知の色トークン等 — fail-closed（silent drop 禁止・呼び出し側で error）。
 *
 * fail-closed の対象は「未知の色トークン」であって「既知の非対象 namespace」ではない（#24）。
 */
export type TokenMapping =
  | { readonly kind: 'contract'; readonly name: string }
  | { readonly kind: 'rename'; readonly name: string }
  | { readonly kind: 'passthrough'; readonly name: string }
  | { readonly kind: 'reject'; readonly reason: string };

/**
 * 同義ロール名の正規化（R2⑥(A) の synonym ban と同型）。
 * ink 規則（`*-ink → on-*`）より **先に** 適用する — さもないと `warning-ink` が契約外の
 * `on-warning` を吐く（#24 バグ #2: ink 規則が `warning→warn` より先に発火していた）。
 */
const ROLE_SYNONYMS: Readonly<Record<string, string>> = {
  warning: 'warn',
  ok: 'success',
};

/**
 * 共通表（records/payout 系 → 契約 v1）。キーは `--color-` を除いた部分。
 * 値が `x-` で始まるものは拡張トークン送り。individual 表（origin/vault）の
 * フォールバック共通ベースでもある（TABLES[table][key] ?? COMMON_TABLE[key]）。
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

/**
 * origin 個別表（#24 — nene-origin/frontend/src/shared/ui/theme/themes/default.css + dark.css の
 * 現物 --color-* 全列挙）。契約名そのものの roles（surface / accent / danger / focus-ring 等）は
 * ここに載せない — 表に無い名は契約短絡でそのまま通る。ここに載せるのは pre-contract 語彙のみ。
 *
 * 衝突裁定（AM-3「x- 送りは tokens の技術判断」の範囲 — AI-5 非掲載）:
 *  - accent-contrast(#fff = accent 面上のテキスト) → on-accent（契約の「on-」ロール）
 *  - accent-ink(#8f4322 = 別トーン・components で text-accent-ink×10 が別色として使用) → x-accent-ink
 *    naive では両者とも on-accent に潰れ 19 usage が1色化する（#24 見た目退行）。ink を x- へ退避して衝突解消。
 *  - neutral は契約ロール外 → on-neutral は契約に存在しない。ink 規則を使わず x- 送り。
 */
export const ORIGIN_TABLE: Readonly<Record<string, string>> = {
  // 文字（origin は primary/muted を裸で使う）
  primary: 'text-primary',
  muted: 'text-muted',
  // accent 系の余剰（現物）— 衝突裁定は上コメント参照
  'accent-contrast': 'on-accent',
  'accent-ink': 'x-accent-ink',
  'accent-glow': 'x-accent-glow', // 装飾影(toast) — focus-ring ではない
  // status ink（現物）: warning は warn へ正規化してから on- を付ける（#24 バグ #2 の明示回避）
  'danger-ink': 'on-danger',
  'success-ink': 'on-success',
  'info-ink': 'on-info',
  'warning-ink': 'on-warn',
  // status soft（現物）: warn-soft は COMMON 未収載の契約語彙
  warning: 'warn', // COMMON にもあるが現物列挙のため明示
  'warning-soft': 'warn-soft',
  // neutral（契約ロール外）→ x- 送り（on-neutral は契約に無い）
  'neutral-soft': 'x-neutral-soft',
  'neutral-ink': 'x-neutral-ink',
  // 遮蔽（現物 overlay = modal scrim）→ 契約 scrim
  overlay: 'scrim',
};

/**
 * vault 個別表（AI-13 — nene-vault/frontend/src/shared/ui/theme/themes/default.css の
 * 全 --color-* 現物 40 個の写像。凍結レビュー資料に「要確認」印付きで全行掲載）。
 *
 * 注意（#25）: `surface → surface-raised` のように **pre-contract 名が契約名と綴り衝突** する
 * キーがある。mapTokenName は個別表引きを契約短絡より先に評価するため、vault の `--color-surface`
 * は契約名として素通りせず正しく `--color-surface-raised` へ改名される（`--color-bg → --color-surface`
 * との衝突を回避）。
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

/**
 * suite 個別表（#23 — nene-suite PR #381 `frontend/scripts/w1-stage1-token-rename.mjs` の
 * SUITE_MAP を正とする実証済み写像）。**prefix-less 全名表**: 他表と違いキーは `--color-`/`--shadow-`
 * を含まない裸名（`bg`/`fg-2`/`r`/`shadow`/`font-sans` …）で、**値は完全なターゲット名**（`--color-*`
 * / `--shadow-*` / `--font-*` / `--r-*` とカテゴリを跨ぐ）。これにより suite の単一セグメント名
 * （`--bg`/`--r` 等）が汎用 x- 送り正規表現で NULL に落ちる #23 原因3 を根本回避する。
 *
 * 内訳（PR #381 実測）: 契約名 rename 17（surface×4・border×2・text×3・accent 3・status 3・shadow 1
 * ＋不変 --shadow-lg）／x- 送り 27（brand primitives 7・origin 1・dark sidebar 6・hero 5・
 * logo-ring/dot 2・typography 3・radius 3）。値は不変（名前のみ・vault 前例と同型）。
 */
export const SUITE_TABLE: Readonly<Record<string, string>> = {
  // ── surfaces (contract) ──
  bg: '--color-surface',
  surface: '--color-surface-raised',
  'surface-2': '--color-surface-overlay',
  'surface-3': '--color-surface-sunken',
  // ── borders (contract) ──
  border: '--color-border',
  'border-2': '--color-border-strong',
  // ── text (contract) ──
  fg: '--color-text-primary',
  'fg-2': '--color-text-muted',
  'fg-3': '--color-text-faint',
  // ── accent (contract — suite の意味的別名が契約座席になる) ──
  accent: '--color-accent',
  'accent-soft': '--color-accent-soft',
  'on-brand': '--color-on-accent',
  // ── brand primitives (x- 拡張; accent/*-soft はこれ由来) ──
  brand: '--color-x-brand',
  'brand-strong': '--color-x-brand-strong',
  'brand-deep': '--color-x-brand-deep',
  'brand-soft': '--color-x-brand-soft',
  'brand-softer': '--color-x-brand-softer',
  'side-brand': '--color-x-side-brand',
  ink: '--color-x-ink',
  // ── status (contract) ──
  ok: '--color-success',
  warn: '--color-warn',
  danger: '--color-danger',
  // ── product/domain color (x-) ──
  origin: '--color-x-origin',
  // ── dark sidebar chrome (x-) ──
  'side-bg': '--color-x-side-bg',
  'side-bg-2': '--color-x-side-bg-2',
  'side-fg': '--color-x-side-fg',
  'side-fg-mut': '--color-x-side-fg-mut',
  'side-active': '--color-x-side-active',
  'side-line': '--color-x-side-line',
  // ── marketing hero gradient (x-) ──
  'hero-1': '--color-x-hero-1',
  'hero-2': '--color-x-hero-2',
  'hero-3': '--color-x-hero-3',
  'hero-accent': '--color-x-hero-accent',
  'hero-bd': '--color-x-hero-bd',
  // ── misc color (x-) ──
  'logo-ring': '--color-x-logo-ring',
  dot: '--color-x-dot',
  // ── shadow (contract) ──
  // NOTE: `--shadow-lg` は既に契約名（SHADOW_KEYS に lg）— 意図的に非収載・不変。
  shadow: '--shadow-md',
  // ── typography (v1 スコープ外 → x-) ──
  'font-sans': '--font-x-sans',
  'font-num': '--font-x-num',
  'font-serif': '--font-x-serif',
  // ── radius (v1 スコープ外 → x-) ──
  r: '--r-x-base',
  'r-sm': '--r-x-sm',
  'r-pill': '--r-x-pill',
};

/**
 * field 個別表（#127 — nene-field W1 語彙表正本化・候補案 handoff-field-w1-token-map-proposal を
 * fleet 正本化レビュー通過＝安全弁1 で origin#24 型衝突を排除して確定）。
 *
 * ここに載るのは **(B) x-送り 20 行のみ**（改名のみ＝視覚変化ゼロ・x- 座席は空＝conflict なし）。
 * 元候補の (A) 8 件は、field ネイティブ契約トークン（surface-overlay/border 等）への rename が
 * codemod の 2ソース→1ターゲット conflict を起こすため（G-6 silent 上書き禁止・実測確認）、正本化前に
 * hub 裁定で再分類済み: 5 件は field 側 **(C)-style**（源削除＋参照書換＝視覚 merge を意図どおり
 * 実現）・3 件は本表の **(B) x-送り**（fg-muted-2/fg-faint-2/border-input・使用多&中Δ で退行回避）。
 * (C) 総数 = 8（btn-danger 統合＋btn-disabled/pulse 削除＋(A)由来 (C)-style 5）— FIELD_TABLE 外。
 *
 * **Δ中スモーク条項（安全弁2）**: (C)-style で契約段へ寄せる行のうち fg-muted-2/fg-faint-2 型は Δ中。
 * field 統合時の目視スモーク（Dashboard/MobileShell/フォーム系/Table）で退行が出たら (B) x-送りへ
 * 切替可（本表へ追加＝視覚変化ゼロへ退避）。
 */
export const FIELD_TABLE: Readonly<Record<string, string>> = {
  // 分類1 (B): 面・線の1色化(#24 型)回避＋ドメイン深段
  'accent-soft-border': 'x-accent-soft-border',
  'accent-deep': 'x-accent-deep',
  'accent-deep-2': 'x-accent-deep-2',
  // 分類1 (A由来→B): 使用多&中Δ＝退行回避で x-送り（安全弁2 の事前適用）
  'fg-muted-2': 'x-fg-muted-2',
  'fg-faint-2': 'x-fg-faint-2',
  'border-input': 'x-border-input',
  // 分類2 (B): 業務状態色（report status のドメイン語彙 — 汎用へ潰さず独立保持）
  submitted: 'x-submitted',
  'submitted-soft': 'x-submitted-soft',
  approved: 'x-approved',
  'approved-soft': 'x-approved-soft',
  rejected: 'x-rejected',
  'rejected-soft': 'x-rejected-soft',
  draft: 'x-draft', // hex=fg-muted-2 と同値だが意味が別＝統合しない
  'draft-soft': 'x-draft-soft',
  // 分類3 (B): 機能色（近い契約段なし／別トーン塗り）
  ai: 'x-ai',
  'ai-soft': 'x-ai-soft',
  'btn-success': 'x-btn-success',
  'toast-check': 'x-toast-check',
  'row-hover': 'x-row-hover',
  'row-active': 'x-row-active',
};

/** `--color-` 接尾辞で引く個別表（common 共通ベース付き）。 */
const COLOR_SUFFIX_TABLES: Record<
  'common' | 'origin' | 'vault' | 'field',
  Readonly<Record<string, string>>
> = {
  common: COMMON_TABLE,
  origin: ORIGIN_TABLE,
  vault: VAULT_TABLE,
  field: FIELD_TABLE,
};

/** prefix-less 全名で引く個別表（suite — キーは裸名・値は完全なターゲット名）。 */
const FULLNAME_TABLES: Partial<Record<MappingTableId, Readonly<Record<string, string>>>> = {
  suite: SUITE_TABLE,
};

/** codemod が発火する wave 文脈（C part-2 #94 §4-1 施主裁定 — font-size は W3 でのみ reject）。 */
export type ActiveWave = 'W1' | 'W3';

/**
 * legacy prefix hint 表（C part-2 #94/#125 — hint 付き reject 表 B1）。
 *
 * fallback 非経由の silent 受理を止める: `--font-size-body` は先頭 `font` が v4 実在
 * namespace（font-family）に prefix 一致するため step 6 が `--font-x-size-body` へ x-送りして
 * **黙って font-family に帰属**させる（#17 が font-size で生存した形・#56-A で禁止）。fallback 除去
 * （C part-1）では直らない（fallback を通らない）ので、step 6 の**前**（step 5.5）で reject する。
 *
 * - **reject であって auto-rename ではない**: 送り先変更は「今黙っているものの起動」＝W1 受入条件
 *   「現行外観の保存」に反し、機械導出不能で M-1 純度も満たせない（board (C) 施主裁定の線）。
 * - `activeFrom`: `'now'`=常時 active（非実在 prefix 系は part-1 後の既定が step7 reject＝hint を足す改良）。
 *   `'W3'`=wave ゲート（font-size は現行 W1 x-送りを維持し W3 で reject — §4-1 施主裁定 案2）。
 * - **キーは v4 実在 namespace と素な集合**（実在 namespace を B1 に書けない — §5(b) でテスト）。
 */
export const LEGACY_PREFIX_HINTS: Readonly<
  Record<
    string,
    { readonly hint: string | null; readonly activeFrom: ActiveWave; readonly note: string }
  >
> = {
  'font-size': {
    hint: 'text',
    activeFrom: 'W3',
    note: 'v4 の家は --text-*。再ホームは語彙裁定（第二波）',
  },
  'line-height': {
    hint: 'leading',
    activeFrom: 'W1',
    note: 'part-1 で既に reject — hint を足すだけ',
  },
  'letter-spacing': {
    hint: 'tracking',
    activeFrom: 'W1',
    note: '候補（フリート実測では未出現・予防的収載）',
  },
  'border-width': {
    hint: null,
    activeFrom: 'W1',
    note: 'v4 に namespace 無し（border 幅は静的 utility）。@theme 外の plain var へ（§4-3(a)）',
  },
  z: {
    hint: null,
    activeFrom: 'W1',
    note: 'v4 に namespace 無し（z-index は静的 utility）。@theme 外の plain var へ（§4-3(a)）',
  },
};

/** 裸名（先頭 `--` 除去済み）が LEGACY_PREFIX_HINTS のどの prefix に該当するか（longest-first）。 */
function matchLegacyPrefix(
  name: string,
): { prefix: string; entry: (typeof LEGACY_PREFIX_HINTS)[string] } | null {
  const bare = name.slice(2); // 先頭 `--` を除く
  const prefixes = Object.keys(LEGACY_PREFIX_HINTS).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (bare.startsWith(`${prefix}-`)) return { prefix, entry: LEGACY_PREFIX_HINTS[prefix]! };
  }
  return null;
}

/** B1 reject の reason 文（hint あり=正しい家を示す・hint 無し=plain var へ誘導）。 */
function legacyPrefixReason(
  name: string,
  prefix: string,
  entry: (typeof LEGACY_PREFIX_HINTS)[string],
): string {
  const home = entry.hint
    ? `正しい家は '--${entry.hint}-*'。`
    : `v4 に対応 namespace が無い（静的 utility）— @theme 外の plain var へ移す。`;
  return (
    `legacy token ${name} — '--${prefix}-*' は v4 では別 namespace に食われる（silent 受理は ` +
    `#56-A で禁止）。${home}自動改名は W1 外観保存（07-14 裁定）に反するため行わない — ` +
    `写像表に語彙裁定を追加せよ（C part-2 #94）`
  );
}

/**
 * CSS カスタムプロパティ名の写像分類（#24 point5 — 型で contract/rename/passthrough/reject を区別）。
 *
 * 評価順（#25 是正 — 個別表引きを契約短絡より **先** に）:
 *  1. 個別表（全名表 suite → `--color-` 接尾辞表）。pre-contract 名が契約名と綴り衝突しても改名を優先。
 *  2. 表に無い契約/拡張トークン → そのまま（contract）。
 *  3. 除外 namespace（--breakpoint-* ・ --container-*）→ passthrough（宣言は素通し・fatal ではない）。
 *  4. 表に無い `--color-*` → 汎用 `*-ink → on-*`（同義正規化を先に）→ 未知は reject。
 *  5. `--shadow-*`（契約4键以外）→ x- 送り。
 *  6. 非契約カテゴリ（typography/radius/spacing 等）→ 機械的 x- 送り。
 *  7. 単一セグメント等の未知名 → reject（fail-closed・写像を発明しない）。
 */
export function classifyTokenName(
  name: string,
  table: MappingTableId = 'common',
  opts: { activeWave?: ActiveWave } = {},
): TokenMapping {
  // 1a. prefix-less 全名表（suite）— #23 原因3 の根本回避（単一セグメント名の NULL 落ち防止）
  const wholeTable = FULLNAME_TABLES[table];
  if (wholeTable) {
    const whole = wholeTable[name.slice(2)]; // 先頭 `--` を除いた裸名で引く
    if (whole !== undefined) return { kind: 'rename', name: whole };
  }
  // 1b. `--color-` 接尾辞表（#25: 契約短絡より先 — vault surface→surface-raised 等の衝突回避）
  if (name.startsWith('--color-')) {
    const key = name.slice('--color-'.length);
    const t = (COLOR_SUFFIX_TABLES as Record<string, Readonly<Record<string, string>>>)[table];
    const specific = (t ? t[key] : undefined) ?? COMMON_TABLE[key];
    if (specific !== undefined) return { kind: 'rename', name: `--color-${specific}` };
  }

  // 2. 表に無い名で契約/拡張トークンなら不変（既に移行済み）
  if (isContractTokenName(name) || isExtensionTokenName(name)) return { kind: 'contract', name };

  // 3. 除外 namespace は pass-through（fatal null ではない — #24 point5）
  if (EXCLUDED_NAMESPACES.some((ns) => name.startsWith(ns))) return { kind: 'passthrough', name };

  // 4. 表に無い `--color-*` — 汎用 ink 規則 → reject
  if (name.startsWith('--color-')) {
    const key = name.slice('--color-'.length);
    const ink = /^(.+)-ink$/.exec(key);
    if (ink) {
      const base = ROLE_SYNONYMS[ink[1]!] ?? ink[1]!; // #24: warning→warn を ink より先に
      return { kind: 'rename', name: `--color-on-${base}` };
    }
    return {
      kind: 'reject',
      reason: `unknown color token ${name} (table='${table}') — silent drop 禁止`,
    };
  }
  // 5. 契約 4 键以外の shadow は x- 送り（--shadow-glow → --shadow-x-glow）
  if (name.startsWith('--shadow-')) {
    return { kind: 'rename', name: `--shadow-x-${name.slice('--shadow-'.length)}` };
  }
  // 5.5. legacy prefix hint 表（B1・C part-2 #94/#125）— fallback 非経由の silent 受理を止める。
  //      step 6（namespace x-送り）の**前**・step 1〜5 の**後**（表に明示エントリがあれば上が勝つ）。
  //      font-size（activeFrom 'W3'）は既定 W1 では素通り＝現行 x-送り維持・W3 でのみ reject（§4-1 施主裁定）。
  const legacy = matchLegacyPrefix(name);
  if (legacy) {
    const gatedOff = legacy.entry.activeFrom === 'W3' && opts.activeWave !== 'W3';
    if (!gatedOff) {
      return { kind: 'reject', reason: legacyPrefixReason(name, legacy.prefix, legacy.entry) };
    }
    // gatedOff（font-size @ W1）= 現行挙動維持のため step 6 へ素通り
  }
  // 6. 非契約カテゴリ（typography/radius/spacing 等）は v1 スコープ外 — 機械的 x- 送り
  //    （AM-3 scope 宣言「x- 拡張で書き v2 で契約化を再審」の写像実装 — tokens 技術判断）
  //
  //    x- は **v4 namespace の直後＝キーの先頭** に挿す（#17）。旧実装は先頭セグメント直後に
  //    挿していたため multi-segment namespace が割れ、`--font-weight-medium` が
  //    `--font-x-weight-medium`（= font-family の キー x-weight-medium）へ変質していた。
  //    実測（tailwindcss 4.3.2）: 旧 → `.font-x-weight-medium { font-family: … }` /
  //    新 → `.font-x-medium { font-weight: … }`。namespace は常に保存される。
  //
  //    x- 送りは **表の実在 namespace のみ**（C part-1 #92 — tailwindNamespaceOf は未知で null）。
  //    かつては fallback が namespace を発明して `--line-height-body → --line-x-height-body` を
  //    生成し（dead token・#17）、re-run では x-送り済みのそれへ再度 x- を送っていた（#90 実測）。
  const ns = tailwindNamespaceOf(name);
  if (ns !== null) {
    const key = name.slice(`--${ns}-`.length);
    // キーが空（`--font-` のような末尾ハイフン名）は写像を発明せず reject へ落とす。
    // 旧実装の `(.+)` が担っていた非空要件をここで保つ（fail-closed の維持）。
    if (key !== '') return { kind: 'rename', name: `--${ns}-x-${key}` };
  }

  // 7. 未知 namespace・単一セグメント等の未知名 — 発明せず reject（(i)reject・C part-1 #92）
  return {
    kind: 'reject',
    reason:
      `unknown token ${name} — namespace is not in the Tailwind v4 table ` +
      `and no entry in mapping table '${table}' (no invented namespaces; ` +
      `add a table entry or re-home the token — C part-2)`,
  };
}

/**
 * CSS カスタムプロパティ名の写像（後方互換 API）。
 * rename/contract/passthrough はターゲット名（passthrough は不変）、reject は null（呼び出し側で error）。
 * 注意: null は「未知＝reject」のみ。除外 namespace の pass-through は非 null で名前を返す
 * （fatal と pass-through の区別は classifyTokenName の kind で行う — #24 point5）。
 */
export function mapTokenName(name: string, table: MappingTableId = 'common'): string | null {
  const r = classifyTokenName(name, table);
  return r.kind === 'reject' ? null : r.name;
}

/* ------------------------------------------------------------------ */
/* 衝突検出の一般化（#24 point3 — 複数ソース→単一ターゲットは driver で明示 error）  */
/* ------------------------------------------------------------------ */

export interface TokenSetConflict {
  /** 2 ソース以上が集中したターゲット名 */
  readonly target: string;
  /** そのターゲットへ写る旧名（辞書順） */
  readonly sources: readonly string[];
}

export interface TokenSetResult {
  readonly renames: readonly { readonly from: string; readonly to: string }[];
  readonly passthrough: readonly string[];
  readonly rejected: readonly { readonly from: string; readonly reason: string }[];
  /** 同一ターゲットに 2 ソース以上（silent 上書き＝G-6 違反）。空でなければ driver は停止すべき。 */
  readonly conflicts: readonly TokenSetConflict[];
}

/**
 * 名前集合を一括写像し、衝突（複数ソース→単一ターゲット）を検出する（#24 point3）。
 * silent 上書き禁止（G-6 同型）。衝突を「通す」唯一の方法は個別表で明示 disambiguation する
 * こと（例: origin の accent-contrast→on-accent と accent-ink→x-accent-ink）。本関数に許可
 * リストは無い — 表で別ターゲットへ振り分けた時点で衝突は消える。
 */
export function mapTokenSet(
  names: readonly string[],
  table: MappingTableId = 'common',
  opts: { activeWave?: ActiveWave } = {},
): TokenSetResult {
  const renames: { from: string; to: string }[] = [];
  const passthrough: string[] = [];
  const rejected: { from: string; reason: string }[] = [];
  const byTarget = new Map<string, Set<string>>(); // ターゲット名 → それを生む相異なる旧名
  for (const name of names) {
    const r = classifyTokenName(name, table, opts);
    if (r.kind === 'reject') {
      rejected.push({ from: name, reason: r.reason });
      continue;
    }
    if (r.kind === 'passthrough') {
      passthrough.push(name);
      continue;
    }
    if (r.kind === 'rename') renames.push({ from: name, to: r.name });
    // contract / rename はターゲット座席を占有する — 衝突判定に載せる
    const set = byTarget.get(r.name) ?? new Set<string>();
    set.add(name);
    byTarget.set(r.name, set);
  }
  const conflicts: TokenSetConflict[] = [];
  for (const [target, sources] of byTarget) {
    if (sources.size > 1) conflicts.push({ target, sources: [...sources].sort() });
  }
  conflicts.sort((a, b) => (a.target < b.target ? -1 : a.target > b.target ? 1 : 0));
  return { renames, passthrough, rejected, conflicts };
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
  tables: {
    common: COMMON_TABLE,
    origin: ORIGIN_TABLE,
    vault: VAULT_TABLE,
    // suite は prefix-less 全名表（キー＝裸名・値＝完全ターゲット名）— 他表と引き方が異なる
    suite: SUITE_TABLE,
  },
  remediation: REMEDIATION_V1,
} as const;
