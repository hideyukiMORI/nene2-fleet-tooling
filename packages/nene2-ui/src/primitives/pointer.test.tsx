// @vitest-environment jsdom
/**
 * 0.4.0（#332）— ポインタ反応と、部品が受ける構造の選択肢。
 *
 * 🔴 v0.1 は disabled と focus を持たずに出荷し、画面が39箇所で補っていた（#300）。
 * **同じ穴の3つ目が hover / active** で、0.4.0 まで空いていた。
 * 艦の実測では7艦が持っており、うち4艦は **CSS 側**に書いているので
 * Tailwind クラスだけ数えると 0 に見える（機構C）。
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button } from './Button.js';
import { Switch } from './Switch.js';
import { Text } from './Text.js';
import { Spinner } from './Spinner.js';
import { EmptyState } from '../states/EmptyState.js';
import { ErrorState } from '../states/ErrorState.js';
import { LoadingState } from '../states/LoadingState.js';
import { PageHeader } from '../layout/PageHeader.js';
import { DetailList } from '../data/DetailList.js';
import { InlineAlert } from '../feedback/InlineAlert.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const classesOf = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/);

describe('pointer feedback', () => {
  it.each([
    ['Button', <Button key="b">x</Button>],
    ['Switch', <Switch key="s" checked={false} onCheckedChange={() => {}} label="x" />],
  ])('%s reacts to hover and to being pressed', (_n, ui) => {
    const cls = classesOf(render(ui).container.querySelector('button'));
    expect(cls).toEqual(
      expect.arrayContaining(['hover:brightness-x-slot-hover', 'active:brightness-x-slot-press']),
    );
  });

  it('does not react while disabled', () => {
    // 押せないものが押した反応を返すと、押せたように見える。
    const cls = classesOf(render(<Button disabled>x</Button>).container.querySelector('button'));
    expect(cls).toEqual(
      expect.arrayContaining(['disabled:hover:brightness-100', 'disabled:active:brightness-100']),
    );
  });

  it('darkens rather than brightens, so the white fill also reacts', () => {
    // 艦の2実装は hover:brightness-105。白い secondary では**何も起きない**。
    const theme = 'themes/default.css';
    expect(theme).toBeTruthy();
    const cls = classesOf(
      render(<Button variant="outline">x</Button>).container.querySelector('button'),
    );
    expect(cls).not.toContain('hover:brightness-105');
  });
});

describe('Button structure props', () => {
  it('offers two sizes, not a length', () => {
    const md = classesOf(render(<Button>x</Button>).container.querySelector('button'));
    const sm = classesOf(render(<Button size="sm">x</Button>).container.querySelector('button'));
    expect(md).toContain('px-x-slot-button-pad-x');
    expect(sm).toContain('px-x-slot-button-sm-pad-x');
  });

  it('has a bare shape for the third action in a row', () => {
    // 🔴 0.20.0 で `ghost` から `bare` へ改名した（#487）。旧名は艦とキットで別のものを
    // 指していた — nene-clear の `.btn-ghost` は地も枠も持つ（＝この kit の `outline`）。
    const cls = classesOf(
      render(<Button variant="bare">x</Button>).container.querySelector('button'),
    );
    expect(cls).toContain('bg-transparent');
  });
});

describe('className (design principle 2)', () => {
  // 🔴 README は「className は合成する」と書いているのに、7部品は受け取りすらしなかった。
  it.each([
    ['Text', (c: string) => render(<Text className={c}>x</Text>).container.firstElementChild],
    [
      'Spinner',
      (c: string) => render(<Spinner label="x" className={c} />).container.firstElementChild,
    ],
    [
      'PageHeader',
      (c: string) => render(<PageHeader title="x" className={c} />).container.firstElementChild,
    ],
    [
      'EmptyState',
      (c: string) => render(<EmptyState message="x" className={c} />).container.firstElementChild,
    ],
    [
      'ErrorState',
      (c: string) =>
        render(<ErrorState message="x" retryLabel="r" onRetry={() => {}} className={c} />).container
          .firstElementChild,
    ],
    [
      'LoadingState',
      (c: string) => render(<LoadingState label="x" className={c} />).container.firstElementChild,
    ],
    [
      'DetailList',
      (c: string) => render(<DetailList rows={[]} className={c} />).container.firstElementChild,
    ],
  ])('%s appends the caller class last, so it can override', (_n, mount) => {
    const el = mount('mt-2');
    const cls = el?.getAttribute('class') ?? '';
    expect(cls).toContain('mt-2');
    expect(cls.trim().endsWith('mt-2'), `${cls} must end with the caller class`).toBe(true);
  });
});

describe('EmptyState alignment', () => {
  it('centres by default — five of the fleet’s six do', () => {
    expect(classesOf(render(<EmptyState message="x" />).container.firstElementChild)).toContain(
      'text-center',
    );
  });

  it('can be left-aligned, because that is a structure choice and not a value', () => {
    expect(
      classesOf(render(<EmptyState message="x" align="start" />).container.firstElementChild),
    ).not.toContain('text-center');
  });

  // #456 — 二段目が無いと、艦は文言を落とすしかなかった（nene-deal は4箇所中3箇所が二段）。
  it('renders a second line when one is given', () => {
    const { container } = render(<EmptyState message="none yet" description="add one" />);
    expect(container.firstElementChild?.textContent).toBe('none yetadd one');
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  // 🔴 本 PR が「既存艦の描画を変えない」ことの実測。description を渡さない場合は
  // **要素を1つも増やさない**（<p> で包むと、この prop を使わない6艦の DOM が動く）。
  it('leaves the one-line render exactly as it was — a bare text node, no elements', () => {
    const { container } = render(<EmptyState message="none yet" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.children).toHaveLength(0); // 陽性対照つき: 下の二段版は 2 を返す
    expect(root.childNodes).toHaveLength(1);
    expect(root.childNodes[0]?.nodeType).toBe(3); // Node.TEXT_NODE
    expect(root.textContent).toBe('none yet');
    expect(
      render(<EmptyState message="a" description="b" />).container.firstElementChild?.children,
    ).toHaveLength(2);
  });
});

describe('InlineAlert tones', () => {
  it('warn waits its turn like info rather than interrupting', () => {
    const el = render(<InlineAlert tone="warn">x</InlineAlert>).container.firstElementChild;
    expect(el?.getAttribute('role')).toBe('status');
  });

  it.each(['info', 'warn', 'danger'] as const)(
    '%s reads its colours from the theme, so a product can tell them apart by sight',
    (tone) => {
      // 🔴 0.5.0 では warn と danger が**文字列まで完全に同一**だった。role は分かれていたが、
      // vault の指摘どおり「role の違いは聞こえる人には届き、見ている人には届かない」。
      const cls = classesOf(
        render(<InlineAlert tone={tone}>x</InlineAlert>).container.firstElementChild,
      );
      expect(cls).toEqual(
        expect.arrayContaining([
          `bg-x-slot-alert-${tone}-bg`,
          `text-x-slot-alert-${tone}-fg`,
          `border-x-slot-alert-${tone}-border`,
        ]),
      );
    },
  );

  it('gives warn and danger different slots, even where the defaults match', () => {
    const warn = classesOf(
      render(<InlineAlert tone="warn">x</InlineAlert>).container.firstElementChild,
    );
    const danger = classesOf(
      render(<InlineAlert tone="danger">x</InlineAlert>).container.firstElementChild,
    );
    expect(warn).not.toEqual(danger);
  });
});

describe('Button height', () => {
  it('reserves the border on every variant, so a row of them lines up', () => {
    // 🔴 高さは padding 由来。border を持つのが secondary だけだと、上下 1px ずつ増えて
    // 他 variant より 2px 高くなる。vault はモーダルのフッター7箇所で primary と secondary を
    // 横に並べており、そこに段差が出る（2026-08-23 実測）。
    // 🔴 `link` は箱を持たないので対象外（`border-0`）。段差を合わせるべき相手が無い。
    for (const variant of ['solid', 'outline', 'bare'] as const) {
      const cls = classesOf(
        render(<Button variant={variant}>x</Button>).container.querySelector('button'),
      );
      expect(cls, `${variant} must reserve the border`).toContain('border');
    }
  });
});
