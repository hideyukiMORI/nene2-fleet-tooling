/**
 * 型付きカタログ（規約 04 §1 — W0a 骨格＋0.3.0 W0b runtime options）。
 *
 * - ja が権威カタログ（キー集合の正本）。MessageKey はカタログから型導出する。
 * - ランタイムは最小（ICU パーサ禁止 — 会議R1⑦）。コア `t()` は分岐を持たず、
 *   3 つの strategy（lookup / interpolate / onMissing）を**注入された関数**として呼ぶ
 *   （「100行以内」思想＝コアは薄い・挙動は options で外から差す・スペック §2）。
 * - 既定引数（options 省略）は 0.2.0 と **byte 同一挙動**（後方互換最優先）。
 * - plural / format（Intl ラッパ）/ react（I18nProvider・useTranslation）は別レーン。
 */

/** メッセージカタログ（flat key → 文字列値）。キーの綴り規約は 04 が正本。 */
export type MessageCatalog = Record<string, string>;

/** nested カタログ（`common.buttons.close` を入れ子オブジェクトで持つ・dot-path 探索用）。 */
export type NestedCatalog = { [key: string]: string | NestedCatalog };

/** 権威カタログからの MessageKey 型導出（`satisfies` と併用する）。 */
export type MessageKeyOf<T extends MessageCatalog> = keyof T & string;

/**
 * runtime translator の挙動注入（スペック §2）。既定は現行挙動＝破壊なし。
 */
export interface TranslatorOptions {
  /**
   * 欠落キー戦略（既定 'throw'＝現行・fail-closed）。
   * - 'key-echo': key をそのまま返す（可視 fallback・vault の監査動的キー等・I18N-22 の趣旨＝可視化）。
   * - 関数: 製品固有整形（任意）。
   */
  onMissing?: 'throw' | 'key-echo' | ((key: string) => string);
  /** 補間デリミタ（既定 'single'＝`{name}`・現行）。'double'＝`{{name}}`（vault 実需）。 */
  interpolation?: 'single' | 'double';
  /** カタログ形（既定 'flat'＝現行）。'nested' で dot-path lookup を有効化。 */
  catalogShape?: 'flat' | 'nested';
}

/** 型付き translator（flat・既定）。未知キーはコンパイル時に落ちる。 */
export interface Translator<T extends MessageCatalog> {
  /** 型付き解決。実行時到達の未知キーは onMissing 戦略（既定 throw＝fail-closed）。 */
  t(key: MessageKeyOf<T>, params?: Record<string, string | number>): string;
}

/**
 * 緩い translator（nested・key は string）。
 * DotPaths 型導出は将来課題として保留し、over-engineer を避けて key を string に緩めている
 * （hub 裁定・#137）。runtime の dot-path 探索は正しく動く。
 */
export interface LooseTranslator {
  t(key: string, params?: Record<string, string | number>): string;
}

/** lookup strategy を解決（flat＝完全一致／nested＝dot-path 探索）。 */
function resolveLookup(
  shape: 'flat' | 'nested',
): (catalog: MessageCatalog | NestedCatalog, key: string) => string | undefined {
  if (shape === 'nested') {
    return (catalog, key) => {
      let node: string | NestedCatalog | undefined = catalog;
      for (const segment of key.split('.')) {
        if (node === undefined || typeof node === 'string') return undefined;
        node = node[segment];
      }
      return typeof node === 'string' ? node : undefined;
    };
  }
  // flat: キー自体がドット付き文字列（`common.total`）＝完全一致で引く（探索しない）。
  return (catalog, key) => {
    const value = (catalog as MessageCatalog)[key];
    return typeof value === 'string' ? value : undefined;
  };
}

/** interpolate strategy を解決（single＝`{name}`／double＝`{{name}}`）。 */
function resolveInterpolate(
  mode: 'single' | 'double',
): (value: string, params?: Record<string, string | number>) => string {
  const pattern = mode === 'double' ? /\{\{(\w+)\}\}/g : /\{(\w+)\}/g;
  return (value, params) => {
    if (!params) return value;
    return value.replaceAll(pattern, (whole, name: string) => {
      const p = params[name];
      return p === undefined ? whole : String(p);
    });
  };
}

/** onMissing strategy を解決（throw＝fail-closed／key-echo＝可視 fallback／関数＝任意）。 */
function resolveOnMissing(strategy: TranslatorOptions['onMissing']): (key: string) => string {
  if (strategy === 'key-echo') return (key) => key;
  if (typeof strategy === 'function') return strategy;
  // 'throw'（既定）: 型を欺いて到達した未知キーは黙って key を返さない。
  return (key) => {
    throw new Error(`unknown MessageKey: ${key}`);
  };
}

/**
 * カタログ束からの translator 生成。
 *
 * options 省略時は 0.2.0 と byte 同一（flat / single 補間 / throw）。
 * catalogShape:'nested' 指定時のみ key 型が string に緩む（上記 LooseTranslator）。
 */
export function createTranslator<T extends MessageCatalog>(
  catalog: T,
  options?: TranslatorOptions & { catalogShape?: 'flat' },
): Translator<T>;
export function createTranslator(
  catalog: NestedCatalog,
  options: TranslatorOptions & { catalogShape: 'nested' },
): LooseTranslator;
export function createTranslator(
  catalog: MessageCatalog | NestedCatalog,
  options: TranslatorOptions = {},
): LooseTranslator {
  // strategy を生成時に一度だけ解決 — コア t() は分岐を持たず注入関数を呼ぶだけ。
  const lookup = resolveLookup(options.catalogShape ?? 'flat');
  const interpolate = resolveInterpolate(options.interpolation ?? 'single');
  const onMissing = resolveOnMissing(options.onMissing);
  return {
    t(key, params) {
      const value = lookup(catalog, key);
      if (value === undefined) return onMissing(key);
      return interpolate(value, params);
    },
  };
}
