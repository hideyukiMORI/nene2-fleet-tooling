import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from '../lib/cx.js';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalBase {
  open: boolean;
  /** Called for every dismissal routed through the browser's `close` event: Esc, and `close()`. */
  onClose: () => void;
  /** Localized title. Names the dialog for assistive tech, and is what the header shows. */
  title: string;
  /**
   * Width ceiling. Omitted, the dialog takes the browser's own sizing — which is what every
   * caller got before this prop existed, so leaving it out changes nothing.
   */
  size?: ModalSize;
  /**
   * On a narrow viewport, sit against the bottom edge with the top corners rounded.
   * Off by default: a dialog that changes shape at a breakpoint is a decision, not a default.
   */
  sheetOnMobile?: boolean;
  /**
   * Scroll the body instead of letting tall content spill out of the dialog. Off by default.
   *
   * 🔴 The kit adds no height cap of its own. The UA stylesheet already caps a `showModal()`
   * dialog to the viewport — inventing a second ceiling here would mean a literal like `80vh`
   * living in the theme, which the kit forbids (every slot default must be a scale reference,
   * and the spacing scale is rem-based and cannot express a share of the viewport). What is
   * actually missing without this prop is the scroll: at the UA cap, tall content is clipped.
   * ⚠️ The cap itself is the browser's and is not asserted here — jsdom does not implement
   * `showModal`, so it can only be verified in a real browser (see #392, live lane).
   */
  scrollable?: boolean;
  children: ReactNode;
}

interface PlainModal extends ModalBase {
  header?: false;
  closeLabel?: never;
}

interface HeaderModal extends ModalBase {
  /** Draw a header: the title, and a control that closes the dialog. */
  header: true;
  /**
   * Localized name for the close control.
   *
   * 🔴 Required with `header`, not optional-with-a-default. A default would be an English
   * string shipped into every product's UI — the one thing a fleet kit must not do (I18N-2).
   * The union makes the compiler ask for it exactly when it is going to be rendered.
   */
  closeLabel: string;
}

export type ModalProps = PlainModal | HeaderModal;

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-x-slot-modal-sm',
  md: 'max-w-x-slot-modal-md',
  lg: 'max-w-x-slot-modal-lg',
};

/** Bottom sheet below `sm`, ordinary dialog above it. */
const SHEET_CLASS =
  'max-sm:mt-auto max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none';

/**
 * A modal dialog built on the native `<dialog>` element.
 *
 * 🔴 Why native. Focus trapping, Esc-to-dismiss, the backdrop, and rendering above every
 * stacking context are all things the browser already does correctly. Eight ships wrote
 * their own modal, which means the fleet currently maintains eight focus traps — the single
 * hardest piece of interaction code to get right, reimplemented per product. nene-vault is
 * not one of those eight: it shipped `aria-modal="true"` on a plain element, which announces
 * "everything outside is inert" while Tab walks straight out of it (measured in production
 * 2026-08-25, #392). A dialog that lies to assistive tech is worse than one that admits it
 * is not modal.
 *
 * 🔴 `showModal()` is called imperatively rather than through the `open` attribute, because
 * only `showModal()` puts the dialog in the top layer and traps focus; setting `open`
 * renders it inline and non-modal. jsdom 25.0.1 does not implement `showModal` at all
 * (measured 2026-08-23), and neither do browsers older than the feature, so the fallback
 * sets `open` — degraded but visible, rather than a dialog that never appears.
 *
 * 🔴 Every prop added in 0.16.0 (`header`, `size`, `sheetOnMobile`, `scrollable`) defaults to
 * what the component already rendered, so a caller that passes none of them sees no change.
 * That is only true while the defaults are a copy of the previous rendering — the lesson
 * `--text-x-slot-button-sm-size` taught in #380, where "the default is harmless" held right
 * up until a consumer overrode one side of a pair.
 */
export function Modal(props: ModalProps) {
  const { open, onClose, title, size, sheetOnMobile, scrollable, children } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

  // The header names the dialog through the heading it already draws; without one there is
  // nothing on screen to point at, so the title has to be carried as a label.
  const naming = props.header ? { 'aria-labelledby': titleId } : { 'aria-label': title };

  return (
    <dialog
      ref={ref}
      {...naming}
      // The browser fires `close` for Esc as well as for close(); routing both through the
      // caller keeps `open` from drifting out of sync with what is on screen.
      onClose={onClose}
      onCancel={onClose}
      className={cx(
        // 🔴 `m-auto` is what centres a `showModal()` dialog. The UA stylesheet already says
        // `dialog { margin: auto }`, but Tailwind's preflight (`* { margin: 0 }`, author origin)
        // erases it, so on every Tailwind ship the dialog sat at (0,0) — measured in nene-vault's
        // production at 1280px, where the old hand-written modal had been at (380,119) (#417).
        // The sheet classes below (`max-sm:mt-auto max-sm:mb-0`) always assumed this margin was
        // there; saying it explicitly is the kit owning an assumption it had been borrowing.
        // jsdom does not implement `showModal`, so the position itself is a live-lane check.
        'm-auto bg-x-slot-modal-bg text-x-slot-modal-fg border border-x-slot-modal-border rounded-x-slot-modal',
        'p-x-slot-modal-pad font-sans backdrop:bg-x-slot-modal-scrim/50',
        size !== undefined && SIZE_CLASS[size],
        sheetOnMobile === true && SHEET_CLASS,
        scrollable === true && 'flex flex-col',
      )}
    >
      {props.header === true && (
        <header className="mb-x-slot-modal-header-gap flex items-start justify-between gap-x-slot-modal-header-gap">
          <h2 id={titleId} className="font-x-slot-modal-title text-x-slot-modal-title-size">
            {title}
          </h2>
          <button
            type="button"
            aria-label={props.closeLabel}
            onClick={onClose}
            className="rounded-x-slot-control text-x-slot-modal-close-fg leading-none hover:brightness-x-slot-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-x-slot-focus-ring"
          >
            {/* The kit ships no artwork (see Icon). A multiplication sign is the close control
                every product already drew by hand, and it needs no dependency. */}
            <span aria-hidden="true">&#215;</span>
          </button>
        </header>
      )}
      {scrollable === true ? <div className="min-h-0 overflow-y-auto">{children}</div> : children}
    </dialog>
  );
}
