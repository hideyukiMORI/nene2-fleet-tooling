// @vitest-environment jsdom
/**
 * 状態表現（#300）— Button / Input / Select が disabled と focus-visible を持つこと。
 *
 * 🔴 これは見た目のテストではなく**退行を止めるテスト**。v0.1 はこの3部品を
 * disabled も focus も無いまま出荷しており、艦の画面が 39箇所で自前に補っていた。
 * 補いを lint で禁じる（順序③）前にここが埋まっていないと、
 * **押せないことが見えないボタン**が本番に出る。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Select } from './Select.js';
import { Textarea } from './Textarea.js';
import { Checkbox } from './Checkbox.js';
import { Radio } from './Radio.js';
import { Switch } from './Switch.js';
import { Icon } from './Icon.js';
import { Badge } from '../feedback/Badge.js';
import { FormField } from '../forms/FormField.js';
import { DataTable } from '../data/DataTable.js';
import { Pagination } from '../data/Pagination.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const classesOf = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/);

const CONTROLS = [
  ['Button', () => render(<Button>x</Button>).container.firstElementChild],
  ['Input', () => render(<Input />).container.firstElementChild],
  [
    'Select',
    () =>
      render(
        <Select>
          <option>a</option>
        </Select>,
      ).container.firstElementChild,
  ],
] as const;

describe.each(CONTROLS)('%s', (_name, mount) => {
  it('shows a focus indicator to keyboard users', () => {
    expect(classesOf(mount())).toEqual(
      expect.arrayContaining([
        'focus-visible:outline-2',
        'focus-visible:outline-offset-2',
        'focus-visible:outline-x-slot-focus-ring',
      ]),
    );
  });

  it('does not draw its focus ring in a button fill colour', () => {
    // 🔴 accent リングは primary ボタンと**同色**（1.00:1・テーマの oklch から計算）。
    // offset があるので実際に隣接するのは地色だが、offset が消えた瞬間に見えなくなる。
    for (const cls of classesOf(mount())) {
      expect(cls).not.toBe('focus-visible:outline-accent');
      expect(cls).not.toBe('focus-visible:outline-danger');
    }
  });

  it('keeps the offset — it is what puts page colour between fill and ring', () => {
    expect(classesOf(mount())).toContain('focus-visible:outline-offset-2');
  });

  it('never uses bare :focus, which also fires on a mouse click', () => {
    // 艦が focus: と focus-visible: を両方書いていたのは、これを嫌ったから。
    for (const cls of classesOf(mount())) {
      expect(cls.startsWith('focus:'), `${cls} should be focus-visible:`).toBe(false);
    }
  });

  it('looks disabled when it is disabled, and says so to the cursor', () => {
    expect(classesOf(mount())).toEqual(
      expect.arrayContaining(['disabled:opacity-x-disabled', 'disabled:cursor-not-allowed']),
    );
  });

  it('takes the disabled opacity from the theme, not from a literal', () => {
    // 意匠値が現れてよいのは themes/default.css だけ、という自艦の規律。
    for (const cls of classesOf(mount())) {
      expect(cls).not.toMatch(/^disabled:opacity-\d/);
    }
  });

  it('still lets the caller disable it through a native prop', () => {
    expect(mount()).toBeTruthy();
  });
});

describe('Input', () => {
  it('distinguishes placeholder text from real text', () => {
    const { container } = render(<Input placeholder="name" />);
    expect(classesOf(container.firstElementChild)).toContain(
      'placeholder:text-x-slot-control-placeholder',
    );
  });

  it('passes disabled through to the element, so the styling has something to hook onto', () => {
    const { container } = render(<Input disabled />);
    expect((container.firstElementChild as HTMLInputElement).disabled).toBe(true);
  });
});

describe('Button', () => {
  it('is actually disabled, not merely styled that way', () => {
    const { container } = render(<Button disabled>x</Button>);
    expect((container.firstElementChild as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps its variant styling alongside the state classes', () => {
    const { container } = render(<Button variant="danger">x</Button>);
    const cls = classesOf(container.firstElementChild);
    expect(cls).toContain('bg-x-slot-button-danger-bg');
    expect(cls).toContain('disabled:cursor-not-allowed');
  });

  // #455 — `danger` は border 系のクラスを1つも出しておらず、BASE_CLASS の
  // `border-transparent` が最後まで残っていた。⇒ 塗りではなく**輪郭**で danger を
  // 表す艦（nene-deal）は、スロット値をいくら上書きしても枠を出せなかった。
  it('reaches a slot for its border, like secondary does', () => {
    const cls = classesOf(render(<Button variant="danger">x</Button>).container.firstElementChild);
    expect(cls).toContain('border-x-slot-button-danger-border');
  });

  // 🔴 この PR が「他艦の見た目を変えない」ことの実測。既定の枠色は塗りと**同じ変数**を
  // 指すので、塗りの上に同色の枠が乗る＝`border-transparent` が塗りの上で描いていたのと
  // 同じ結果になる。列挙で書かず theme の現物から読む（型1: 列挙で書いた検査は、
  // 列挙に無いものを緑にする）。
  it('defaults that border to the fill, so a filled danger button is unchanged', () => {
    const css = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '../../themes/default.css'),
      'utf8',
    );
    const valueOf = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
    const bg = valueOf('color-x-slot-button-danger-bg');
    expect(bg).toBeTruthy(); // 陽性対照: 読めていないのに一致と言わない
    expect(valueOf('color-x-slot-button-danger-border')).toBe(bg);
  });
});

describe('className lands on the root', () => {
  // 🔴 `Checkbox` と `Radio` だけ root が <label> なのに className が子の <input> へ
  // 行っていた（〜0.10.0）。⇒ 呼び出し側は root を指定する手段が無く、flex 行の中で
  // self-start も幅も margin も言えず、div で包むしか無かった（vault・2026-08-23）。
  //
  // 🔑 これは波2 で一度答えた症状の、原因の側。あのときは cursor-pointer を
  // キットが持つ形で解いたが、「className が root に届かない」ことは残っていた。
  // 報告された症状を直すことと、報告が指している原因を直すことは別。
  const CASES = [
    [
      'Button',
      <Button key="b" className="MARK">
        x
      </Button>,
    ],
    ['Input', <Input key="i" className="MARK" />],
    ['Textarea', <Textarea key="t" className="MARK" />],
    ['Checkbox', <Checkbox key="c" label="x" className="MARK" />],
    ['Radio', <Radio key="r" label="x" name="g" className="MARK" />],
    [
      'Switch',
      <Switch key="s" label="x" checked={false} onCheckedChange={() => {}} className="MARK" />,
    ],
  ] as const;

  it.each(CASES)('%s puts the caller’s class on its outermost element', (_n, node) => {
    const { container } = render(node);
    const root = container.firstElementChild;
    expect(root?.getAttribute('class') ?? '').toContain('MARK');
  });

  // #390 — 0.16.1 まで className を受けなかった7部品のうち、受けるべき4つ。
  // Modal / ConfirmDialog / ToastProvider は受けない側に置く（オーバーレイ／プロバイダ。
  // dialog に外から任意クラスを載せると margin / top-layer の前提が崩れる——#417 がその実例）。
  const LATE_CASES = [
    [
      'Badge',
      <Badge key="bd" className="MARK">
        x
      </Badge>,
    ],
    [
      'FormField',
      <FormField key="ff" id="f" label="x" className="MARK">
        <input id="f" />
      </FormField>,
    ],
    [
      'DataTable',
      <DataTable
        key="dt"
        caption="c"
        className="MARK"
        columns={[{ key: 'a', header: 'A', cell: (r: { a: string }) => r.a }]}
        rows={[{ a: '1' }]}
        rowKey={(r) => r.a}
      />,
    ],
    [
      'Pagination',
      <Pagination
        key="pg"
        label="p"
        previousLabel="prev"
        nextLabel="next"
        status="1 / 1"
        page={1}
        pageCount={1}
        onPageChange={() => {}}
        className="MARK"
      />,
    ],
  ] as const;

  it.each(LATE_CASES)(
    '%s (0.17.0) puts the caller’s class on its outermost element',
    (_n, node) => {
      const { container } = render(node);
      const root = container.firstElementChild;
      expect(root?.getAttribute('class') ?? '').toContain('MARK');
    },
  );

  it('Pagination without className renders no empty class attribute', () => {
    const { container } = render(
      <Pagination
        label="p"
        previousLabel="prev"
        nextLabel="next"
        status="1 / 1"
        page={1}
        pageCount={1}
        onPageChange={() => {}}
      />,
    );
    expect(container.firstElementChild?.hasAttribute('class')).toBe(false);
  });

  it('Checkbox still lets the box itself be reached, separately', () => {
    const { container } = render(<Checkbox label="x" className="ONLABEL" inputClassName="ONBOX" />);
    expect(container.firstElementChild?.getAttribute('class')).toContain('ONLABEL');
    expect(container.firstElementChild?.getAttribute('class')).not.toContain('ONBOX');
    expect(container.querySelector('input')?.getAttribute('class')).toContain('ONBOX');
    expect(container.querySelector('input')?.getAttribute('class')).not.toContain('ONLABEL');
  });
});

describe('a raw <svg> inside a Button', () => {
  // 🔴 vault の載せ替えで、アップロードボタンが縦230pxの矩形になった（2026-08-23）。
  // width/height 属性も CSS 寸法も無い <svg> は置換要素の既定 300×150 まで広がる。
  // <div> → <Stack> でブロックフローから flex へ変わった瞬間に出た。
  it('is bounded, so it cannot lay out at the replaced-element default', () => {
    const { container } = render(<Button>x</Button>);
    const cls = classesOf(container.firstElementChild);
    expect(cls).toContain('[&_svg]:max-h-x-slot-button-icon');
    expect(cls).toContain('[&_svg]:max-w-x-slot-button-icon');
  });

  it('🔴 is bounded and never sized — Icon’s own size must survive', () => {
    // 任意バリアント由来のセレクタは子孫セレクタへ落ちるので、Icon が自分に付ける
    // 素のクラス（h-5 w-5）より詳細度が高い。⇒ [&_svg]:size-* を当てると
    // <Icon size="sm"> がボタン側の寸法で描かれる。max-* なら衝突しない（別プロパティ・
    // 既に小さいものは触らない）。この区別が消えると、退行は目視でしか出ない。
    const cls = classesOf(render(<Button>x</Button>).container.firstElementChild);
    for (const c of cls) {
      expect(c, `Button must bound its svg, not size it: ${c}`).not.toMatch(
        /^\[&_svg\]:(size|h|w)-/,
      );
    }
  });

  it('leaves an Icon’s own size class untouched', () => {
    const { container } = render(
      <Button>
        <Icon size="sm" decorative>
          <path d="M0 0h24v24H0z" />
        </Icon>
      </Button>,
    );
    expect(classesOf(container.querySelector('svg'))).toContain('h-4');
  });
});

describe('Button が自分の中身を並べる（#366）', () => {
  it('🔴 md と sm が別の font スロットを持つ — padding と対称', () => {
    // 🔴 padding は 4本（md/sm × x/y）あるのに font は1本だった。⇒ vault は md=13px /
    // sm=12px を出荷していたのに、キットでは両方が同じ大きさになる。
    // ページネーションの Previous が本番12px / ローカル13px（vault 実測 2026-08-23）。
    const md = classesOf(render(<Button>x</Button>).container.firstElementChild);
    const sm = classesOf(render(<Button size="sm">x</Button>).container.firstElementChild);
    expect(md).toContain('text-x-slot-button-size');
    expect(sm).toContain('text-x-slot-button-sm-size');
    expect(sm).not.toContain('text-x-slot-button-size');
  });

  it('🔴 padding と font のスロットが size ごとに揃っている', () => {
    // 対称性そのものを固定する。片方だけ増える形が、この報告の原因だった。
    for (const [size, prefix] of [
      ['md', 'button'],
      ['sm', 'button-sm'],
    ] as const) {
      const cls = classesOf(render(<Button size={size}>x</Button>).container.firstElementChild);
      expect(cls, `${size} の padding-x`).toContain(`px-x-slot-${prefix}-pad-x`);
      expect(cls, `${size} の padding-y`).toContain(`py-x-slot-${prefix}-pad-y`);
      expect(cls, `${size} の font`).toContain(`text-x-slot-${prefix}-size`);
    }
  });

  it('中身を並べる — アイコンと文字の配置を呼び出し側に残さない', () => {
    // svg の寸法は面倒を見ているのに並べ方だけ呼び出し側、という非対称を消す。
    const cls = classesOf(render(<Button>x</Button>).container.firstElementChild);
    expect(cls).toContain('inline-flex');
    expect(cls).toContain('items-center');
    // flex は子の匿名テキストの前後の空白を落とすので、gap が無いと
    // <Button><Icon /> Save</Button> のスペースが消える。
    expect(cls).toContain('gap-x-slot-button-gap');
    // 🔴 flex ではなく inline-flex。flex にすると行を占有する。
    expect(cls).not.toContain('flex ');
  });
});

describe('タッチ端末の下限（#368）', () => {
  const TOUCH = 'pointer-coarse:min-h-x-slot-control-touch-min';

  it.each([
    ['Button md', <Button key="b">x</Button>],
    [
      'Button sm',
      <Button key="bs" size="sm">
        x
      </Button>,
    ],
    ['Input', <Input key="i" />],
    [
      'Select',
      <Select key="s">
        <option>a</option>
      </Select>,
    ],
    ['Textarea', <Textarea key="t" />],
    ['Checkbox', <Checkbox key="c" label="x" />],
    ['Radio', <Radio key="r" label="x" name="g" />],
    ['Switch', <Switch key="w" label="x" checked={false} onCheckedChange={() => {}} />],
  ])('%s は下限を root（＝タップされる要素）に持つ', (_n, node) => {
    const { container } = render(node);
    expect(classesOf(container.firstElementChild)).toContain(TOUCH);
  });

  it('🔴 Checkbox の下限は箱ではなくラベルに付く', () => {
    // 箱は size-x-slot-choice-box（16px 四方）なので、そこに min-height を当てると
    // 44×16 の縦長になるだけで、対象は大きくならない。タップされるのはラベル。
    // ⇒ CONTROL_CLASS（全コントロール共通の束）に入れると箱にも付いてしまうので、
    //    この1本だけ束から外してある。その判断が消えないよう固定する。
    const { container } = render(<Checkbox label="x" />);
    expect(classesOf(container.querySelector('input'))).not.toContain(TOUCH);
    expect(classesOf(container.firstElementChild)).toContain(TOUCH);
  });

  it('🔴 下限を持つ要素は flex — inline-block だと中身が上に寄るだけ', () => {
    // min-height は箱を高くするが、中身は動かさない。items-center が要る。
    for (const node of [<Button key="b">x</Button>, <Checkbox key="c" label="x" />]) {
      const cls = classesOf(render(node).container.firstElementChild);
      expect(cls).toContain('inline-flex');
      expect(cls).toContain('items-center');
    }
  });
});
