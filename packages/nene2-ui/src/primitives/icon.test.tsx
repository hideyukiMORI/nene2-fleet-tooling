// @vitest-environment jsdom
/**
 * Icon（#312）— 配るのは絵ではなく意味づけ。
 *
 * 🔴 フリート実測（2026-08-23）: アイコンライブラリの npm 依存は**10艦とも0**、
 * インライン `<svg>` は **222個**、うち **101個が `aria-hidden` も `role="img"` も持たない**。
 * 装飾なのか意味を持つのかを宣言していないので、支援技術は推測するしかなく、
 * **画面はどちらでも完全に正しく見える**。
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon } from './Icon.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const path = <path d="M4 4h16" />;

describe('Icon', () => {
  it('names itself when it carries meaning', () => {
    const { container } = render(<Icon label="Delete">{path}</Icon>);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Delete');
    expect(svg?.getAttribute('aria-hidden')).toBeNull();
  });

  it('hides itself when it only repeats nearby text', () => {
    const { container } = render(<Icon decorative>{path}</Icon>);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(svg?.getAttribute('role')).toBeNull();
    expect(svg?.getAttribute('aria-label')).toBeNull();
  });

  it('falls back to hidden, never to a nameless image', () => {
    // 🔴 型で塞いであるが、JS からの呼び出しと古いビルドは実在する。
    // ここで role="img" を出すと**名前の無い画像**になり、支援技術は「画像」と読んで止まる。
    // 実測した101個より悪い。黙る側へ倒す。
    const { container } = render(<Icon {...({} as never)}>{path}</Icon>);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBeNull();
  });

  it('does the same for an empty label, which is what a missing translation looks like', () => {
    const { container } = render(<Icon label="">{path}</Icon>);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('svg')?.getAttribute('role')).toBeNull();
  });

  it('takes its colour from the text around it', () => {
    const { container } = render(<Icon decorative>{path}</Icon>);
    expect(container.querySelector('svg')?.getAttribute('stroke')).toBe('currentColor');
  });

  it('offers sizes, not dimensions', () => {
    const { container } = render(
      <Icon decorative size="lg">
        {path}
      </Icon>,
    );
    const cls = (container.querySelector('svg')?.getAttribute('class') ?? '').split(/\s+/);
    expect(cls).toEqual(expect.arrayContaining(['h-6', 'w-6']));
  });

  it('keeps the artwork the caller passed', () => {
    const { container } = render(<Icon decorative>{path}</Icon>);
    expect(container.querySelector('svg path')?.getAttribute('d')).toBe('M4 4h16');
  });
});
