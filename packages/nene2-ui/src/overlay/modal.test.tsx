// @vitest-environment jsdom
import { render, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal.js';

/**
 * #392 — Modal の4点（可視ヘッダ / size / ボトムシート / スクロール）。
 *
 * 🔴 この検査の主眼は「**既定が従来の描画と同じ**」であること。4つとも任意 prop で、
 * 何も渡さない呼び出し側は 0.15.0 までと1文字も変わらない。`#380` で
 * `--text-x-slot-button-sm-size` を「既定は無害」として入れ、**片側だけ上書きした艦で反転した**
 * のと同じ罠を避けるため、**既定の側をテストで固定する。**
 */

afterEach(() => {
  document.body.innerHTML = '';
});

const dialogOf = (c: HTMLElement) => c.querySelector('dialog');
const classesOf = (el: Element | null) => el?.getAttribute('class') ?? '';

describe('Modal — 既定は 0.15.0 までと同じ（#392）', () => {
  it('ヘッダを描かず、title は aria-label のまま', () => {
    const { container } = render(
      <Modal open title="Settings" onClose={() => {}}>
        body
      </Modal>,
    );
    const el = dialogOf(container);
    expect(el?.getAttribute('aria-label')).toBe('Settings');
    expect(el?.getAttribute('aria-labelledby')).toBeNull();
    expect(container.querySelector('header')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  it('幅・シート・スクロールのクラスを1つも付けない', () => {
    const { container } = render(
      <Modal open title="t" onClose={() => {}}>
        b
      </Modal>,
    );
    const cls = classesOf(dialogOf(container));
    expect(cls).not.toContain('max-w-x-slot-modal');
    expect(cls).not.toContain('max-sm:');
    expect(cls).not.toContain('flex-col');
  });

  it('子をそのまま置く（スクロール用の入れ物を挟まない）', () => {
    const { container } = render(
      <Modal open title="t" onClose={() => {}}>
        <p data-testid="body">b</p>
      </Modal>,
    );
    // dialog の直下が子である＝間に div が無い
    expect(dialogOf(container)?.firstElementChild?.tagName).toBe('P');
  });
});

describe('Modal — 位置は UA に借りない（#417）', () => {
  // vault の本番で dialog が (0,0) に張り付いた。UA の `dialog { margin: auto }` を Tailwind の
  // preflight（`* { margin: 0 }`）が消すため。jsdom は showModal を実装しないので座標は測れない
  // ——ここで固定できるのは「キットが margin を自分で言っているか」だけ。
  it('dialog は m-auto を自分で持つ（preflight が UA の margin:auto を消しても中央に残る）', () => {
    const { container } = render(
      <Modal open title="t" onClose={() => {}}>
        b
      </Modal>,
    );
    expect(classesOf(dialogOf(container)).split(/\s+/)).toContain('m-auto');
  });

  it('sheetOnMobile でも m-auto は残り、下端寄せは max-sm: 側だけが上書きする', () => {
    const { container } = render(
      <Modal open title="t" sheetOnMobile onClose={() => {}}>
        b
      </Modal>,
    );
    const cls = classesOf(dialogOf(container)).split(/\s+/);
    expect(cls).toContain('m-auto');
    expect(cls).toContain('max-sm:mb-0');
    expect(cls).toContain('max-sm:mt-auto');
    // 🔴 広い画面の margin を消す素のクラス（mb-0 / mt-0 / m-0）を持たない
    expect(cls.filter((c) => /^m[tbxy]?-0$/.test(c))).toEqual([]);
  });
});

describe('Modal — 可視ヘッダ（#392①）', () => {
  it('題を見出しとして描き、dialog はその見出しで名前を得る', () => {
    const { container } = render(
      <Modal open header closeLabel="閉じる" title="設定" onClose={() => {}}>
        b
      </Modal>,
    );
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('設定');
    const el = dialogOf(container);
    // 🔴 画面に見出しが在るときは aria-label で二重に名前を付けない
    expect(el?.getAttribute('aria-labelledby')).toBe(h2?.getAttribute('id'));
    expect(el?.getAttribute('aria-label')).toBeNull();
  });

  it('閉じる制御は呼び出し側の訳語で名前を持ち、押すと onClose を呼ぶ', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open header closeLabel="閉じる" title="t" onClose={onClose}>
        b
      </Modal>,
    );
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('aria-label')).toBe('閉じる');
    // 🔴 記号は支援技術から隠す — 読み上げるのは closeLabel のほう
    expect(btn?.querySelector('[aria-hidden="true"]')).toBeTruthy();
    fireEvent.click(btn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('閉じる制御は button 型で、フォームを送信しない', () => {
    const { container } = render(
      <Modal open header closeLabel="x" title="t" onClose={() => {}}>
        b
      </Modal>,
    );
    expect(container.querySelector('button')?.getAttribute('type')).toBe('button');
  });
});

describe('Modal — size / sheet / scrollable（#392②③④）', () => {
  it.each([
    ['sm', 'max-w-x-slot-modal-sm'],
    ['md', 'max-w-x-slot-modal-md'],
    ['lg', 'max-w-x-slot-modal-lg'],
  ] as const)('size=%s は %s を付ける', (size, cls) => {
    const { container } = render(
      <Modal open title="t" size={size} onClose={() => {}}>
        b
      </Modal>,
    );
    expect(classesOf(dialogOf(container))).toContain(cls);
  });

  it('sheetOnMobile は狭い画面だけに効く（接頭辞が max-sm: で揃っている）', () => {
    const { container } = render(
      <Modal open title="t" sheetOnMobile onClose={() => {}}>
        b
      </Modal>,
    );
    const sheet = classesOf(dialogOf(container))
      .split(/\s+/)
      .filter((c) => c.includes('mt-auto') || c.includes('rounded-b-none') || c.includes('w-full'));
    expect(sheet.length).toBeGreaterThan(0);
    // 🔴 1つでも接頭辞を落とすと、デスクトップの描画が変わる
    for (const c of sheet) expect(c.startsWith('max-sm:')).toBe(true);
  });

  it('scrollable は本文を入れ物で包み、dialog を縦の flex にする', () => {
    const { container } = render(
      <Modal open title="t" scrollable onClose={() => {}}>
        <p>b</p>
      </Modal>,
    );
    const el = dialogOf(container);
    expect(classesOf(el)).toContain('flex-col');
    const wrapper = el?.firstElementChild;
    expect(wrapper?.tagName).toBe('DIV');
    expect(classesOf(wrapper ?? null)).toContain('overflow-y-auto');
    // min-h-0 が無いと flex の子は縮まず、スクロールが起きない
    expect(classesOf(wrapper ?? null)).toContain('min-h-0');
  });

  it('陽性対照: 既定の検査は、付いていれば実際に気づく', () => {
    const { container } = render(
      <Modal open title="t" size="md" onClose={() => {}}>
        b
      </Modal>,
    );
    // 「既定はクラスを付けない」検査（上）が空振りでないことを、逆の入力で示す
    expect(classesOf(dialogOf(container))).toContain('max-w-x-slot-modal');
  });
});
