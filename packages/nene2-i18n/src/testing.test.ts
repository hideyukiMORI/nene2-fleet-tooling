/**
 * ./testing subpath バレル（#129/#76）— 規約 04 §0 API 表の import 経路
 * `@hideyukimori/nene2-i18n/testing` の実体が expectCatalogParity を解決すること、
 * および `.` と同一実装であること（再export であってコピーでない）を固定する。
 */
import { describe, expect, it } from 'vitest';

import { expectCatalogParity as fromRoot } from './index.js';
import { expectCatalogParity as fromTesting } from './testing.js';

/** n キーの健全カタログ対（parity.test.ts と同型）。 */
function catalogs(n: number): { ja: Record<string, string>; en: Record<string, string> } {
  const ja: Record<string, string> = {};
  const en: Record<string, string> = {};
  for (let i = 0; i < n; i++) {
    ja[`common.key${i}`] = `日本語${i}`;
    en[`common.key${i}`] = `English ${i}`;
  }
  return { ja, en };
}

describe('./testing subpath — expectCatalogParity 再export（#129/#76）', () => {
  it('expectCatalogParity を export する（規約 I18N-20 の import 経路が解決）', () => {
    expect(typeof fromTesting).toBe('function');
  });

  it('`.` と同一関数（再export であってコピーでない）', () => {
    expect(fromTesting).toBe(fromRoot);
  });

  it('キー集合一致は green・欠落は throw（parity の挙動が subpath 経由でも同じ）', () => {
    expect(() => fromTesting(catalogs(10))).not.toThrow();
    const { ja, en } = catalogs(10);
    delete en['common.key0'];
    expect(() => fromTesting({ ja, en })).toThrow(/parity FAIL/);
  });
});
