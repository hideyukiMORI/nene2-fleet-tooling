import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { CLICKABLE_CLASS } from '../lib/states.js';
import { ToastContext, type ToastApi, type ToastOptions, type ToastTone } from './toast-context.js';

interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
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
  danger: 'bg-x-slot-toast-bg text-x-slot-toast-danger-fg border-x-slot-toast-danger-border',
};

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
      setToasts((current) => [...current, { id, message, tone: options?.tone ?? 'info' }]);
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

  const region = (tone: ToastTone, live: 'polite' | 'assertive') => (
    <div
      aria-live={live}
      aria-label={regionLabel}
      role="region"
      className="flex flex-col gap-x-slot-toast-gap"
    >
      {toasts
        .filter((toast) => toast.tone === tone)
        .map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'flex items-start gap-x-slot-toast-gap rounded-x-slot-toast border p-x-slot-toast-pad font-sans shadow-x-slot-toast',
              TONE_CLASS[toast.tone],
            )}
          >
            <span>{toast.message}</span>
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
      {region('info', 'polite')}
      {region('danger', 'assertive')}
    </ToastContext.Provider>
  );
}
