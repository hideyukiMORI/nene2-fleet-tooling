// @vitest-environment jsdom
/**
 * 状態表現（#300）— Button / Input / Select が disabled と focus-visible を持つこと。
 *
 * 🔴 これは見た目のテストではなく**退行を止めるテスト**。v0.1 はこの3部品を
 * disabled も focus も無いまま出荷しており、艦の画面が 39箇所で自前に補っていた。
 * 補いを lint で禁じる（順序③）前にここが埋まっていないと、
 * **押せないことが見えないボタン**が本番に出る。
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Select } from './Select.js';
import { Textarea } from './Textarea.js';
import { Checkbox } from './Checkbox.js';
import { Radio } from './Radio.js';
import { Switch } from './Switch.js';

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

  it('Checkbox still lets the box itself be reached, separately', () => {
    const { container } = render(<Checkbox label="x" className="ONLABEL" inputClassName="ONBOX" />);
    expect(container.firstElementChild?.getAttribute('class')).toContain('ONLABEL');
    expect(container.firstElementChild?.getAttribute('class')).not.toContain('ONBOX');
    expect(container.querySelector('input')?.getAttribute('class')).toContain('ONBOX');
    expect(container.querySelector('input')?.getAttribute('class')).not.toContain('ONLABEL');
  });
});
