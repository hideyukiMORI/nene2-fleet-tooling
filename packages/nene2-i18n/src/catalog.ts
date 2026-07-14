/**
 * 型付きカタログ（規約 04 §1 の骨格 — W0a）。
 *
 * - ja が権威カタログ（キー集合の正本）。MessageKey はカタログから型導出する。
 * - ランタイムは最小（ICU パーサ禁止 — 会議R1⑦。補間は {name} 置換のみ）。
 * - plural / format（Intl ラッパ）/ react（I18nProvider・useTranslation）/ vault JSON 形
 *   （DotPaths）は W0b — 本骨格には**存在しない**（未実装を明記）。
 */

/** メッセージカタログ（flat key → 文字列値）。キーの綴り規約は 04 が正本。 */
export type MessageCatalog = Record<string, string>;

/** 権威カタログからの MessageKey 型導出（`satisfies` と併用する）。 */
export type MessageKeyOf<T extends MessageCatalog> = keyof T & string;

export interface Translator<T extends MessageCatalog> {
  /** 型付き解決。未知キーはコンパイル時に落ちる（実行時到達は Error — fail-closed）。 */
  t(key: MessageKeyOf<T>, params?: Record<string, string | number>): string;
}

/**
 * カタログ束からの translator 生成（骨格）。
 * ロケール解決・fallback 連鎖・scope 同期（AM-18）は W0b の I18nProvider 管轄。
 */
export function createTranslator<T extends MessageCatalog>(catalog: T): Translator<T> {
  return {
    t(key, params) {
      const value = catalog[key];
      if (value === undefined) {
        // fail-closed: 型を欺いて到達した未知キーは黙って key を返さない
        throw new Error(`unknown MessageKey: ${String(key)}`);
      }
      if (!params) return value;
      return value.replaceAll(/\{(\w+)\}/g, (whole, name: string) => {
        const p = params[name];
        return p === undefined ? whole : String(p);
      });
    },
  };
}
