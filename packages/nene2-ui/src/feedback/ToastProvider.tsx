import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { CLICKABLE_CLASS } from '../lib/states.js';
import { ToastContext, type ToastApi, type ToastOptions, type ToastTone } from './toast-context.js';

interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  description?: string;
}

export interface ToastProviderProps {
  /** Localized name for the toast region, e.g. "Notifications". */
  regionLabel: string;
  /** Localized label for each toast's dismiss control. */
  dismissLabel: string;
  /**
   * How long a toast stays, in milliseconds.
   *
   * 🔴 Five seconds, not the two-and-a-bit the fleet settled on independently (nene-field
   * 2200ms, nene-deal 2600ms). A toast that vanishes before a screen reader has finished
   * reading it was never delivered, and 2.2s is not enough for a sentence. Callers can
   * shorten it per toast if they have a reason.
   */
  defaultDurationMs?: number;
  children: ReactNode;
}

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'bg-x-slot-toast-bg text-x-slot-toast-fg border-x-slot-toast-border',
  success: 'bg-x-slot-toast-bg text-x-slot-toast-success-fg border-x-slot-toast-success-border',
  danger: 'bg-x-slot-toast-bg text-x-slot-toast-danger-fg border-x-slot-toast-danger-border',
};

// 🔴 `success` は polite 側。`assertive` は読み上げを中断させるので、成功の報告に使うと
// 利用者の作業を割り込みで止める。中断してよいのは danger だけ、というのが2リージョンに
// 分けた元の理由なので、語彙が増えてもその線は動かさない（#457）。
const POLITE_TONES: ToastTone[] = ['info', 'success'];
const ASSERTIVE_TONES: ToastTone[] = ['danger'];

/**
 * Hosts the toast queue and the live regions that announce it.
 *
 * 🔴 The live regions are always in the DOM, even with nothing to show. Four ships
 * (nene-records, nene-field, nene-invoice, nene-deal) each create theirs at the moment the
 * first toast appears — `nene-deal` even returns `null` when the queue is empty. A live
 * region that arrives together with its content is frequently not announced at all: the
 * assistive technology has nothing to have been watching. The toast is on screen, looks
 * right, and is silent — which is why this survived four independent implementations.
 *
 * 🔴 Two regions, not one. `polite` waits for a pause; `danger` needs `assertive`, which
 * interrupts. Both must pre-exist for the same reason, so both are rendered empty.
 */
export function ToastProvider({
  regionLabel,
  dismissLabel,
  defaultDurationMs = 5000,
  children,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = `toast-${(nextId.current += 1)}`;
      const description = options?.description;
      setToasts((current) => [
        ...current,
        {
          id,
          message,
          tone: options?.tone ?? 'info',
          // exactOptionalPropertyTypes: 省略と `undefined` を渡すことは別物なので、
          // 渡されなかった場合はキーごと作らない。
          ...(description === undefined ? {} : { description }),
        },
      ]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), options?.durationMs ?? defaultDurationMs),
      );
      return id;
    },
    [defaultDurationMs, dismiss],
  );

  // Timers outlive the component otherwise, and fire setState on an unmounted tree.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss]);

  const region = (tones: ToastTone[], live: 'polite' | 'assertive') => (
    <div
      aria-live={live}
      aria-label={regionLabel}
      role="region"
      className="flex flex-col gap-x-slot-toast-gap"
    >
      {toasts
        // 複数トーンを1つのリージョンへ。元の配列を filter するので、同じリージョンに
        // 入るトースト同士の**表示順は push された順のまま**になる。
        .filter((toast) => tones.includes(toast.tone))
        .map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'flex items-start gap-x-slot-toast-gap rounded-x-slot-toast border p-x-slot-toast-pad font-sans shadow-x-slot-toast',
              TONE_CLASS[toast.tone],
            )}
          >
            {/* 🔴 二段目が無いときは要素を増やさない。無条件に包むと、この prop を
             * 使っていない艦の DOM が動く（EmptyState #456 と同じ判断）。 */}
            {toast.description === undefined ? (
              <span>{toast.message}</span>
            ) : (
              <span className="flex flex-col gap-x-slot-toast-description-gap">
                <span>{toast.message}</span>
                <span className="text-x-slot-toast-description-fg">{toast.description}</span>
              </span>
            )}
            <button
              type="button"
              aria-label={dismissLabel}
              onClick={() => dismiss(toast.id)}
              className={cx('rounded-x-slot-toast px-x-slot-toast-dismiss-pad-x', CLICKABLE_CLASS)}
            >
              {dismissLabel}
            </button>
          </div>
        ))}
    </div>
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {region(POLITE_TONES, 'polite')}
      {region(ASSERTIVE_TONES, 'assertive')}
    </ToastContext.Provider>
  );
}
