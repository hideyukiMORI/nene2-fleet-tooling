// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DetailList } from './DetailList.js';

/**
 * #424 — DetailList の layout（stack / columns）。
 *
 * 🔴 主眼は「既定が 0.16.1 までの描画と同じ」であること（#392 と同じ型）。
 * columns は狭い画面で自動的に1列へ落ちる（vault 現物 AuditPage.tsx:248 の max-md:grid-cols-1 に倣う）。
 */

afterEach(() => {
  document.body.innerHTML = '';
});

const rows = [
  { label: 'a', value: '1' },
  { label: 'b', value: '2' },
];
const classesOf = (c: HTMLElement) =>
  (c.querySelector('dl')?.getAttribute('class') ?? '').split(/\s+/);

describe('DetailList — layout', () => {
  it('既定は flex の縦積みで、grid のクラスを1つも持たない', () => {
    const cls = classesOf(render(<DetailList rows={rows} />).container);
    expect(cls).toContain('flex');
    expect(cls).toContain('flex-col');
    expect(cls.filter((c) => c.includes('grid'))).toEqual([]);
  });

  it('columns は2列の grid で、md 未満では自分で1列に落ちる', () => {
    const cls = classesOf(render(<DetailList rows={rows} layout="columns" />).container);
    expect(cls).toContain('grid');
    expect(cls).toContain('grid-cols-2');
    expect(cls).toContain('max-md:grid-cols-1');
    expect(cls).not.toContain('flex-col');
  });

  it('どちらの layout でも gap は同じスロットから読む', () => {
    for (const layout of ['stack', 'columns'] as const) {
      expect(classesOf(render(<DetailList rows={rows} layout={layout} />).container)).toContain(
        'gap-x-slot-detail-gap',
      );
    }
  });

  it('className は layout の後ろに合成される', () => {
    const cls = classesOf(
      render(<DetailList rows={rows} layout="columns" className="MARK" />).container,
    );
    expect(cls[cls.length - 1]).toBe('MARK');
  });
});
