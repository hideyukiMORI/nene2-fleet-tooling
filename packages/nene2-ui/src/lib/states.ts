/**
 * Interaction states shared by every control in the kit (#300).
 *
 * 🔴 Why this exists at all: v0.1 shipped `Button`, `Input` and `Select` with **no disabled
 * and no focus styling whatsoever**. The screens that used them wrote `disabled:opacity-50`
 * and `focus:ring-1` themselves — 39 times across the fleet. That was never a deviation to
 * be linted away; it was products patching a hole the kit had left open. Ban those classes
 * before filling the hole and you ship a button that is disabled but does not look it.
 *
 * 🔴 `focus-visible`, not `focus`. `:focus` also fires on a mouse click, leaving a ring
 * behind after every press — which is exactly why the fleet's screens ended up carrying
 * both `focus:` (11 uses) and `focus-visible:` (5). The kit picks one, and picks the one
 * that only shows the ring to keyboard users.
 *
 * 🔴 `outline`, not `ring`. Tailwind's `ring-*` is a box-shadow, so a parent with
 * `overflow-hidden` clips it away entirely. This kit's own `Card` does not clip — but the
 * products' existing containers do: `overflow-hidden` appears 12 times in nene-records and
 * twice each in nene-vault and nene-deal, which are the first two ships to be migrated
 * (measured 2026-08-23). `outline` is not clipped and carries its own offset.
 *
 * 🔴 The ring is `text-primary`, not `accent`. An accent ring is *the same colour as a
 * primary button* — contrast 1.00:1 against its own fill, and 1.11:1 against a danger
 * button (computed from the theme's oklch values, 2026-08-23). The offset keeps the ring
 * off the fill, so what it actually sits against is the page, and both colours clear 3:1
 * there; but a ring that disappears the moment the offset does is one layout change away
 * from being invisible. `text-primary` measures 15.55:1 against `surface`, 16.00:1 against
 * `surface-raised`, and still 3.30:1 / 2.97:1 against the accent and danger fills.
 *
 * No single colour clears 3:1 against *both* fills — accent and danger are both mid
 * luminance — which is why nene-deal moved to a two-tone box-shadow ring (#183, after a
 * 1.38:1 indicator went unnoticed because a contrast checker cannot see it). Here the
 * offset provides the second tone: fill, page-coloured gap, dark ring, page.
 *
 * 🔴 `outline-offset` is therefore load-bearing, not decoration. Do not set it to 0.
 */

/** Keyboard focus indicator. Colour comes from the theme, never from a caller. */
export const FOCUS_CLASS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary';

/**
 * Disabled appearance. The opacity is a theme token (`--opacity-x-disabled`) because a
 * literal here would be a design value living outside themes/default.css.
 */
export const DISABLED_CLASS = 'disabled:opacity-x-disabled disabled:cursor-not-allowed';

/** Controls that can be focused and disabled — every interactive primitive in the kit. */
export const CONTROL_CLASS = `${FOCUS_CLASS} ${DISABLED_CLASS}`;
