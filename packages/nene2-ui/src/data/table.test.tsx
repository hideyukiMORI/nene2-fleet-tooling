// @vitest-environment jsdom
/**
 * W0.7（#306）— Checkbox / Radio / Switch / DataTable / Pagination。
 *
 * どれも「**間違えても画面は正しく見える**」種類の欠陥を見ている:
 * ラベルの結び付き・radio の name・switch の役割・th の scope・現在位置の可読性。
 */
import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../primitives/Checkbox.js';
import { Radio } from '../primitives/Radio.js';
import { Switch } from '../primitives/Switch.js';
import { DataTable } from './DataTable.js';
import { Pagination } from './Pagination.js';
import { FormField } from '../forms/FormField.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Checkbox', () => {
  it('wraps its own label, so clicking the text toggles the box', () => {
    const { container } = render(<Checkbox label="Agree" />);
    const label = container.querySelector('label');
    expect(label?.querySelector('input[type="checkbox"]')).toBeTruthy();
    expect(label?.textContent).toBe('Agree');
  });

  it('toggles when the label text is clicked, not just the box', () => {
    const { getByText, container } = render(<Checkbox label="Agree" />);
    fireEvent.click(getByText('Agree'));
    expect(container.querySelector<HTMLInputElement>('input')?.checked).toBe(true);
  });

  it('picks up the FormField wiring like the other controls', () => {
    const { container } = render(
      <FormField id="tos" label="Terms" error="required">
        <Checkbox label="Agree" />
      </FormField>,
    );
    const input = container.querySelector('input[type="checkbox"]');
    expect(input?.getAttribute('id')).toBe('tos');
    expect(input?.getAttribute('aria-describedby')).toBe('tos-error');
  });

  it('carries the shared focus and disabled treatment', () => {
    const { container } = render(<Checkbox label="x" />);
    const cls = (container.querySelector('input')?.getAttribute('class') ?? '').split(/\s+/);
    expect(cls).toEqual(
      expect.arrayContaining(['focus-visible:outline-2', 'disabled:opacity-x-disabled']),
    );
  });
});

describe('Radio', () => {
  it('requires a name — a radio without one is a group of one', () => {
    const { container } = render(<Radio name="plan" value="a" label="A" />);
    expect(container.querySelector('input')?.getAttribute('name')).toBe('plan');
  });

  it('lets exactly one of a group be chosen', () => {
    const { getByText, container } = render(
      <>
        <Radio name="plan" value="a" label="A" />
        <Radio name="plan" value="b" label="B" />
      </>,
    );
    fireEvent.click(getByText('A'));
    fireEvent.click(getByText('B'));
    const [a, b] = [...container.querySelectorAll<HTMLInputElement>('input')];
    expect(a?.checked).toBe(false);
    expect(b?.checked).toBe(true);
  });

  it('does not take the field id — that belongs to the group, not each option', () => {
    const { container } = render(
      <FormField id="plan" label="Plan">
        <Radio name="plan" value="a" label="A" />
      </FormField>,
    );
    // 各オプションに同じ id が付くと、id が重複して label が壊れる。
    expect(container.querySelector('input')?.getAttribute('id')).toBeNull();
  });
});

describe('Switch', () => {
  it('is announced as a switch, not as a checkbox', () => {
    const { container } = render(
      <Switch checked={false} onCheckedChange={() => {}} label="Beta" />,
    );
    const el = container.querySelector('button');
    expect(el?.getAttribute('role')).toBe('switch');
    expect(el?.getAttribute('aria-checked')).toBe('false');
    expect(container.querySelector('input')).toBeNull();
  });

  it('reports its state through aria, not only through colour', () => {
    const { container } = render(<Switch checked onCheckedChange={() => {}} label="Beta" />);
    expect(container.querySelector('button')?.getAttribute('aria-checked')).toBe('true');
  });

  it('hands the caller the value it would become', () => {
    const onCheckedChange = vi.fn();
    const { container } = render(
      <Switch checked={false} onCheckedChange={onCheckedChange} label="Beta" />,
    );
    fireEvent.click(container.querySelector('button')!);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

interface Row {
  id: string;
  name: string;
  amount: number;
}
const ROWS: Row[] = [
  { id: '1', name: 'a', amount: 10 },
  { id: '2', name: 'b', amount: 20 },
];
const COLUMNS = [
  { key: 'name', header: 'Name', cell: (r: Row) => r.name },
  { key: 'amount', header: 'Amount', cell: (r: Row) => r.amount, align: 'end' as const },
];

describe('DataTable', () => {
  it('scopes every column heading, so cells can be paired with them', () => {
    const { container } = render(
      <DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} caption="Invoices" />,
    );
    const ths = [...container.querySelectorAll('th')];
    expect(ths).toHaveLength(2);
    for (const th of ths) expect(th.getAttribute('scope')).toBe('col');
  });

  it('always has a caption, visually hidden rather than absent', () => {
    const { container } = render(
      <DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} caption="Invoices" />,
    );
    const caption = container.querySelector('caption');
    expect(caption?.textContent).toBe('Invoices');
    expect(caption?.getAttribute('class')).toContain('sr-only');
  });

  it('renders a real row per item', () => {
    const { container } = render(
      <DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} caption="Invoices" />,
    );
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelectorAll('tbody td')[1]?.textContent).toBe('10');
  });

  it('is still a valid table with no rows', () => {
    const { container } = render(
      <DataTable columns={COLUMNS} rows={[]} rowKey={(r) => r.id} caption="Invoices" />,
    );
    expect(container.querySelectorAll('th')).toHaveLength(2);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});

describe('Pagination', () => {
  const props = {
    pageCount: 9,
    onPageChange: () => {},
    label: 'Invoice pages',
    previousLabel: 'Previous',
    nextLabel: 'Next',
    status: 'Page 2 of 9',
  };

  it('names its navigation region', () => {
    const { container } = render(<Pagination {...props} page={2} />);
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Invoice pages');
  });

  it('states the current position in text, not in colour alone', () => {
    const { container } = render(<Pagination {...props} page={2} />);
    const current = container.querySelector('[aria-current="page"]');
    expect(current?.textContent).toBe('Page 2 of 9');
  });

  it('disables the ends rather than hiding them', () => {
    const first = render(<Pagination {...props} page={1} />).container;
    const [prev, next] = [...first.querySelectorAll('button')];
    expect(prev?.disabled).toBe(true);
    expect(next?.disabled).toBe(false);

    const last = render(<Pagination {...props} page={9} />).container;
    const [p2, n2] = [...last.querySelectorAll('button')];
    expect(p2?.disabled).toBe(false);
    expect(n2?.disabled).toBe(true);
  });

  it('moves one page at a time, in the direction asked', () => {
    const onPageChange = vi.fn();
    const { container } = render(<Pagination {...props} page={4} onPageChange={onPageChange} />);
    const [prev, next] = [...container.querySelectorAll('button')];
    fireEvent.click(next!);
    fireEvent.click(prev!);
    expect(onPageChange).toHaveBeenNthCalledWith(1, 5);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });
});

describe('Checkbox / Radio label side', () => {
  // 🔴 className は <input> へ渡るので、ラベル側にはキットしか届かない。
  // vault は cursor-pointer と間隔をラベルに持っており、届かないと
  // **製品の全選択肢からポインタカーソルが消える**（マウス利用者には見え、diff には出ない）。
  it.each([
    ['Checkbox', <Checkbox key="c" label="x" />],
    ['Radio', <Radio key="r" name="g" value="a" label="x" />],
  ])('%s makes the whole label clickable-looking', (_n, ui) => {
    const { container } = render(ui);
    const cls = (container.querySelector('label')?.getAttribute('class') ?? '').split(/\s+/);
    expect(cls).toContain('cursor-pointer');
    expect(cls).toContain('gap-x-slot-choice-gap');
  });

  it.each([
    ['Checkbox', <Checkbox key="c" label="x" />],
    ['Radio', <Radio key="r" name="g" value="a" label="x" />],
  ])('%s sizes and tints the box from the theme', (_n, ui) => {
    const { container } = render(ui);
    const cls = (container.querySelector('input')?.getAttribute('class') ?? '').split(/\s+/);
    expect(cls).toContain('size-x-slot-choice-box');
    expect(cls).toContain('accent-x-slot-choice-accent');
    expect(cls).not.toContain('accent-accent');
  });
});

describe('Pagination offset model', () => {
  const base = {
    label: 'Users',
    previousLabel: 'Previous',
    nextLabel: 'Next',
    status: 'Showing 21–40 of 384',
  };

  it('takes canPrev / canNext instead of a page number', () => {
    // vault の3画面とも offset ベースで、page 番号は誰も持っていない。
    const { container } = render(
      <Pagination {...base} canPrev canNext onPrev={() => {}} onNext={() => {}} />,
    );
    const [prev, next] = [...container.querySelectorAll('button')];
    expect(prev?.disabled).toBe(false);
    expect(next?.disabled).toBe(false);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe(
      'Showing 21–40 of 384',
    );
  });

  it('disables each end from the flag it was given', () => {
    const { container } = render(
      <Pagination {...base} canPrev={false} canNext onPrev={() => {}} onNext={() => {}} />,
    );
    const [prev, next] = [...container.querySelectorAll('button')];
    expect(prev?.disabled).toBe(true);
    expect(next?.disabled).toBe(false);
  });

  it('calls the offset handlers, not a page setter', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const { container } = render(
      <Pagination {...base} canPrev canNext onPrev={onPrev} onNext={onNext} />,
    );
    const [prev, next] = [...container.querySelectorAll('button')];
    fireEvent.click(next!);
    fireEvent.click(prev!);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('still supports the page model', () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <Pagination
        label="Invoices"
        previousLabel="Previous"
        nextLabel="Next"
        status="Page 2 of 9"
        page={2}
        pageCount={9}
        onPageChange={onPageChange}
      />,
    );
    fireEvent.click([...container.querySelectorAll('button')][1]!);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
