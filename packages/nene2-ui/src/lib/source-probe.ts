/**
 * A class that exists only inside this package's build output.
 *
 * 🔴 Why a consumer needs it. Tailwind v4's automatic content detection does not walk
 * `node_modules`, and every class this kit ships lives in `dist/**` — so an app that
 * imports the theme but does not add the kit to its `@source` generates **none** of them.
 * Measured by nene-vault on 2026-08-23 against `origin/main` `e566a83`: the build was
 * green, the types were green, all 275 tests passed, and the CSS was 47.1 KB instead of
 * 58.6 KB with every `gap-*`, `rounded-*`, focus and disabled class missing. The decisive
 * detail is that `p-x-lg` — the same token, written in the app's own tsx — was generated.
 * The difference is only whether the file lives under `node_modules`.
 *
 * Nothing in that failure is visible: jsdom does not compute styles, so a test suite cannot
 * see it, and the symptom on screen is "the kit does not seem to do anything".
 *
 * So the kit ships a sentinel instead of relying on the README being read:
 *
 * ```js
 * import { SOURCE_PROBE_CLASS } from '@hideyukimori/nene2-ui';
 * const css = readFileSync('dist/assets/index.css', 'utf8');
 * if (!css.includes(`.${SOURCE_PROBE_CLASS}`)) {
 *   throw new Error('nene2-ui is not in Tailwind @source — its classes were not generated');
 * }
 * ```
 *
 * The utility resolves to `padding: 0px`, so it is inert if anyone ever applies it.
 */
export const SOURCE_PROBE_CLASS = 'p-x-source-probe';
