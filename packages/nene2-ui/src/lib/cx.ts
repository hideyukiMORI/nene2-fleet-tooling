/**
 * Merge the kit's own classes with a caller-supplied `className`.
 *
 * 🔴 Why this exists: spreading `{...rest}` after setting `className` lets a caller's
 * className *replace* the component's styling entirely, silently un-theming the element.
 * Every component in this kit must compose through `cx` instead.
 *
 * The caller's classes come last so Tailwind's later-wins cascade lets them override,
 * which is the intended escape hatch (design principle 2). What is not allowed is
 * accepting colour/spacing/radius as *props* — see README "Design principles".
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}
