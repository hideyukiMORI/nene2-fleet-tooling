// @vitest-environment jsdom
/**
 * renderWithI18n（0.3.0 W0b・スペック §6-③）— provider で包んで RTL render するヘルパ。
 * options（nested/二重括弧/key-echo）が helper 経由でも効くこと・lang(AM-18) が載ることを固定。
 */
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderWithI18n } from './render.js';
import { useTranslation } from './react.js';

function Msg(): ReactElement {
  const { t } = useTranslation();
  return createElement('span', { 'data-testid': 'm' }, t('greeting', { name: 'ねね' }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('renderWithI18n', () => {
  it('ui を I18nProvider で包んで render し t() が解決する', () => {
    renderWithI18n(createElement(Msg), {
      locale: 'ja',
      catalogs: { ja: { greeting: 'やあ {name}' } },
    });
    expect(screen.getByTestId('m').textContent).toBe('やあ ねね');
  });

  it('options（nested + 二重括弧）と lang(AM-18) が helper 経由でも効く', () => {
    function AuditMsg(): ReactElement {
      const { t } = useTranslation();
      return createElement('span', { 'data-testid': 'a' }, t('audit.login', { user: 'ねね' }));
    }
    const { container } = renderWithI18n(createElement(AuditMsg), {
      locale: 'ja',
      catalogs: { ja: { audit: { login: '{{user}} がログイン' } } },
      options: { catalogShape: 'nested', interpolation: 'double' },
    });
    expect(screen.getByTestId('a').textContent).toBe('ねね がログイン');
    expect(container.querySelector('[lang]')?.getAttribute('lang')).toBe('ja');
  });
});
