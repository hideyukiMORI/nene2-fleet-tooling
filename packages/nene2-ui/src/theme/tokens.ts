/**
 * Read-only TS accessors for theme tokens, for programmatic use such as charts where a
 * CSS class cannot be applied.
 *
 * 🔴 These are `var()` references, never literal values — the CSS `@theme` block stays
 * the single source of truth. Adding a literal here creates a second source that drifts.
 */
export const tokens = {
  color: {
    accent: 'var(--color-accent)',
    danger: 'var(--color-danger)',
    surface: 'var(--color-surface)',
    surfaceRaised: 'var(--color-surface-raised)',
    border: 'var(--color-border)',
    textPrimary: 'var(--color-text-primary)',
    textMuted: 'var(--color-text-muted)',
    onAccent: 'var(--color-on-accent)',
  },
} as const;
