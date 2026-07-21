/**
 * `renderWithI18n` — RTL render を I18nProvider で包むテストヘルパ（0.3.0 W0b・スペック §3/§6-③）。
 *
 * `@testing-library/react`（RTL）に依存するため **production `/react`（react.ts）とは別モジュール**に置き、
 * `/testing` から re-export する（production `/react` を RTL に密結合させない）。RTL / react-dom は
 * optional peerDependency（このヘルパを使うテスト環境にのみ要る）。
 * JSX は使わず createElement で書く（ソースと同方針）。
 */
import { createElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

import { I18nProvider } from './react.js';
import type { Catalog, I18nProviderProps, Locale } from './react.js';
import type { TranslatorOptions } from './catalog.js';

export interface RenderWithI18nOptions {
  locale: Locale;
  catalogs: Record<Locale, Catalog>;
  /** §2 と同一の runtime options（nested / 二重括弧 / onMissing）。 */
  options?: TranslatorOptions;
  /** lang を載せる scope 要素のタグ（既定 'div'・AM-18）。 */
  as?: string;
}

/** ui を I18nProvider で包んで RTL render する。RTL の RenderResult をそのまま返す。 */
export function renderWithI18n(ui: ReactElement, opts: RenderWithI18nOptions): RenderResult {
  const { locale, catalogs, options, as } = opts;
  const wrapper = ({ children }: { children: ReactNode }): ReactElement => {
    // exactOptionalPropertyTypes: undefined を明示代入しない（省略可 prop は defined 時のみ載せる）。
    const providerProps: I18nProviderProps = { catalogs, locale, children };
    if (options !== undefined) providerProps.options = options;
    if (as !== undefined) providerProps.as = as;
    return createElement(I18nProvider, providerProps);
  };
  return render(ui, { wrapper });
}
