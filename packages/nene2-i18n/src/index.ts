/**
 * @hideyukimori/nene2-i18n — 型付きカタログ＋parity＋runtime translator options（0.3.0 W0b）。
 * runtime options: nested（dot-path・key は string に緩め・DotPaths 型は保留）/ 二重括弧補間 /
 * 欠落キー可視 fallback（onMissing）。既定は 0.2.0 と byte 同一。
 * plural / format（Intl）/ react（I18nProvider）は別レーン — 未実装（README 参照）。
 */
export { createTranslator } from './catalog.js';
export type {
  LooseTranslator,
  MessageCatalog,
  MessageKeyOf,
  NestedCatalog,
  Translator,
  TranslatorOptions,
} from './catalog.js';
export { checkCatalogParity, expectCatalogParity } from './parity.js';
export type { ParityOptions, ParityViolation } from './parity.js';
