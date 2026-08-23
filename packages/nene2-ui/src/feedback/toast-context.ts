import { createContext, useContext } from 'react';

export type ToastTone = 'info' | 'danger';

export interface ToastOptions {
  tone?: ToastTone;
  /** Overrides the provider's default. */
  durationMs?: number;
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
