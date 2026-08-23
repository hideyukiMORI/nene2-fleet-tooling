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

function Trigger({ tone, durationMs }: { tone?: 'info' | 'danger'; durationMs?: number }) {
  const { show } = useToast();
  return (
    <button
      onClick={() =>
        show('Saved', {
          ...(tone === undefined ? {} : { tone }),
          ...(durationMs === undefined ? {} : { durationMs }),
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
