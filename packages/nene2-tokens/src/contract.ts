/**
 * Core Token Contract v1 — the single semantic token vocabulary of the NeNe fleet.
 *
 * 正本性: このファイルの列挙が契約の正本（規約 03 §0.1「配布物が正」）。
 * キーの出典: 会議議事録 R2 ⑥(B) 確定語彙＋AM-3（カテゴリ構造・shadow 4键・focus-ring 収載）。
 * 1字も発明しない — 変更は契約進化規約（AM-2）に従う。
 */

/** Contract version. 正本は本 export ただ1つ（R5 AM-1': 版の正本は CONTRACT_TOKENS 1つ）。 */
export const CONTRACT_VERSION = '1.0';

/** color カテゴリ 28 キー（議事録 R2⑥(B)・規約 03 TK-02 の確定列挙・この順序が正準順） */
export const COLOR_KEYS = [
  // 面 (surfaces)
  'surface',
  'surface-raised',
  'surface-overlay',
  'surface-sunken',
  // 文字 (text)
  'text-primary',
  'text-muted',
  'text-faint',
  'text-inverse',
  // 線 (borders)
  'border',
  'border-strong',
  // ブランド (accent)
  'accent',
  'accent-hover',
  'accent-soft',
  'on-accent',
  // 危険 (danger)
  'danger',
  'danger-soft',
  'on-danger',
  // 成功 (success)
  'success',
  'success-soft',
  'on-success',
  // 警告 (warn)
  'warn',
  'warn-soft',
  'on-warn',
  // 情報 (info)
  'info',
  'info-soft',
  'on-info',
  // フォーカス (WCAG 2.4.7/2.4.11)
  'focus-ring',
  // 遮蔽 (scrim)
  'scrim',
] as const;

/** shadow カテゴリ 4 キー（AM-3 — 31テーマ全部が持つ実運用変数の契約化） */
export const SHADOW_KEYS = ['sm', 'md', 'lg', 'focus'] as const;

export type ColorTokenKey = (typeof COLOR_KEYS)[number];
export type ShadowTokenKey = (typeof SHADOW_KEYS)[number];

export type ColorTokenName = `--color-${ColorTokenKey}`;
export type ShadowTokenName = `--shadow-${ShadowTokenKey}`;
export type ContractTokenName = ColorTokenName | ShadowTokenName;

/** 契約カテゴリ。v1 のスコープはこの2つのみ（AM-3 scope 宣言 — typography/radius/spacing は x- 拡張・v2 再審）。 */
export const CONTRACT_CATEGORIES = ['color', 'shadow'] as const;
export type ContractCategory = (typeof CONTRACT_CATEGORIES)[number];

export const COLOR_TOKEN_NAMES: readonly ColorTokenName[] = COLOR_KEYS.map(
  (k) => `--color-${k}` as ColorTokenName,
);
export const SHADOW_TOKEN_NAMES: readonly ShadowTokenName[] = SHADOW_KEYS.map(
  (k) => `--shadow-${k}` as ShadowTokenName,
);

/**
 * CONTRACT_TOKENS — 名前配列＋版（AM-3 で v1 から含めることが確定した export。
 * AM-5: ランタイム・トークン注入の許可リストはここから導出 MUST — 手書き列挙 MUST NOT）。
 */
export const CONTRACT_TOKENS = {
  version: CONTRACT_VERSION,
  categories: CONTRACT_CATEGORIES,
  color: COLOR_KEYS,
  shadow: SHADOW_KEYS,
  /** CSS カスタムプロパティ名の全列挙（28 + 4 = 32） */
  names: [...COLOR_TOKEN_NAMES, ...SHADOW_TOKEN_NAMES] as readonly ContractTokenName[],
} as const;

/**
 * Tailwind v4 の namespace 表 — **フリート唯一の1枚**（#17・#35・#49）。
 *
 * x- 送り（`codemod-map.ts`）・class 翻訳（`codemod.ts namespaceOf`）・**契約検査（本ファイルの
 * `isExtensionTokenName`）** の3つがこの1枚を正本にすることが不変条件。二重定義すると
 * 「片方だけが `font-weight` を知っている」状態が生まれ、namespace が x- 送りで割れても
 * もう片方が気づけない（#17 の本体）。
 *
 * #49 まで契約検査だけが独立の正規表現でカテゴリ形を決めており（`--<cat>-x-<name>` の
 * cat がハイフンを含めない形）、**#35 が生成側を是正した後も追随せず、道具が自分の生成物を
 * 拒否していた**（`--font-weight-x-medium` → false）。本ファイル（何も import しない葉）へ
 * 表を置くことで、`codemod-map.ts` からの import で循環参照にならずに1枚を共有できる。
 *
 * multi-segment を先に並べる（`font-weight` が `font` より先にマッチする必要がある）。
 */
export const TAILWIND_V4_NAMESPACES: readonly string[] = [
  // multi-segment（naive な「先頭セグメント直後に x-」だと割れる — #17 の本体）
  'inset-shadow',
  'text-shadow',
  'drop-shadow',
  'font-weight',
  // single-segment
  'shadow',
  'color',
  'spacing',
  'radius',
  'font',
  'text',
  'leading',
  'tracking',
  'breakpoint',
  'container',
  'ease',
  'animate',
  'blur',
  'perspective',
  'aspect',
];

/** トークン名の先頭にある v4 namespace（表に無ければ先頭セグメント群を返す — 写像表の fallback）。 */
export function tailwindNamespaceOf(token: string): string | null {
  for (const ns of TAILWIND_V4_NAMESPACES) {
    if (token.startsWith(`--${ns}-`)) return ns;
  }
  const m = /^--([a-z][a-z0-9]*(?:-[a-z0-9]+)*?)-/.exec(token);
  return m ? m[1]! : null;
}

/**
 * 拡張トークンの登録名前空間 — `--<v4 namespace>-x-<key>`（AM-3）。**表から導出する**（#49）。
 *
 * 手書きの正規表現に戻さないこと: #49 まで cat 部を `[a-z][a-z0-9]*` と独自に決めていたため
 * multi-segment namespace（`font-weight`）を弾き、**#35 が是正した生成側の出力 `--font-weight-x-medium`
 * を検査側が拒否していた**（道具が自分の生成物を拒否する）。表から導出すれば構造的に追随する。
 */
export const EXTENSION_TOKEN_PATTERN = new RegExp(
  `^--(${TAILWIND_V4_NAMESPACES.join('|')})-x-([a-z0-9]+(?:-[a-z0-9]+)*)$`,
);

/**
 * 拡張トークン名か。namespace は**表の実在名のみ**
 * （`--color-text-x-foo` は `color-text` が v4 namespace でないので false）。
 *
 * 逆に `--font-x-weight-medium` は `font` namespace の**合法な拡張トークン名**なので true —
 * codemod が今それを生成しない（#17 で `--font-weight-x-medium` へ是正した）だけであり、
 * 「旧実装が吐いた形だから拒否する」わけではない。
 */
export function isExtensionTokenName(name: string): boolean {
  return EXTENSION_TOKEN_PATTERN.test(name);
}

export function isContractTokenName(name: string): name is ContractTokenName {
  return (CONTRACT_TOKENS.names as readonly string[]).includes(name);
}

/* ------------------------------------------------------------------ */
/* 予約語・名前パターン（TK-03 — validate:themes の検査データ）           */
/* ------------------------------------------------------------------ */

/** 裸の --color-primary の新設 MUST NOT（brand ロール名は accent — R2⑥(B)） */
export const RESERVED_TOKEN_NAMES = ['--color-primary'] as const;

/** 序数サフィックス MUST NOT（強度は -muted / -faint の語彙で — R2⑥(B)） */
export const ORDINAL_SUFFIX_PATTERN = /-\d+$/;

/**
 * 契約語彙内の同義二重名 MUST NOT（R2⑥(A)）。
 * 検査対象は非 x- トークンの設計語彙のみ（versioned compat shim は対象外 — AM-7）。
 * value = 修復指示（error 文言に埋める — AM-2(ii) の型）。
 */
export const SYNONYM_BANS: readonly { pattern: RegExp; message: string }[] = [
  {
    pattern: /^--color-ok(-|$)/,
    message: "synonym ban 'ok': use 'success' (codemod v1: ok→success)",
  },
  {
    pattern: /^--color-warning(-|$)/,
    message: "synonym ban 'warning': use 'warn' (codemod v1: warning→warn)",
  },
  {
    pattern: /^--color-fg(-|$)/,
    message: "synonym ban 'fg': use 'text-*' (codemod v1: fg→text-primary)",
  },
  {
    pattern: /^--color-line(-|$)/,
    message: "synonym ban 'line': use 'border' (codemod v1: line→border)",
  },
  { pattern: /-ink$/, message: "synonym ban '-ink': use 'on-<role>' (codemod v1: *-ink→on-*)" },
] as const;

/**
 * テーマ差し替え契約から除外された名前空間（R2⑥(A) B2 / Case D）。
 * この名前空間への var() 参照 MUST NOT・テーマファイル内での宣言も契約外につき error。
 */
export const EXCLUDED_NAMESPACES = ['--breakpoint-', '--container-'] as const;

/* ------------------------------------------------------------------ */
/* WCAG AA コントラスト検査ペア表（TH-07 / 03 §9.10 — W0 確定値・配布物が正） */
/* ------------------------------------------------------------------ */

export interface ContrastPair {
  /** 前景トークン（color キー） */
  fg: ColorTokenKey;
  /** 背景トークン（color キー） */
  bg: ColorTokenKey;
  /** 最低コントラスト比 */
  min: number;
  /** 根拠区分 */
  kind: 'text' | 'focus';
}

/**
 * ペア表 v1。導出規則:
 * - `X ↔ on-X` の機械的文字列規則（R1⑥部分決定・R2⑥(B)）→ 本文 4.5:1
 * - 本文テキスト（text-primary / text-muted）× 面 → 4.5:1
 * - `-soft` 面（on-token を持たない）の前景は text-primary と確定（W0 具体化）→ 4.5:1
 * - focus ペア（focus-ring × 面）→ 3:1（WCAG 2.4.7 / 1.4.11・AM-3）
 * 較正条件（AM-6 運営則）: 参照テーマを FAIL させないことを themes/reference.css で検証済み。
 * 未収載（未確定として凍結レビュー資料に列挙）: text-faint・text-inverse・border 3:1・
 * scrim / shadow の合成前提。
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  // 本文 × 面
  { fg: 'text-primary', bg: 'surface', min: 4.5, kind: 'text' },
  { fg: 'text-primary', bg: 'surface-raised', min: 4.5, kind: 'text' },
  { fg: 'text-primary', bg: 'surface-overlay', min: 4.5, kind: 'text' },
  { fg: 'text-primary', bg: 'surface-sunken', min: 4.5, kind: 'text' },
  { fg: 'text-muted', bg: 'surface', min: 4.5, kind: 'text' },
  { fg: 'text-muted', bg: 'surface-raised', min: 4.5, kind: 'text' },
  // on-X ↔ X（機械的ペア規則）
  { fg: 'on-accent', bg: 'accent', min: 4.5, kind: 'text' },
  { fg: 'on-danger', bg: 'danger', min: 4.5, kind: 'text' },
  { fg: 'on-success', bg: 'success', min: 4.5, kind: 'text' },
  { fg: 'on-warn', bg: 'warn', min: 4.5, kind: 'text' },
  { fg: 'on-info', bg: 'info', min: 4.5, kind: 'text' },
  // -soft 面 × text-primary
  { fg: 'text-primary', bg: 'accent-soft', min: 4.5, kind: 'text' },
  { fg: 'text-primary', bg: 'danger-soft', min: 4.5, kind: 'text' },
  { fg: 'text-primary', bg: 'success-soft', min: 4.5, kind: 'text' },
  { fg: 'text-primary', bg: 'warn-soft', min: 4.5, kind: 'text' },
  { fg: 'text-primary', bg: 'info-soft', min: 4.5, kind: 'text' },
  // focus ペア（3:1 — 局所スコープでも必須・R5）
  { fg: 'focus-ring', bg: 'surface', min: 3, kind: 'focus' },
  { fg: 'focus-ring', bg: 'surface-raised', min: 3, kind: 'focus' },
] as const;
