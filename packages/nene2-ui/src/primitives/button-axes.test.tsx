// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Button } from './Button.js';

/**
 * Button の軸（#487）— **列挙ではなく導出で当てる**。
 *
 * 🔑 `docs/todo` 由来の型1「**列挙で書いた検査は、列挙に無いものを緑にする**」。
 * `success` を #422 / #457 で部品ごとに列挙して足した結果、**2回とも InlineAlert が漏れた**
 * （#486）。同じことを軸でやると、**新しい tone を足した人が1つの形を書き忘れても緑**になる。
 * ⇒ 形と色の**直積**を型から導出し、全マスを実際に描いて確かめる。
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const themePath = path.join(here, '../../themes/default.css');
const buttonSrc = readFileSync(path.join(here, 'Button.tsx'), 'utf8');
const themeSrc = readFileSync(themePath, 'utf8');

const SHAPES = ['solid', 'outline', 'bare', 'link'] as const;
const TONES = ['neutral', 'danger', 'warn', 'success'] as const;

const classesOf = (el: Element | null) => el?.getAttribute('class') ?? '';

describe('Button の軸（#487）', () => {
  it('形 × 色 の全16マスが描ける（直積を導出して全数）', () => {
    // 陽性対照: 直積そのものが空でないこと（ループが0回で緑になる事故を潰す）
    expect(SHAPES.length * TONES.length).toBe(16);

    for (const variant of SHAPES) {
      for (const tone of TONES) {
        const cls = classesOf(
          render(
            <Button variant={variant} tone={tone}>
              x
            </Button>,
          ).container.querySelector('button'),
        );
        expect(cls, `${variant}×${tone} が前景を持たない`).toMatch(/text-x-slot-button-/);
      }
    }
  });

  it('部品が参照するスロットは全部テーマに実在する（導出・字面の列挙をしない）', () => {
    const refs = new Set(buttonSrc.match(/x-slot-button-[a-z-]+/g) ?? []);
    const defined = new Set(
      [
        ...themeSrc.matchAll(
          /--(?:color|shadow|spacing|text|font|radius)-(x-slot-button-[a-z-]+)\s*:/g,
        ),
      ].map((m) => m[1]),
    );
    // 陽性対照: 走査窓が生きていること（0件同士の比較で緑にしない）
    expect(refs.size).toBeGreaterThan(10);
    expect(defined.size).toBeGreaterThan(10);

    const missing = [...refs].filter((r) => !defined.has(r)).sort();
    expect(missing, `テーマに無いスロットを参照している: ${missing.join(', ')}`).toEqual([]);
  });

  it('テーマに死にスロットが無い（定義したのに誰も読まない＝#481 の型）', () => {
    const refs = new Set(buttonSrc.match(/x-slot-button-[a-z-]+/g) ?? []);
    const defined = [
      ...themeSrc.matchAll(
        /--(?:color|shadow|spacing|text|font|radius)-(x-slot-button-[a-z-]+)\s*:/g,
      ),
    ].map((m) => m[1]);
    const unused = defined.filter((d) => !refs.has(d)).sort();
    expect(unused, `誰も読まないスロット: ${unused.join(', ')}`).toEqual([]);
  });

  it('solid は枠のクラスを出さない — 塗りの見た目を 0.19.x から動かさないため', () => {
    for (const tone of TONES) {
      const cls = classesOf(
        render(
          <Button variant="solid" tone={tone}>
            x
          </Button>,
        ).container.querySelector('button'),
      );
      expect(cls, `solid×${tone}`).not.toMatch(/border-x-slot-button-/);
      expect(cls, `solid×${tone} は透明枠で高さを揃える`).toContain('border-transparent');
    }
  });

  it('outline は tone ごとの枠スロットを読む', () => {
    for (const tone of TONES) {
      const cls = classesOf(
        render(
          <Button variant="outline" tone={tone}>
            x
          </Button>,
        ).container.querySelector('button'),
      );
      expect(cls).toContain(`border-x-slot-button-${tone}-border`);
    }
  });

  it('link は箱を持たない（padding も枠も角丸も出さない）', () => {
    const cls = classesOf(
      render(<Button variant="link">x</Button>).container.querySelector('button'),
    );
    expect(cls).toContain('border-0');
    expect(cls).toContain('rounded-none');
    expect(cls).not.toMatch(/px-x-slot-button-/);
    // 陽性対照: 箱を持つ形は padding を出す（この検査が「常に真」でないこと）
    const solid = classesOf(render(<Button>x</Button>).container.querySelector('button'));
    expect(solid).toMatch(/px-x-slot-button-/);
  });

  it('既定は solid × neutral（呼び出し側が何も書かないときの姿）', () => {
    const bare = classesOf(render(<Button>x</Button>).container.querySelector('button'));
    const spelled = classesOf(
      render(
        <Button variant="solid" tone="neutral">
          x
        </Button>,
      ).container.querySelector('button'),
    );
    expect(bare).toBe(spelled);
  });

  it('outline の地は tone に依らない1本（艦の意匠より濃くしない）', () => {
    const seen = new Set(
      TONES.map((tone) => {
        const cls = classesOf(
          render(
            <Button variant="outline" tone={tone}>
              x
            </Button>,
          ).container.querySelector('button'),
        );
        return cls.match(/bg-x-slot-button-[a-z-]+/)?.[0] ?? '';
      }),
    );
    expect([...seen]).toEqual(['bg-x-slot-button-outline-bg']);
  });
});
