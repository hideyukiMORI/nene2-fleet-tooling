/**
 * parity（AM-17 最終形）— green＋故意 fail の両方向。
 */
import { describe, expect, it } from 'vitest';

import { createTranslator } from './catalog.js';
import { checkCatalogParity, expectCatalogParity } from './parity.js';

/** n キーの健全カタログ対を生成（値はロケールごとに異なる） */
function catalogs(n: number): { ja: Record<string, string>; en: Record<string, string> } {
  const ja: Record<string, string> = {};
  const en: Record<string, string> = {};
  for (let i = 0; i < n; i++) {
    ja[`common.key${i}`] = `日本語${i}`;
    en[`common.key${i}`] = `English ${i}`;
  }
  return { ja, en };
}

describe('shape 100%', () => {
  it('キー集合完全一致は green', () => {
    expect(() => expectCatalogParity(catalogs(60))).not.toThrow();
  });

  it('故意 fail: 欠落キーも余剰キーも FAIL', () => {
    const { ja, en } = catalogs(60);
    delete en['common.key0']; // 欠落
    expect(checkCatalogParity({ ja, en }).some((v) => v.kind === 'shape')).toBe(true);
    const { ja: ja2, en: en2 } = catalogs(60);
    en2['common.extra'] = 'x'; // 余剰
    expect(checkCatalogParity({ ja: ja2, en: en2 }).some((v) => v.kind === 'shape')).toBe(true);
  });

  it('fail-closed: 権威カタログ不在は FAIL', () => {
    expect(checkCatalogParity({ en: { a: 'x' } })).toHaveLength(1);
  });
});

describe('同値率検査（全ロケール対・maxIdenticalRatio 20%・minKeys 50 床）', () => {
  it('故意 fail: ja の値を en に丸コピー（次世代スタブ）は FAIL', () => {
    const { ja } = catalogs(60);
    const violations = checkCatalogParity({ ja, en: { ...ja } });
    expect(violations.some((v) => v.kind === 'identical-ratio')).toBe(true);
    expect(violations[0]?.message).toContain('検出器であり翻訳品質の証明ではない');
  });

  it('故意 fail: 権威対は健全でも en→de コピーは全ロケール対で FAIL（AM-17 全対化の根拠）', () => {
    const { ja, en } = catalogs(60);
    const violations = checkCatalogParity({ ja, en, de: { ...en } });
    const pairs = violations.map((v) => v.locales.join('×'));
    expect(pairs).toContain('en×de');
    expect(pairs).not.toContain('ja×en');
  });

  it('同値率 ≤20% は green・identicalAllowlist 収載分は同値に数えない', () => {
    const { ja, en } = catalogs(60);
    // 同値 6/60 = 10% ≤ 20%
    for (let i = 0; i < 6; i++) en[`common.key${i}`] = ja[`common.key${i}`] as string;
    expect(() => expectCatalogParity({ ja, en })).not.toThrow();
    // 同値 18/60 = 30% > 20% → FAIL、ただし列挙で免除すれば green
    const en2 = { ...en };
    const allow: string[] = [];
    for (let i = 0; i < 18; i++) {
      en2[`common.key${i}`] = ja[`common.key${i}`] as string;
      allow.push(`common.key${i}`);
    }
    expect(() => expectCatalogParity({ ja, en: en2 })).toThrow(/同値率/);
    expect(() => expectCatalogParity({ ja, en: en2 }, { identicalAllowlist: allow })).not.toThrow();
  });

  it('minKeys 床未満: 統計不能 — 列挙外の同値は全件 FAIL・列挙済みなら green', () => {
    const ja = { 'common.locale.ja': '日本語', 'common.brand': 'NeNe', 'common.save': '保存' };
    const en = { 'common.locale.ja': '日本語', 'common.brand': 'NeNe', 'common.save': 'Save' };
    const violations = checkCatalogParity({ ja, en });
    expect(violations.some((v) => v.kind === 'identical-below-floor')).toBe(true);
    expect(() =>
      expectCatalogParity({ ja, en }, { identicalAllowlist: ['common.locale.ja', 'common.brand'] }),
    ).not.toThrow();
  });
});

describe('型付きカタログ（骨格）', () => {
  it('t() は補間つきで解決・未知キーの実行時到達は throw（fail-closed）', () => {
    const catalog = { 'common.total': '合計 {count} 件' } as const;
    const { t } = createTranslator(catalog);
    expect(t('common.total', { count: 3 })).toBe('合計 3 件');
    // @ts-expect-error 未知キーはコンパイル時に落ちる（型検査そのものがテスト）
    expect(() => t('common.unknown')).toThrow(/unknown MessageKey/);
  });
});
