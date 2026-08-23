// @vitest-environment jsdom
/**
 * FormField の配線（#302 / #308）— エラー・hint の id を部品が自分で拾うこと。
 *
 * 🔴 v0.1 は `aria-describedby` の付与を**呼び出し側の責務**と doc コメントで宣言していた。
 * 実測（2026-08-23・JSX prop のみを数える）では守られていない: nene-vault は
 * `aria-invalid` を **3箇所**に付けて `aria-describedby` は **0回**。nene-payout は 26 対 0。
 * ⇒「不正だとは言うが、理由は読まれない」。hint も同じで、invoice / vault / profile の
 * 3艦とも**描画するだけで参照していない**（見えるが読まれない）。
 * 散文で宣言して呼び出し側に委ねた契約は、半分しか守られない。
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FormField } from './FormField.js';
import { Input } from '../primitives/Input.js';
import { Select } from '../primitives/Select.js';
import { Textarea } from '../primitives/Textarea.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const CONTROLS = [
  ['Input', <Input key="i" />],
  [
    'Select',
    <Select key="s">
      <option>a</option>
    </Select>,
  ],
  ['Textarea', <Textarea key="t" />],
] as const;

describe.each(CONTROLS)('%s inside FormField', (_name, control) => {
  it('picks up the field id, so the label actually labels it', () => {
    const { container } = render(
      <FormField id="email" label="Email">
        {control}
      </FormField>,
    );
    const el = container.querySelector('input, select, textarea');
    expect(el?.getAttribute('id')).toBe('email');
    expect(container.querySelector('label')?.getAttribute('for')).toBe('email');
  });

  it('links the error message without the caller doing anything', () => {
    const { container } = render(
      <FormField id="email" label="Email" error="required">
        {control}
      </FormField>,
    );
    const el = container.querySelector('input, select, textarea');
    expect(el?.getAttribute('aria-invalid')).toBe('true');
    expect(el?.getAttribute('aria-describedby')).toBe('email-error');
    // その id の要素が実在すること。参照先が無い aria-describedby は無言で効かない。
    expect(container.querySelector('#email-error')?.getAttribute('role')).toBe('alert');
  });

  it('says nothing about validity when the field is valid', () => {
    const { container } = render(
      <FormField id="email" label="Email">
        {control}
      </FormField>,
    );
    const el = container.querySelector('input, select, textarea');
    expect(el?.getAttribute('aria-invalid')).toBeNull();
    expect(el?.getAttribute('aria-describedby')).toBeNull();
  });
});

describe('explicit props', () => {
  it('win over the field, so a caller with its own error region still works', () => {
    const { container } = render(
      <FormField id="email" label="Email" error="required">
        <Input id="custom" aria-describedby="somewhere-else" />
      </FormField>,
    );
    const el = container.querySelector('input');
    expect(el?.getAttribute('id')).toBe('custom');
    expect(el?.getAttribute('aria-describedby')).toBe('somewhere-else');
  });
});

describe('outside a FormField', () => {
  it('leaves a control exactly as the caller wrote it', () => {
    const { container } = render(<Input id="loose" aria-invalid />);
    const el = container.querySelector('input');
    expect(el?.getAttribute('id')).toBe('loose');
    expect(el?.getAttribute('aria-invalid')).toBe('true');
    expect(el?.getAttribute('aria-describedby')).toBeNull();
  });

  it('adds no id of its own', () => {
    const { container } = render(<Textarea />);
    expect(container.querySelector('textarea')?.getAttribute('id')).toBeNull();
  });
});

describe('Textarea', () => {
  it('carries the same states as the other controls, so the ring cannot drift', () => {
    const { container } = render(<Textarea />);
    const cls = (container.querySelector('textarea')?.getAttribute('class') ?? '').split(/\s+/);
    expect(cls).toEqual(
      expect.arrayContaining([
        'focus-visible:outline-2',
        'focus-visible:outline-text-primary',
        'disabled:opacity-x-disabled',
        'placeholder:text-text-muted',
      ]),
    );
  });

  it('sets no rows of its own — height is the screen’s decision', () => {
    const { container } = render(<Textarea />);
    expect(container.querySelector('textarea')?.getAttribute('rows')).toBeNull();
  });
});

describe('hint', () => {
  it('is read out with the control, not merely shown', () => {
    // 🔴 invoice / vault / profile はどれも hint を描画するだけで参照していない。
    const { container } = render(
      <FormField id="email" label="Email" hint="Work address">
        <Input />
      </FormField>,
    );
    const input = container.querySelector('input');
    expect(input?.getAttribute('aria-describedby')).toBe('email-hint');
    expect(container.querySelector('#email-hint')?.textContent).toBe('Work address');
  });

  it('stays visible when there is an error, and is read after it', () => {
    // profile は error のとき hint を隠す。採らない —— 助けが要るのは間違えた瞬間。
    const { container } = render(
      <FormField id="email" label="Email" hint="Work address" error="required">
        <Input />
      </FormField>,
    );
    expect(container.querySelector('#email-hint')).toBeTruthy();
    expect(container.querySelector('input')?.getAttribute('aria-describedby')).toBe(
      'email-error email-hint',
    );
  });

  it('renders under the control, while labelAdornment renders beside the label', () => {
    // 同じ名前で位置が2通りあったので、prop を分けた。
    const { container } = render(
      <FormField id="email" label="Email" hint="under" labelAdornment={<em>beside</em>}>
        <Input />
      </FormField>,
    );
    expect(container.querySelector('label')?.textContent).toBe('Emailbeside');
    expect(container.querySelector('label em')).toBeTruthy();
    expect(container.querySelector('#email-hint')?.tagName).toBe('SPAN');
  });
});

describe('required', () => {
  it('marks the control required without needing any words', () => {
    const { container } = render(
      <FormField id="email" label="Email" required>
        <Input />
      </FormField>,
    );
    expect(container.querySelector('input')?.getAttribute('aria-required')).toBe('true');
  });

  it('shows no marker unless the caller supplies one — the kit ships no strings', () => {
    const { container } = render(
      <FormField id="email" label="Email" required>
        <Input />
      </FormField>,
    );
    expect(container.querySelector('label')?.textContent).toBe('Email');
  });

  it('renders the caller’s marker after the label when both are given', () => {
    const { container } = render(
      <FormField id="email" label="Email" required requiredMarker="＊">
        <Input />
      </FormField>,
    );
    expect(container.querySelector('label')?.textContent).toBe('Email＊');
  });

  it('does not show a marker for an optional field, even if one is supplied', () => {
    const { container } = render(
      <FormField id="email" label="Email" requiredMarker="＊">
        <Input />
      </FormField>,
    );
    expect(container.querySelector('label')?.textContent).toBe('Email');
    expect(container.querySelector('input')?.getAttribute('aria-required')).toBeNull();
  });

  it('says nothing about requiredness outside a FormField', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('input')?.getAttribute('aria-required')).toBeNull();
  });
});
