/**
 * カタログ parity 検査 — AM-17 最終形（会議R4 AM-17・R5 AM-17' 決定）。
 *
 * 1. shape 100%: 全ロケールのキー集合が権威（ja）と完全一致（欠落・余剰とも FAIL）。
 * 2. 同値率検査: **全ロケール対**（権威対限定 MUST NOT — 「en の値を de/es/fr にコピー」経路に
 *    盲目になる。全対の健全最大 8.5% 実測・n≤6 で ≤15対＝コストゼロ）。
 *    - maxIdenticalRatio 既定 20%（叩き台 — 健全カタログの実測同値率 2.6% が根拠）
 *    - minKeys 既定 50 の床: 床未満の小カタログは統計不能 — identicalAllowlist の**列挙のみ**で
 *      運用（「数でなく列挙」の再適用）
 *    - identicalAllowlist: 翻訳不能な固有表記（ブランド名・ロケール自称名等）の列挙
 *
 * **これは lazy copy の検出器であり翻訳品質の証明ではない**（R5 AM-17' 条文 —
 * 数値は検出に使い完了判定に使わない）。
 */
import type { MessageCatalog } from './catalog.js';

export interface ParityOptions {
  /** 権威ロケール（既定 'ja' — 04 I18N の権威カタログ） */
  authority?: string;
  /** 同値率の上限（既定 0.2 — R5 AM-17' 叩き台） */
  maxIdenticalRatio?: number;
  /** 同値率検査が統計的に意味を持つ最小キー数の床（既定 50） */
  minKeys?: number;
  /** 全ロケールで同値が正当なキーの列挙（identical-allowlist 台帳 — registries 管轄） */
  identicalAllowlist?: readonly string[];
}

export interface ParityViolation {
  kind: 'shape' | 'identical-ratio' | 'identical-below-floor';
  locales: [string, string];
  message: string;
  keys: string[];
}

export function checkCatalogParity(
  catalogs: Record<string, MessageCatalog>,
  options: ParityOptions = {},
): ParityViolation[] {
  const {
    authority = 'ja',
    maxIdenticalRatio = 0.2,
    minKeys = 50,
    identicalAllowlist = [],
  } = options;
  const violations: ParityViolation[] = [];
  const locales = Object.keys(catalogs);
  const authorityCatalog = catalogs[authority];
  if (!authorityCatalog) {
    return [
      {
        kind: 'shape',
        locales: [authority, authority],
        message: `権威カタログ '${authority}' が存在しない（fail-closed）`,
        keys: [],
      },
    ];
  }
  const authorityKeys = Object.keys(authorityCatalog).sort();

  // 1. shape 100%（欠落・余剰とも FAIL）
  for (const locale of locales) {
    if (locale === authority) continue;
    const catalog = catalogs[locale] ?? {};
    const keys = new Set(Object.keys(catalog));
    const missing = authorityKeys.filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !(k in authorityCatalog)).sort();
    if (missing.length > 0 || extra.length > 0) {
      violations.push({
        kind: 'shape',
        locales: [authority, locale],
        message: `shape 不一致: 欠落 ${missing.length} / 余剰 ${extra.length}（shape は 100% MUST）`,
        keys: [...missing, ...extra],
      });
    }
  }

  // 2. 同値率検査（全ロケール対 — R5 AM-17'）
  const allowset = new Set(identicalAllowlist);
  for (let i = 0; i < locales.length; i++) {
    for (let j = i + 1; j < locales.length; j++) {
      const [a, b] = [locales[i] as string, locales[j] as string];
      const ca = catalogs[a] ?? {};
      const cb = catalogs[b] ?? {};
      const shared = Object.keys(ca).filter((k) => k in cb);
      const identical = shared.filter(
        (k) => ca[k] === cb[k] && (ca[k] ?? '') !== '' && !allowset.has(k),
      );
      if (shared.length >= minKeys) {
        const ratio = identical.length / shared.length;
        if (ratio > maxIdenticalRatio) {
          violations.push({
            kind: 'identical-ratio',
            locales: [a, b],
            message:
              `同値率 ${(ratio * 100).toFixed(1)}% > ${(maxIdenticalRatio * 100).toFixed(0)}%` +
              `（lazy copy の疑い — これは検出器であり翻訳品質の証明ではない）`,
            keys: identical.slice(0, 20),
          });
        }
      } else if (identical.length > 0) {
        // 床未満: 統計不能 — allowlist の列挙のみで運用（列挙外の同値は全件 FAIL）
        violations.push({
          kind: 'identical-below-floor',
          locales: [a, b],
          message:
            `キー数 ${shared.length} < minKeys ${minKeys}（統計不能）— ` +
            `identicalAllowlist 列挙外の同値 ${identical.length} 件は全件 FAIL`,
          keys: identical,
        });
      }
    }
  }

  return violations;
}

/** テスト用アサーション形（05 §5.2 #8 の `expectCatalogParity` — 違反があれば throw）。 */
export function expectCatalogParity(
  catalogs: Record<string, MessageCatalog>,
  options: ParityOptions = {},
): void {
  const violations = checkCatalogParity(catalogs, options);
  if (violations.length > 0) {
    throw new Error(
      'catalog parity FAIL:\n' +
        violations
          .map((v) => `- [${v.locales.join('×')}] ${v.message}\n  keys: ${v.keys.join(', ')}`)
          .join('\n'),
    );
  }
}
