import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx.js';
import { CLICKABLE_CLASS, TOUCH_CLASS } from '../lib/states.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The shape: which properties get painted. Not which colour they get painted in.
   *
   * 🔴 This used to be one closed enum that mixed shape and colour
   * (`primary | secondary | danger | ghost`), so "the ghost shape in the danger colour" was
   * not expressible. Five ships each invented their own name for that one missing cell, and
   * no two agreed: nene-clear `ghost-danger`, nene-field `danger-ghost` (the same thing,
   * written backwards), nene-profile `link-danger`, nene-origin `danger-outline`, and
   * nene-deal reached the same place through slots instead — it set
   * `--color-x-slot-button-danger-bg: transparent` and turned the filled danger into an
   * outlined one (#455). One need, five workarounds, because the API could not say it.
   *
   * 🔴 `bare`, not `ghost`. The old name meant "no fill, no border" here, but nene-clear's
   * `.btn-ghost` has both a background and a border — it is this kit's `outline`. The word is
   * split across the industry too (Bootstrap's ghost is an outline, Material's is a text
   * button), so a ship reading `ghost` cannot know which one it got. Renaming costs nothing:
   * neither consuming ship uses it (nene-vault 0, nene-deal 0, measured 2026-08-27).
   */
  variant?: 'solid' | 'outline' | 'bare' | 'link';
  /**
   * The colour: what the shape means. Not how loud it is.
   *
   * 🔴 The same six words `Badge` has carried since 0.17.0, in the same order, painted from
   * the same shape of slot. A tone means one thing across the kit or it means nothing.
   *
   * 🔴 The default is `accent`, not `neutral`. What 0.19.x called `primary` was never a tone
   * — it was "the accent-coloured filled button", so `<Button>` keeps rendering exactly that.
   * `neutral` is the quiet grey step, which is what `Badge` has always meant by the word.
   * Reading `neutral` as "the ordinary action" is how this kit ended up with two vocabularies
   * in the first place.
   */
  tone?: 'neutral' | 'accent' | 'danger' | 'success' | 'warn' | 'info';
  /**
   * Two sizes, not a length. `sm` for dense rows and toolbars.
   *
   * Structure, not a design value: the caller picks one of two arrangements and cannot
   * write a padding of its own (design principle 3).
   */
  size?: 'md' | 'sm';
  children: ReactNode;
}

/**
 * Shape × tone, written out.
 *
 * 🔴 Sixteen literal strings and no interpolation, because Tailwind reads the source as text.
 * `` `bg-x-slot-button-${tone}-bg` `` produces the right class at runtime and no CSS for it at
 * build time — the generator never sees the string, so the rule is never emitted. The kit has
 * to spell every combination it supports.
 *
 * 🔴 `solid` paints `-bg` + `-fg`; every other shape paints `-ink`. They are separate slots
 * because they are separate colours: on a filled danger button the text is the on-accent
 * colour, and on an outlined one it is the danger colour itself. Deriving one from the other
 * would have made the outlined button's label white on white.
 *
 * 🔴 `outline`'s background is a single slot that does not vary with tone. nene-clear's
 * outlined danger sits on the plain surface (`background: var(--surface)`) and only reaches
 * for a tinted one on hover; painting the rest a tone-tinted colour would be louder than what
 * any ship draws today.
 */
const SHAPE_TONE_CLASS: Record<
  NonNullable<ButtonProps['variant']>,
  Record<NonNullable<ButtonProps['tone']>, string>
> = {
  solid: {
    neutral: 'bg-x-slot-button-neutral-bg text-x-slot-button-neutral-fg shadow-x-slot-button-solid',
    accent: 'bg-x-slot-button-accent-bg text-x-slot-button-accent-fg shadow-x-slot-button-solid',
    danger: 'bg-x-slot-button-danger-bg text-x-slot-button-danger-fg shadow-x-slot-button-solid',
    success: 'bg-x-slot-button-success-bg text-x-slot-button-success-fg shadow-x-slot-button-solid',
    warn: 'bg-x-slot-button-warn-bg text-x-slot-button-warn-fg shadow-x-slot-button-solid',
    info: 'bg-x-slot-button-info-bg text-x-slot-button-info-fg shadow-x-slot-button-solid',
  },
  outline: {
    neutral:
      'bg-x-slot-button-outline-bg text-x-slot-button-neutral-ink border-x-slot-button-neutral-border',
    accent:
      'bg-x-slot-button-outline-bg text-x-slot-button-accent-ink border-x-slot-button-accent-border',
    danger:
      'bg-x-slot-button-outline-bg text-x-slot-button-danger-ink border-x-slot-button-danger-border',
    success:
      'bg-x-slot-button-outline-bg text-x-slot-button-success-ink border-x-slot-button-success-border',
    warn: 'bg-x-slot-button-outline-bg text-x-slot-button-warn-ink border-x-slot-button-warn-border',
    info: 'bg-x-slot-button-outline-bg text-x-slot-button-info-ink border-x-slot-button-info-border',
  },
  bare: {
    neutral: 'bg-transparent text-x-slot-button-neutral-ink',
    accent: 'bg-transparent text-x-slot-button-accent-ink',
    danger: 'bg-transparent text-x-slot-button-danger-ink',
    success: 'bg-transparent text-x-slot-button-success-ink',
    warn: 'bg-transparent text-x-slot-button-warn-ink',
    info: 'bg-transparent text-x-slot-button-info-ink',
  },
  link: {
    neutral: 'bg-transparent text-x-slot-button-neutral-ink underline-offset-4 hover:underline',
    accent: 'bg-transparent text-x-slot-button-accent-ink underline-offset-4 hover:underline',
    danger: 'bg-transparent text-x-slot-button-danger-ink underline-offset-4 hover:underline',
    success: 'bg-transparent text-x-slot-button-success-ink underline-offset-4 hover:underline',
    warn: 'bg-transparent text-x-slot-button-warn-ink underline-offset-4 hover:underline',
    info: 'bg-transparent text-x-slot-button-info-ink underline-offset-4 hover:underline',
  },
};

/**
 * 🔴 Padding and type size are separate because `link` takes one and not the other.
 *
 * A link-shaped button is a run of text inside a sentence or a table cell; padding would push
 * it off the line it belongs to. nene-clear's `.btn-link` sets `padding: 0` and
 * nene-profile's renders through a `linkbtn` class that does the same. The type size still
 * applies — it is the same two sizes as every other button.
 */
const PAD_CLASS: Record<NonNullable<ButtonProps['size']>, string> = {
  md: 'px-x-slot-button-pad-x py-x-slot-button-pad-y',
  sm: 'px-x-slot-button-sm-pad-x py-x-slot-button-sm-pad-y',
};

const TEXT_CLASS: Record<NonNullable<ButtonProps['size']>, string> = {
  md: 'text-x-slot-button-size',
  sm: 'text-x-slot-button-sm-size',
};

/**
 * `link` drops the box the other three shapes share.
 *
 * 🔴 `border-0` rather than leaving the transparent border in place: the border is there so a
 * bordered button matches an unbordered one in height, and a link has no height to match.
 * `rounded-none` for the same reason — there is no box to round.
 */
const LINK_UNBOX = 'border-0 rounded-none';

// 🔴 `inline-flex`, so the button places what is inside it. A `<button>` is `inline-block`
// by default, which leaves an icon and its label on a shared baseline rather than centred —
// visible as a half-pixel of drift on every icon button, and invisible in a diff. The kit
// already takes responsibility for the size of an `<svg>` in here (`SVG_BOUND`); taking
// responsibility for where it sits is the other half of the same job, and leaving one to the
// caller while doing the other is the asymmetry nene-vault had to work around by writing
// `inline-flex` at the call site.
//
// ⚠️ This changes rendering. A text-only button is laid out by flex rather than by inline
// flow, so it no longer sits on the surrounding text's baseline the way an inline-block does.
// Inside a paragraph that is visible; in the button rows and toolbars these are actually used
// in, it is not. `inline-flex` rather than `flex` keeps the element from claiming a line.
//
// 🔴 `border border-transparent` is load-bearing. Height comes from the padding, so the
// `secondary` variant — the only one with a visible border — would otherwise stand 2px
// taller than the others. nene-vault puts a primary and a secondary side by side in seven
// modal footers, where that shows up as a step (measured 2026-08-23); its own Button carries
// the same transparent border for the same reason.
// 🔴 `[&_svg]:max-*` bounds a raw `<svg>` child without sizing it. An svg with no width or
// height attribute lays out at the replaced-element default of 300x150; a `max-height` pulls
// it back and, because a `viewBox` gives the element an intrinsic ratio, the width follows.
// `max-width` covers the svg that has no viewBox either.
//
// 🔴 Not `[&_svg]:size-*`. That would outrank the plain `h-5 w-5` an `Icon` sets on itself
// — an arbitrary variant compiles to a descendant selector, which is more specific than a
// single class — so `<Icon size="sm">` inside a button would render at the button's size
// instead of its own. A maximum cannot collide with a height: different property, and it
// leaves anything already smaller alone.
const SVG_BOUND = '[&_svg]:max-h-x-slot-button-icon [&_svg]:max-w-x-slot-button-icon';

// 🔴 `whitespace-nowrap` is load-bearing (#501). A button's label is a command, not body
// copy: it names one action, and a wrapped command reads as two. nene-clear measured 15
// buttons wrapping on its SP layout (PC 1440x900: zero) — "督促を送信" became four lines at
// 70px, and "消込を確定" broke *inside* a word as "消込を / 確定".
//
// 🔴 CJK breaks at any character and Latin breaks at word boundaries, so fixing one is not
// evidence about the other (nene-vault, #477). `nowrap` stops both.
//
// This is the same property `Badge` got in #477. It was added there by naming the component
// rather than by deriving which components need it, so `Button` was simply not on the list —
// the third instance of that shape (#486 / #501 / #503). The inventory that would have
// caught all of them at once is a separate, larger piece of work; this line is the stanch.
const BASE_CLASS = `whitespace-nowrap rounded-x-slot-button border border-transparent inline-flex items-center justify-center gap-x-slot-button-gap font-sans font-x-slot-button ${SVG_BOUND} ${TOUCH_CLASS} ${CLICKABLE_CLASS}`;

export function Button({
  variant = 'solid',
  tone = 'accent',
  size = 'md',
  children,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const isLink = variant === 'link';
  return (
    <button
      type={type}
      className={cx(
        BASE_CLASS,
        isLink ? LINK_UNBOX : PAD_CLASS[size],
        TEXT_CLASS[size],
        SHAPE_TONE_CLASS[variant][tone],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
