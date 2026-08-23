import type { ReactNode, SVGProps } from 'react';
import { cx } from '../lib/cx.js';

type IconSize = 'sm' | 'md' | 'lg';

interface IconBase extends Omit<SVGProps<SVGSVGElement>, 'children' | 'aria-label'> {
  /** The `<path>`, `<circle>`… of a 24×24 icon. The kit ships no artwork. */
  children: ReactNode;
  size?: IconSize;
}

interface MeaningfulIcon extends IconBase {
  /** Localized name. Present when the icon carries meaning of its own. */
  label: string;
  decorative?: never;
}

interface DecorativeIcon extends IconBase {
  /** The icon repeats something already in text, so it is hidden from assistive tech. */
  decorative: true;
  label?: never;
}

export type IconProps = MeaningfulIcon | DecorativeIcon;

const SIZE_CLASS: Record<IconSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * The semantics around an icon — not the icon.
 *
 * 🔴 The kit ships no artwork and takes on no icon library, because the fleet has none:
 * across all ten products the dependency count for lucide / heroicons / feather / phosphor
 * / tabler is zero, and every icon is an inline `<svg>` (222 of them, measured 2026-08-23).
 * Choosing a set would mean adding a dependency to seventeen ships to solve a problem they
 * do not have.
 *
 * 🔴 What is not consistent is the meaning. Of those 222, **101 declare neither
 * `aria-hidden` nor `role="img"`** — they do not say whether they are decoration or
 * content, so assistive technology is left to guess, and the page looks entirely correct
 * either way. Three carry `role="img"`; none carries a `<title>`.
 *
 * So `label` and `decorative` are mutually exclusive and one of them is required, enforced
 * by the type. An icon that can be rendered without saying which it is would reproduce the
 * 101 exactly.
 */
export function Icon({ children, size = 'md', className, ...rest }: IconProps) {
  const { label, ...svgProps } = rest as {
    label?: string;
  } & SVGProps<SVGSVGElement>;
  delete (svgProps as { decorative?: unknown }).decorative;

  // 🔴 Falls back to decoration, not to `role="img"`. A JS caller or a stale build can reach
  // here with neither prop, and a nameless `role="img"` is worse than silence: assistive
  // technology announces "image" and stops. An empty string counts as missing too — that is
  // what an unresolved translation key looks like at runtime.
  const decorative = label === undefined || label === '';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={cx(SIZE_CLASS[size], 'shrink-0', className)}
      {...(decorative
        ? { 'aria-hidden': true, focusable: false }
        : { role: 'img', 'aria-label': label })}
      {...svgProps}
    >
      {children}
    </svg>
  );
}
