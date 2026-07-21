// @vitest-environment jsdom
/**
 * /react（0.3.0 W0b・スペック §3）— I18nProvider + useTranslation。
 * provider 配下で t() 解決・setLocale で再レンダ・lang 属性追随（AM-18）・provider 外は throw・
 * §2 options（nested/二重括弧/key-echo）が provider 経由でも効くこと。
 * JSX は使わず createElement で書く（ソースと同方針）。
 */
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider, useTranslation } from './react.js';
import type { Catalog, Locale } from './react.js';

const catalogs: Record<Locale, Catalog> = {
  ja: { greeting: 'こんにちは {name}' },
  en: { greeting: 'Hello {name}' },
};

function Greeting(): ReactElement {
  const { t, locale, setLocale } = useTranslation();
  return createElement(
    'div',
    null,
    createElement('span', { 'data-testid': 'msg' }, t('greeting', { name: 'ねね' })),
    createElement('span', { 'data-testid': 'loc' }, locale),
    createElement('button', { type: 'button', onClick: () => setLocale('en') }, 'switch'),
  );
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('I18nProvider + useTranslation', () => {
  it('provider 配下で t() が解決する', () => {
    render(createElement(I18nProvider, { catalogs, locale: 'ja' }, createElement(Greeting)));
    expect(screen.getByTestId('msg').textContent).toBe('こんにちは ねね');
    expect(screen.getByTestId('loc').textContent).toBe('ja');
  });

  it('setLocale で再レンダ（ja→en）', () => {
    render(createElement(I18nProvider, { catalogs, locale: 'ja' }, createElement(Greeting)));
    fireEvent.click(screen.getByText('switch'));
    expect(screen.getByTestId('loc').textContent).toBe('en');
    expect(screen.getByTestId('msg').textContent).toBe('Hello ねね');
  });

  it('lang 属性が scope 要素で locale に追随する（AM-18）', () => {
    const { container } = render(
      createElement(I18nProvider, { catalogs, locale: 'ja' }, createElement(Greeting)),
    );
    const scope = container.querySelector('[lang]');
    expect(scope?.getAttribute('lang')).toBe('ja');
    fireEvent.click(screen.getByText('switch'));
    expect(container.querySelector('[lang]')?.getAttribute('lang')).toBe('en');
  });

  it('provider 外の useTranslation は throw（fail-closed）', () => {
    // console.error（React の境界エラー出力）は抑止せず、throw を確認する。
    expect(() => render(createElement(Greeting))).toThrow(/I18nProvider/);
  });
});

describe('options が provider 経由でも効く（§2 と同一 TranslatorOptions）', () => {
  /** key と任意 params を受け、data-testid=id で解決結果を出すだけの消費側。 */
  function Probe(props: {
    id: string;
    k: string;
    params?: Record<string, string | number>;
  }): ReactElement {
    const { t } = useTranslation();
    return createElement('span', { 'data-testid': props.id }, t(props.k, props.params));
  }

  it("onMissing:'key-echo' で欠落キーを可視化（I18N-22）", () => {
    render(
      createElement(
        I18nProvider,
        { catalogs, locale: 'ja', options: { onMissing: 'key-echo' } },
        createElement(Probe, { id: 'out', k: 'audit_event.action.login' }),
      ),
    );
    // catalogs.ja に無い key ＝ key-echo でそのまま可視化
    expect(screen.getByTestId('out').textContent).toBe('audit_event.action.login');
  });

  it('nested + 二重括弧 + key-echo の同時指定（vault 実需形）', () => {
    const nested: Record<Locale, Catalog> = {
      ja: { audit_event: { action: { login: '{{user}} がログイン' } } },
    };
    const options = {
      catalogShape: 'nested',
      interpolation: 'double',
      onMissing: 'key-echo',
    } as const;
    render(
      createElement(
        I18nProvider,
        { catalogs: nested, locale: 'ja', options },
        createElement('div', null, [
          // 存在する nested key ＋ double 補間
          createElement(Probe, {
            key: 'a',
            id: 'hit',
            k: 'audit_event.action.login',
            params: { user: 'ねね' },
          }),
          // 存在しない key ＝ key-echo（可視 fallback）
          createElement(Probe, { key: 'b', id: 'miss', k: 'audit_event.action.logout' }),
        ]),
      ),
    );
    expect(screen.getByTestId('hit').textContent).toBe('ねね がログイン');
    expect(screen.getByTestId('miss').textContent).toBe('audit_event.action.logout');
  });
});
