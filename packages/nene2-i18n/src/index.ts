/**
 * @hideyukimori/nene2-i18n — W0a 骨格（型付きカタログ＋parity）。
 * plural / format / react / vault JSON 形（DotPaths）は W0b — 未実装（README 参照）。
 */
export { createTranslator } from './catalog.js';
export type { MessageCatalog, MessageKeyOf, Translator } from './catalog.js';
export { checkCatalogParity, expectCatalogParity } from './parity.js';
export type { ParityOptions, ParityViolation } from './parity.js';
