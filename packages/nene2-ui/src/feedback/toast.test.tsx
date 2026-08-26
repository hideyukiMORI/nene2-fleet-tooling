// @vitest-environment jsdom
/**
 * Toast（#311）— 通知の待ち行列と、それを読み上げる live region。
 *
 * 🔴 見ている中心は「**live region が中身より先に DOM に在ること**」。
 * 実測（2026-08-23）でフリートの4実装（records / field / invoice / deal）は
 * **どれも最初のトーストと同時に region を作っている**（deal は空のとき `null` を返す）。
 * その形の region は読み上げられないことが多く、**画面には出るのに無音**になる。
 * だから4実装とも生き残った。
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './ToastProvider.js';
import { useToast } from './toast-context.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

function Trigger({
  tone,
  durationMs,
  description,
}: {
  tone?: 'info' | 'success' | 'danger';
  durationMs?: number;
  description?: string;
}) {
  const { show } = useToast();
  return (
    <button
      onClick={() =>
        show('Saved', {
          ...(tone === undefined ? {} : { tone }),
          ...(durationMs === undefined ? {} : { durationMs }),
          ...(description === undefined ? {} : { description }),
        })
      }
    >
      go
    </button>
  );
}

const mount = (ui: React.ReactNode) =>
  render(
    <ToastProvider regionLabel="Notifications" dismissLabel="Dismiss">
      {ui}
    </ToastProvider>,
  );

describe('live regions', () => {
  it('exist before there is anything to announce', () => {
    // 🔴 これが本命。中身と同時に生まれた region は読み上げられない。
    const { container } = mount(<Trigger />);
    const regions = [...container.querySelectorAll('[role="region"]')];
    expect(regions).toHaveLength(2);
    expect(regions.map((r) => r.getAttribute('aria-live')).sort()).toEqual(['assertive', 'polite']);
    expect(regions.every((r) => r.getAttribute('aria-label') === 'Notifications')).toBe(true);
  });

  it('are still there after the last toast goes away', () => {
    const { container } = mount(<Trigger />);
    fireEvent.click(screen.getByText('go'));
    act(() => void vi.advanceTimersByTime(5000));
    expect(container.querySelectorAll('[role="region"]')).toHaveLength(2);
  });

  it('announces politely by default and assertively for danger', () => {
    const { container } = mount(<Trigger tone="danger" />);
    fireEvent.click(screen.getByText('go'));
    const assertive = container.querySelector('[aria-live="assertive"]');
    const polite = container.querySelector('[aria-live="polite"]');
    expect(assertive?.textContent).toContain('Saved');
    expect(polite?.textContent).not.toContain('Saved');
  });

  // #457 — 語彙が増えても「中断してよいのは danger だけ」の線は動かさない。
  // 完了の報告で読み上げを割り込ませると、利用者の作業をトーストが止める。
  it('keeps success on the polite side, where interruption is not warranted', () => {
    const { container } = mount(<Trigger tone="success" />);
    fireEvent.click(screen.getByText('go'));
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toContain('Saved');
    expect(container.querySelector('[aria-live="assertive"]')?.textContent).not.toContain('Saved');
  });
});

describe('tone vocabulary (#457)', () => {
  it('paints success from its own slot, not by borrowing another tone', () => {
    const { container } = mount(<Trigger tone="success" />);
    fireEvent.click(screen.getByText('go'));
    const cls = container.querySelector('[aria-live="polite"] > div')?.getAttribute('class') ?? '';
    expect(cls).toContain('text-x-slot-toast-success-fg');
    // 🔴 他トーンのスロットを借りていない（warn が danger を指していた 0.11 以前の型）
    expect(cls).not.toContain('text-x-slot-toast-danger-fg');
    expect(cls).not.toContain('text-x-slot-toast-fg ');
  });
});

describe('description (#457)', () => {
  it('renders the second line when one is given', () => {
    mount(<Trigger description="Acme → Won" />);
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByText('Acme → Won')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  // 🔴 本 PR が「既存艦の描画を変えない」ことの実測。二段目が無いときは要素を増やさない。
  it('leaves the one-line toast exactly as it was — message in a single bare span', () => {
    const { container } = mount(<Trigger />);
    fireEvent.click(screen.getByText('go'));
    const body = container.querySelector('[aria-live="polite"] > div > span');
    expect(body?.textContent).toBe('Saved');
    expect(body?.children).toHaveLength(0);
    // 陽性対照: 二段版では同じ位置に子が2つ出る＝上の 0 が「測れていない」ではない
    document.body.innerHTML = '';
    const two = mount(<Trigger description="x" />);
    fireEvent.click(screen.getAllByText('go')[0]!);
    expect(two.container.querySelector('[aria-live="polite"] > div > span')?.children).toHaveLength(
      2,
    );
  });
});

describe('lifetime', () => {
  it('stays five seconds by default — long enough to be read aloud', () => {
    // field は 2200ms、deal は 2600ms。読み終わる前に消える通知は届いていない。
    mount(<Trigger />);
    fireEvent.click(screen.getByText('go'));
    act(() => void vi.advanceTimersByTime(4999));
    expect(screen.queryByText('Saved')).not.toBeNull();
    act(() => void vi.advanceTimersByTime(1));
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('honours a per-toast duration', () => {
    mount(<Trigger durationMs={1000} />);
    fireEvent.click(screen.getByText('go'));
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('can be dismissed by hand, and does not come back when its timer fires', () => {
    mount(<Trigger />);
    fireEvent.click(screen.getByText('go'));
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Saved')).toBeNull();
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('stacks several toasts rather than replacing them', () => {
    mount(<Trigger />);
    fireEvent.click(screen.getByText('go'));
    fireEvent.click(screen.getByText('go'));
    expect(screen.getAllByText('Saved')).toHaveLength(2);
  });
});

describe('useToast outside a provider', () => {
  it('throws instead of silently doing nothing', () => {
    // 何も起きない show() は、誰かが「確認が出ない」と気づくまで見つからない。
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
