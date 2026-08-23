// @vitest-environment jsdom
/**
 * W0.5 レイアウト部品（#298）— Stack / Grid / Box / Section / Card。
 *
 * 見ているのは「意匠値が props から入らないこと」と「スケール外の値が黙って壊れないこと」。
 * クラス文字列そのものを固定しているのは、**Tailwind が静的に拾えない形へ書き換えられたら
 * 落ちるようにする**ため（実行時に組み立てたクラスは CSS が生成されず、間隔だけが消える）。
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Box } from './Box.js';
import { Card } from './Card.js';
import { Grid } from './Grid.js';
import { Section } from './Section.js';
import { Stack } from './Stack.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const classesOf = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/);

describe('Stack', () => {
  it('stacks vertically by default and takes gap from the scale', () => {
    const { container } = render(<Stack gap="md">x</Stack>);
    expect(classesOf(container.firstElementChild)).toEqual(
      expect.arrayContaining(['flex', 'flex-col', 'gap-x-md']),
    );
  });

  it('lays out horizontally when asked — direction is structure, not design', () => {
    const { container } = render(
      <Stack direction="horizontal" gap="2xs">
        x
      </Stack>,
    );
    expect(classesOf(container.firstElementChild)).toEqual(
      expect.arrayContaining(['flex-row', 'gap-x-2xs']),
    );
  });

  it('owns the seams between children instead of taking them as props', () => {
    // 画面側の last:border-b-0 / first:pt-0（実測10件）をここで吸収する。
    const { container } = render(
      <Stack divider>
        <span>a</span>
        <span>b</span>
      </Stack>,
    );
    expect(classesOf(container.firstElementChild)).toEqual(
      expect.arrayContaining(['divide-y', 'divide-border']),
    );
  });

  it('emits one class per breakpoint for a responsive gap', () => {
    const { container } = render(<Stack gap={{ base: 'xs', sm: 'lg' }}>x</Stack>);
    expect(classesOf(container.firstElementChild)).toEqual(
      expect.arrayContaining(['gap-x-xs', 'sm:gap-x-lg']),
    );
  });

  it('appends the caller className last so it can override, never replace', () => {
    const { container } = render(
      <Stack gap="sm" className="mt-2">
        x
      </Stack>,
    );
    const cls = container.firstElementChild?.getAttribute('class') ?? '';
    expect(cls).toContain('gap-x-sm');
    expect(cls.trim().endsWith('mt-2')).toBe(true);
  });

  it('passes native props through', () => {
    const { container } = render(
      <Stack role="list" aria-label="items">
        x
      </Stack>,
    );
    expect(container.firstElementChild?.getAttribute('role')).toBe('list');
    expect(container.firstElementChild?.getAttribute('aria-label')).toBe('items');
  });
});

describe('Grid', () => {
  it('is a single column until told otherwise', () => {
    const { container } = render(<Grid>x</Grid>);
    expect(classesOf(container.firstElementChild)).toEqual(
      expect.arrayContaining(['grid', 'grid-cols-1']),
    );
  });

  it('expresses the fleet’s most common responsive layout', () => {
    // sm:grid-cols-2 は breakpoint つきクラスの実測最多（14件）。ここが書けないと採用されない。
    const { container } = render(<Grid cols={{ base: 1, sm: 2 }}>x</Grid>);
    expect(classesOf(container.firstElementChild)).toEqual(
      expect.arrayContaining(['grid-cols-1', 'sm:grid-cols-2']),
    );
  });
});

describe('Box', () => {
  it('takes padding from the scale on each axis', () => {
    const { container } = render(
      <Box padX="lg" padY="2xs">
        x
      </Box>,
    );
    expect(classesOf(container.firstElementChild)).toEqual(
      expect.arrayContaining(['px-x-lg', 'py-x-2xs']),
    );
  });

  it('renders no spacing class at all when unset', () => {
    const { container } = render(<Box>x</Box>);
    expect(container.firstElementChild?.getAttribute('class')).toBe('');
  });
});

describe('Section', () => {
  it('is a real section and needs no props for the common case', () => {
    const { container } = render(<Section>x</Section>);
    const el = container.firstElementChild;
    expect(el?.tagName).toBe('SECTION');
    expect(classesOf(el)).toEqual(expect.arrayContaining(['p-x-sm', 'gap-x-xs']));
  });
});

describe('Card', () => {
  it('carries surface, border and radius from the theme — none of them props', () => {
    const { container } = render(<Card>x</Card>);
    expect(classesOf(container.firstElementChild)).toEqual(
      expect.arrayContaining([
        'bg-surface-raised',
        'border',
        'border-border',
        'rounded-x-slot-card',
      ]),
    );
  });

  it('is flat unless raised — a page of shadows reads as no shadows', () => {
    const { container: flat } = render(<Card>x</Card>);
    expect(classesOf(flat.firstElementChild)).not.toContain('shadow-sm');

    const { container: lifted } = render(<Card raised>x</Card>);
    expect(classesOf(lifted.firstElementChild)).toContain('shadow-sm');
  });
});

describe('values that are not on the scale', () => {
  it('are dropped rather than emitted as a class Tailwind will not generate', () => {
    // 型では塞いであるが、JS からの呼び出しと古いビルドは実在する。
    // ここで黙って `gap-x-4.5` を吐くと、CSS が生成されず**間隔だけが消える**。
    const { container } = render(<Stack gap={'4.5' as never}>x</Stack>);
    const cls = container.firstElementChild?.getAttribute('class') ?? '';
    expect(cls).not.toMatch(/gap/);
  });
});
