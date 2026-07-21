/**
 * `@hideyukimori/nene2-i18n/testing` — テスト専用のカタログ検証ヘルパ（0.2.0 ティア1・#129/#76）。
 *
 * 規約 04 §0 API 表の正本 import 経路。批准前提(b) `check:exemplars` の payout [X] アンカー
 * （I18N-20 の locales.test.ts 等）は `import { expectCatalogParity } from
 * '@hideyukimori/nene2-i18n/testing'` を解決する必要があり、これがその subpath 実体。
 *
 * `expectCatalogParity` は `.`（ルート）からも引き続き出す（非破壊）— どちらの import も解決する。
 * `renderWithI18n`（React テストヘルパ）は `/react`（I18nProvider）依存＝**0.2.0 では未提供**。
 * react subpath 設計後の 0.3.0（W0b）で足す（「無いものを配らない」— I18N-22 の沈黙 fallback を
 * 再生産しないため react は設計してから）。
 */
export { expectCatalogParity } from './parity.js';
export type { ParityOptions, ParityViolation } from './parity.js';
