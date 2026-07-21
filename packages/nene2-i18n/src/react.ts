/**
 * `@hideyukimori/nene2-i18n/react` — I18nProvider + useTranslation（0.3.0 W0b・スペック §3）。
 *
 * - locale は `useSyncExternalStore` で購読（会議 CS-2・vault auth-store exemplar と同型）。
 *   module store は provider インスタンスごとに 1 つ（useRef で生成）。
 * - lang 属性同期（AM-18）: provider は scope 要素（既定 'div'・`as` で差替可）に現在 locale の
 *   lang を載せる。
 * - onMissing 既定は throw（沈黙フォールバック禁止 I18N-22＝可視化）。製品は options.onMissing で
 *   key-echo を選べる（vault 実需）。options は §2 の TranslatorOptions と同一。
 * - react は peerDependencies（焼き込まない）。JSX は使わず createElement で書く
 *   （strict/NodeNext のビルド設定を増やさない）。
 */
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { ReactElement, ReactNode } from 'react';

import { createTranslator } from './catalog.js';
import type { MessageCatalog, NestedCatalog, TranslatorOptions } from './catalog.js';

export type Locale = string;
export type Catalog = MessageCatalog | NestedCatalog;

/** locale の外部ストア（useSyncExternalStore 契約）。 */
interface LocaleStore {
  getSnapshot(): Locale;
  setLocale(next: Locale): void;
  subscribe(onChange: () => void): () => void;
}

function createLocaleStore(initial: Locale): LocaleStore {
  let locale = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => locale,
    setLocale: (next) => {
      if (next === locale) return; // 同値は通知しない（無駄な再レンダ抑止）
      locale = next;
      for (const cb of listeners) cb();
    },
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
  };
}

interface I18nContextValue {
  store: LocaleStore;
  catalogs: Record<Locale, Catalog>;
  options: TranslatorOptions | undefined;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// createTranslator は flat/nested を overload しており options が実行時可変な provider 経由では
// どちらの静的シグネチャにも合致しない。runtime は options.catalogShape で正しく分岐するため、
// ここでは共通シグネチャ（キーは string）へ絞って呼ぶ。
const translatorFactory = createTranslator as (
  catalog: Catalog,
  options?: TranslatorOptions,
) => { t(key: string, params?: Record<string, string | number>): string };

export interface I18nProviderProps {
  catalogs: Record<Locale, Catalog>;
  /** 初期 locale。親が変えれば追随する（制御 prop）。 */
  locale: Locale;
  /** §2 と同一の runtime options（nested / 二重括弧 / onMissing）。 */
  options?: TranslatorOptions;
  /** lang を載せる scope 要素のタグ（既定 'div'・AM-18）。 */
  as?: string;
  children: ReactNode;
}

export function I18nProvider(props: I18nProviderProps): ReactElement {
  const { catalogs, locale, options, as = 'div', children } = props;

  const storeRef = useRef<LocaleStore | null>(null);
  if (storeRef.current === null) storeRef.current = createLocaleStore(locale);
  const store = storeRef.current;

  // 現在 locale を購読（scope 要素の lang を追随させるため provider 自身も購読する）。
  const current = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  // 制御 prop: 親が locale を変えたら store へ反映（lang も setLocale 経由で追随）。
  useEffect(() => {
    store.setLocale(locale);
  }, [store, locale]);

  const value = useMemo<I18nContextValue>(
    () => ({ store, catalogs, options }),
    [store, catalogs, options],
  );

  return createElement(
    I18nContext.Provider,
    { value },
    createElement(as, { lang: current }, children),
  );
}

export interface UseTranslationResult {
  t(key: string, params?: Record<string, string | number>): string;
  locale: Locale;
  setLocale(next: Locale): void;
}

export function useTranslation(): UseTranslationResult {
  const ctx = useContext(I18nContext);
  if (ctx === null) {
    // fail-closed: provider 外の使用は黙って動かさない（I18N-22 の趣旨＝可視化）。
    throw new Error('useTranslation は <I18nProvider> の配下でのみ使用できる');
  }
  const { store, catalogs, options } = ctx;
  const locale = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const t = useMemo(() => {
    const catalog = catalogs[locale];
    if (catalog === undefined) {
      // 未知 locale の解決は fail-closed（沈黙 fallback しない）。
      throw new Error(`unknown locale: ${locale}（catalogs に存在しない）`);
    }
    return translatorFactory(catalog, options).t;
  }, [catalogs, locale, options]);

  return { t, locale, setLocale: store.setLocale };
}
