import { createContext, useContext } from 'react';

/**
 * 🔴 `success` は 0.17.x まで無く、`info | danger` の2語彙だった。`Badge` と `InlineAlert`
 * は既に `success` を持っており（Badge は neutral|accent|danger|success|warn|info）、
 * **トーストだけ語彙が2つ**という状態は 0.17.0 #422 の「一つの語彙をキット全体で」と
 * 噛み合わない。nene-deal は完了を緑で伝えており、`info` に寄せると保存・移動・削除の
 * 完了が中立色になって、エラーとの差が「赤かどうか」だけになる（#457）。
 */
export type ToastTone = 'info' | 'success' | 'danger';

export interface ToastOptions {
  tone?: ToastTone;
  /** Overrides the provider's default. */
  durationMs?: number;
  /**
   * Localized second line: what the action applied to.
   *
   * 🔴 Not decoration. nene-deal's success toasts carry one at **7 of 7** call sites — the
   * deal that moved, the stage it moved to, the range that was exported. `show(message)`
   * alone drops that text, and joining the two halves is not available to the ship: they are
   * separate catalog keys, so the separator would be a string owned by the ship, against
   * principle 4 (#457).
   *
   * Omit it and the render is what it was before this prop existed.
   */
  description?: string;
}

export interface ToastApi {
  /** Shows a toast and returns its id, so a caller can dismiss it early. */
  show: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/**
 * Read the toast API.
 *
 * Throws outside a provider rather than returning a no-op: a `show()` that silently does
 * nothing is a bug that surfaces only when somebody notices a confirmation that never
 * appeared, which may be never.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) {
    throw new Error('useToast must be used inside a <ToastProvider>');
  }
  return api;
}
