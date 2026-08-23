/**
 * The kit's spacing scale — the single set of spacing values a caller may choose from.
 *
 * 🔴 Design principle 3: components take no spacing *values*, only names from this scale.
 * `<Stack gap={4.5}>` does not exist, on purpose. Once a number can be written, it will be
 * nudged, and the fleet is back to counting deviations.
 *
 * Why nine steps, and why these nine — measured, not guessed (2026-08-23, #298):
 * across 944 spacing utilities written by hand in the fleet's screens, snapping every one
 * onto this scale moves 98.2% of them by 2px or less, and 99.7% by 4px or less.
 * The fleet currently writes those 944 uses with 153 distinct classes; this is nine.
 *
 * 🔴 Every class below is written out in full. Tailwind finds utilities by scanning source
 * text, so a class assembled at runtime (`gap-x-${size}`) is never generated. Do not
 * "simplify" these tables into template literals — the styles would silently disappear.
 *
 * 🔴 Do not name a step something numeric (`x-2`). `gap-x-2` is Tailwind's own column-gap
 * utility and would win; `gap-x-2xs` is unambiguous because `2xs` is not a number
 * (verified against tailwindcss 4.3.2).
 */
export type Space = 'none' | '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Breakpoint-keyed value. Mobile-first: `base` applies until the next key takes over. */
export type Responsive<T> = T | { base?: T; sm?: T; md?: T; lg?: T };

type ClassSet = { base: string; sm: string; md: string; lg: string };

/**
 * Resolve a responsive prop against one of the tables below.
 * Returns a class string; an undefined value contributes nothing.
 */
export function resolve<T extends string | number>(
  value: Responsive<T> | undefined,
  table: Record<string, ClassSet>,
): string {
  if (value === undefined) return '';
  if (typeof value !== 'object') return table[String(value)]?.base ?? '';
  return (['base', 'sm', 'md', 'lg'] as const)
    .map((bp) => {
      const v = value[bp];
      return v === undefined ? '' : (table[String(v)]?.[bp] ?? '');
    })
    .filter(Boolean)
    .join(' ');
}

/** `gap` on a flex or grid container. */
export const GAP: Record<Space, ClassSet> = {
  none: { base: 'gap-0', sm: 'sm:gap-0', md: 'md:gap-0', lg: 'lg:gap-0' },
  '3xs': { base: 'gap-x-3xs', sm: 'sm:gap-x-3xs', md: 'md:gap-x-3xs', lg: 'lg:gap-x-3xs' },
  '2xs': { base: 'gap-x-2xs', sm: 'sm:gap-x-2xs', md: 'md:gap-x-2xs', lg: 'lg:gap-x-2xs' },
  xs: { base: 'gap-x-xs', sm: 'sm:gap-x-xs', md: 'md:gap-x-xs', lg: 'lg:gap-x-xs' },
  sm: { base: 'gap-x-sm', sm: 'sm:gap-x-sm', md: 'md:gap-x-sm', lg: 'lg:gap-x-sm' },
  md: { base: 'gap-x-md', sm: 'sm:gap-x-md', md: 'md:gap-x-md', lg: 'lg:gap-x-md' },
  lg: { base: 'gap-x-lg', sm: 'sm:gap-x-lg', md: 'md:gap-x-lg', lg: 'lg:gap-x-lg' },
  xl: { base: 'gap-x-xl', sm: 'sm:gap-x-xl', md: 'md:gap-x-xl', lg: 'lg:gap-x-xl' },
  '2xl': { base: 'gap-x-2xl', sm: 'sm:gap-x-2xl', md: 'md:gap-x-2xl', lg: 'lg:gap-x-2xl' },
};

/** Padding on all four sides. */
export const PAD: Record<Space, ClassSet> = {
  none: { base: 'p-0', sm: 'sm:p-0', md: 'md:p-0', lg: 'lg:p-0' },
  '3xs': { base: 'p-x-3xs', sm: 'sm:p-x-3xs', md: 'md:p-x-3xs', lg: 'lg:p-x-3xs' },
  '2xs': { base: 'p-x-2xs', sm: 'sm:p-x-2xs', md: 'md:p-x-2xs', lg: 'lg:p-x-2xs' },
  xs: { base: 'p-x-xs', sm: 'sm:p-x-xs', md: 'md:p-x-xs', lg: 'lg:p-x-xs' },
  sm: { base: 'p-x-sm', sm: 'sm:p-x-sm', md: 'md:p-x-sm', lg: 'lg:p-x-sm' },
  md: { base: 'p-x-md', sm: 'sm:p-x-md', md: 'md:p-x-md', lg: 'lg:p-x-md' },
  lg: { base: 'p-x-lg', sm: 'sm:p-x-lg', md: 'md:p-x-lg', lg: 'lg:p-x-lg' },
  xl: { base: 'p-x-xl', sm: 'sm:p-x-xl', md: 'md:p-x-xl', lg: 'lg:p-x-xl' },
  '2xl': { base: 'p-x-2xl', sm: 'sm:p-x-2xl', md: 'md:p-x-2xl', lg: 'lg:p-x-2xl' },
};

/** Inline (left/right) padding. */
export const PAD_X: Record<Space, ClassSet> = {
  none: { base: 'px-0', sm: 'sm:px-0', md: 'md:px-0', lg: 'lg:px-0' },
  '3xs': { base: 'px-x-3xs', sm: 'sm:px-x-3xs', md: 'md:px-x-3xs', lg: 'lg:px-x-3xs' },
  '2xs': { base: 'px-x-2xs', sm: 'sm:px-x-2xs', md: 'md:px-x-2xs', lg: 'lg:px-x-2xs' },
  xs: { base: 'px-x-xs', sm: 'sm:px-x-xs', md: 'md:px-x-xs', lg: 'lg:px-x-xs' },
  sm: { base: 'px-x-sm', sm: 'sm:px-x-sm', md: 'md:px-x-sm', lg: 'lg:px-x-sm' },
  md: { base: 'px-x-md', sm: 'sm:px-x-md', md: 'md:px-x-md', lg: 'lg:px-x-md' },
  lg: { base: 'px-x-lg', sm: 'sm:px-x-lg', md: 'md:px-x-lg', lg: 'lg:px-x-lg' },
  xl: { base: 'px-x-xl', sm: 'sm:px-x-xl', md: 'md:px-x-xl', lg: 'lg:px-x-xl' },
  '2xl': { base: 'px-x-2xl', sm: 'sm:px-x-2xl', md: 'md:px-x-2xl', lg: 'lg:px-x-2xl' },
};

/** Block (top/bottom) padding. */
export const PAD_Y: Record<Space, ClassSet> = {
  none: { base: 'py-0', sm: 'sm:py-0', md: 'md:py-0', lg: 'lg:py-0' },
  '3xs': { base: 'py-x-3xs', sm: 'sm:py-x-3xs', md: 'md:py-x-3xs', lg: 'lg:py-x-3xs' },
  '2xs': { base: 'py-x-2xs', sm: 'sm:py-x-2xs', md: 'md:py-x-2xs', lg: 'lg:py-x-2xs' },
  xs: { base: 'py-x-xs', sm: 'sm:py-x-xs', md: 'md:py-x-xs', lg: 'lg:py-x-xs' },
  sm: { base: 'py-x-sm', sm: 'sm:py-x-sm', md: 'md:py-x-sm', lg: 'lg:py-x-sm' },
  md: { base: 'py-x-md', sm: 'sm:py-x-md', md: 'md:py-x-md', lg: 'lg:py-x-md' },
  lg: { base: 'py-x-lg', sm: 'sm:py-x-lg', md: 'md:py-x-lg', lg: 'lg:py-x-lg' },
  xl: { base: 'py-x-xl', sm: 'sm:py-x-xl', md: 'md:py-x-xl', lg: 'lg:py-x-xl' },
  '2xl': { base: 'py-x-2xl', sm: 'sm:py-x-2xl', md: 'md:py-x-2xl', lg: 'lg:py-x-2xl' },
};

/**
 * Grid column counts. 1–12 rather than only the six the fleet currently uses
 * (1, 2, 3, 4, 5, 7), because a column count is a structural fact about a layout,
 * not a design value — capping it would only push callers back to `grid-cols-*`.
 */
export const COLS: Record<number, ClassSet> = {
  1: { base: 'grid-cols-1', sm: 'sm:grid-cols-1', md: 'md:grid-cols-1', lg: 'lg:grid-cols-1' },
  2: { base: 'grid-cols-2', sm: 'sm:grid-cols-2', md: 'md:grid-cols-2', lg: 'lg:grid-cols-2' },
  3: { base: 'grid-cols-3', sm: 'sm:grid-cols-3', md: 'md:grid-cols-3', lg: 'lg:grid-cols-3' },
  4: { base: 'grid-cols-4', sm: 'sm:grid-cols-4', md: 'md:grid-cols-4', lg: 'lg:grid-cols-4' },
  5: { base: 'grid-cols-5', sm: 'sm:grid-cols-5', md: 'md:grid-cols-5', lg: 'lg:grid-cols-5' },
  6: { base: 'grid-cols-6', sm: 'sm:grid-cols-6', md: 'md:grid-cols-6', lg: 'lg:grid-cols-6' },
  7: { base: 'grid-cols-7', sm: 'sm:grid-cols-7', md: 'md:grid-cols-7', lg: 'lg:grid-cols-7' },
  8: { base: 'grid-cols-8', sm: 'sm:grid-cols-8', md: 'md:grid-cols-8', lg: 'lg:grid-cols-8' },
  9: { base: 'grid-cols-9', sm: 'sm:grid-cols-9', md: 'md:grid-cols-9', lg: 'lg:grid-cols-9' },
  10: { base: 'grid-cols-10', sm: 'sm:grid-cols-10', md: 'md:grid-cols-10', lg: 'lg:grid-cols-10' },
  11: { base: 'grid-cols-11', sm: 'sm:grid-cols-11', md: 'md:grid-cols-11', lg: 'lg:grid-cols-11' },
  12: { base: 'grid-cols-12', sm: 'sm:grid-cols-12', md: 'md:grid-cols-12', lg: 'lg:grid-cols-12' },
};
