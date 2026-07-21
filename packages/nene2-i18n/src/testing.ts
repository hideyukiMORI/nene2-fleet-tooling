/**
 * `@hideyukimori/nene2-i18n/testing` — テスト専用のカタログ検証ヘルパ（0.2.0 ティア1・#129/#76）。
 *
 * 規約 04 §0 API 表の正本 import 経路。批准前提(b) `check:exemplars` の payout [X] アンカー
 * （I18N-20 の locales.test.ts 等）は `import { expectCatalogParity } from
 * '@hideyukimori/nene2-i18n/testing'` を解決する必要があり、これがその subpath 実体。
 *
 * `expectCatalogParity` は `.`（ルート）からも引き続き出す（非破壊）— どちらの import も解決する。
 * `renderWithI18n`（React テストヘルパ）は 0.3.0（W0b）で追加＝I18nProvider で包む RTL ヘルパ。
 * production `/react` を RTL に密結合させないため実体は `render.ts` に置き、ここから re-export する
 * （RTL / react-dom は optional peer＝このヘルパを使うテスト環境にのみ要る）。
 */
export { expectCatalogParity } from './parity.js';
export type { ParityOptions, ParityViolation } from './parity.js';
export { renderWithI18n } from './render.js';
export type { RenderWithI18nOptions } from './render.js';
