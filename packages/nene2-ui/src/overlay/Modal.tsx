import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '../lib/cx.js';

export interface ModalProps {
  open: boolean;
  /** Called for every dismissal the browser owns: Esc, the close control, the backdrop. */
  onClose: () => void;
  /** Localized title. Also names the dialog for assistive tech. */
  title: string;
  children: ReactNode;
}

/**
 * A modal dialog built on the native `<dialog>` element.
 *
 * 🔴 Why native. Focus trapping, Esc-to-dismiss, the backdrop, and rendering above every
 * stacking context are all things the browser already does correctly. Eight ships wrote
 * their own modal, which means the fleet currently maintains eight focus traps — the single
 * hardest piece of interaction code to get right, reimplemented per product.
 *
 * 🔴 `showModal()` is called imperatively rather than through the `open` attribute, because
 * only `showModal()` puts the dialog in the top layer and traps focus; setting `open`
 * renders it inline and non-modal. jsdom 25.0.1 does not implement `showModal` at all
 * (measured 2026-08-23), and neither do browsers older than the feature, so the fallback
 * sets `open` — degraded but visible, rather than a dialog that never appears.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;

    if (open) {
      if (typeof el.showModal === 'function') {
        if (!el.open) el.showModal();
      } else {
        el.setAttribute('open', '');
      }
      return;
    }

    if (typeof el.close === 'function') {
      if (el.open) el.close();
    } else {
      el.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // The browser fires `close` for Esc as well as for close(); routing both through the
      // caller keeps `open` from drifting out of sync with what is on screen.
      onClose={onClose}
      onCancel={onClose}
      className={cx(
        'bg-x-slot-modal-bg text-x-slot-modal-fg border border-x-slot-modal-border rounded-x-slot-modal',
        'p-x-slot-modal-pad font-sans backdrop:bg-x-slot-modal-scrim/50',
      )}
    >
      {children}
    </dialog>
  );
}
