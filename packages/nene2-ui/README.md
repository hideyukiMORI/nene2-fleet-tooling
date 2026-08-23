# @hideyukimori/nene2-ui

Shared React UI kit for the NeNe fleet. **Components carry no design of their own — themes do.**

## Why this exists

The fleet already had design **tokens** (`@hideyukimori/nene2-tokens`) and a **conformance
checker** (`@hideyukimori/nene2-standards`) — but no box to ship the actual parts in. So every
product wrote its own, and consistency was chased afterwards by counting violations.

Measured across the 13 product frontends on 2026-08-23:

| Component    | Independent implementations |
| ------------ | --------------------------: |
| `Button`     |                      **20** |
| `Input`      |                          17 |
| `Select`     |                          16 |
| `EmptyState` |                          15 |
| `Text`       |                          14 |
| `Stack`      |                          12 |

Of the **266** files in the fleet's `shared/ui` directories, **74% share a name with at least one
other product**. The designs had already converged — only the execution was scattered N ways.

🔑 **Enforcing consistency by inspection scales with the number of deviations, which has no upper
bound. Providing the parts scales with the number of screens, which is finite.**

## Design principles

1. **Pass native props through.** Every primitive extends its element's HTML attributes, so there
   is nothing new to learn and nothing that quietly breaks accessibility.
2. **`className` composes, never replaces.** Caller classes are appended last via `cx`, so
   Tailwind's later-wins cascade makes them an escape hatch rather than a footgun.
3. **No colour, spacing or radius props.** `<Button color="#f00">` does not exist. If a variant
   cannot express it, add a variant — for everyone. _This is the principle that matters:_ the
   13,021 style violations the fleet is currently remediating exist because values could be
   written inline. Make them unwritable and there is nothing to inspect.
4. **No strings.** The kit ships no user-visible text. `Spinner` takes `label`, `ErrorState` takes
   `retryLabel`. Localisation stays with the product (`@hideyukimori/nene2-i18n`), so a wording
   change never becomes a kit release.
5. **The three states ship together.** `LoadingState` / `EmptyState` / `ErrorState` exist as a set
   so a screen that handles only the happy path is visibly incomplete.

## Install

```bash
npm i @hideyukimori/nene2-ui
```

Peer dependencies: `react >= 19`, `tailwindcss >= 4`.

## Use

```css
/* src/shared/ui/theme/index.css */
@import 'tailwindcss';
@import '@hideyukimori/nene2-ui/themes/default.css';

/* 🔴 Required. Adjust the relative path to reach your node_modules. */
@source '../../../../node_modules/@hideyukimori/nene2-ui/dist';
```

### 🔴 The `@source` line is not optional

Tailwind v4 discovers classes by scanning your source files, and **it does not walk
`node_modules`**. Every class this kit ships lives in its `dist/`, so without that line
Tailwind never sees them and **generates none of them**.

Nothing goes red when this happens. Measured by nene-vault on 2026-08-23 in a real
application: the build passed with no warning, the types passed, **all 275 tests passed**,
and the stylesheet came out 47.1 KB instead of 58.6 KB — with every `gap-*`, `rounded-*`,
focus ring and disabled treatment missing. The tell was that `p-x-lg`, the _same token_
written in the app's own `.tsx`, was generated. The only difference is which directory the
file sits in.

A test suite cannot catch it either: jsdom does not compute styles. On screen the symptom is
simply "the kit does not seem to do anything".

### Proving it, so nobody has to remember

The kit exports a class that exists nowhere except its own `dist`. If your build generates
it, the kit is in your `@source`; if not, every class the kit ships was dropped. Check it
where you already check other things:

```js
import { SOURCE_PROBE_CLASS } from '@hideyukimori/nene2-ui';
import { readFileSync } from 'node:fs';

const css = readFileSync('dist/assets/index.css', 'utf8');
if (!css.includes(`.${SOURCE_PROBE_CLASS}`)) {
  throw new Error('nene2-ui is not in Tailwind @source — none of its classes were generated');
}
```

The probe resolves to `padding: 0px`, so it changes nothing if it is ever applied.

```tsx
import { PageHeader, Button, FormField, Input, EmptyState } from '@hideyukimori/nene2-ui';

export function InvoiceListPage({ t, invoices }) {
  return (
    <>
      <PageHeader title={t('invoices.title')} actions={<Button>{t('invoices.new')}</Button>} />
      {invoices.length === 0 ? (
        <EmptyState message={t('invoices.empty')} />
      ) : (
        <InvoiceTable rows={invoices} />
      )}
    </>
  );
}
```

## Theming

Components reference Tailwind utilities derived from `@theme` custom properties. A theme is one
CSS file of ~20 lines, and it is the **only** place a design value may appear.

```
tokens contract ──themegen──▶ themes/<name>.css  (@theme block)
                                    │
                     product's active.css imports exactly one
```

To rebrand, replace the theme file. **Never edit a component.** This is what makes adopting the
kit reversible: the look is 20 lines away from being something else.

Regenerate a theme from the token contract with:

```bash
npx @hideyukimori/nene2-tokens themegen
```

## 🔴 What a product may redefine, and what it may not

Everything in `themes/default.css` is _technically_ overridable — a product's own `@theme`
loads after the kit's and wins. That is not the same as being free to override it.

|                        |                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢 **Redefine freely** | **Colour, typography, radius, shadow.** These are your brand. `--color-accent`, `--color-x-label`, `--text-x-label-size`, `--font-weight-x-label`, `--radius-x-md` … |
| 🔴 **Do not redefine** | **The spacing scale** (`--spacing-x-3xs` … `--spacing-x-2xl`).                                                                                                       |

### Why spacing is different

The nine steps are not a suggestion; they are the thing the kit is for. A product that
retunes them to match what it wrote before keeps the vocabulary and loses the rule — nine
names, nine different meanings per product, and no way to say a screen is consistent.

The temptation is real: after migrating, some spacing shifts by up to 2px. That shift is the
point. Measured in nene-vault before its migration, 128 spacing utilities used **19 distinct
values**, five of which appeared exactly once. That is drift, not design, and snapping it is
the correction — not a regression to be tuned away.

Retuning also makes the fit worse, not better (measured across those 128 uses):

| scale                           | exact match | within 2px |  worst case |
| ------------------------------- | ----------: | ---------: | ----------: |
| **the kit's nine**              |         47% |    **99%** |     **4px** |
| nine chosen to fit this product |         84% |        95% | 🔴 **24px** |

More exact matches, five times the worst error — because a scale bent toward one product's
histogram drops the ends.

🔑 **The kit holds the set you keep to. Your theme holds what your brand looks like.**

If a screen genuinely cannot be expressed on the scale, that is a missing step or a missing
component — open an issue rather than editing the token, so every product gets the answer.

## What is in scope

**In:** admin console and business-screen UI, page layout scaffolding, form field structure, the
loading/empty/error state set, read-only detail displays.

**Out:** end-user-facing themes that are a _product feature_ (NeNe Records ships 30 of them —
`aurora`, `newsprint`, `noir`, `japandi`, …), public marketing and brand surfaces, domain-specific
screens (invoice previews, kanban boards, reports), and anything in the `model/` layer — data
fetching and state are governed by `@hideyukimori/nene2-standards`, not by this kit.

## Components

🔴 **This table is generated from `src/index.ts`.** Regenerate it when you add a component —
a component list that lags the code is how a product ends up writing a part that already exists.

| Group        | Components                                                                               |
| ------------ | ---------------------------------------------------------------------------------------- |
| `primitives` | `Button` `Input` `Select` `Spinner` `Text` `Textarea` `Icon` `Checkbox` `Radio` `Switch` |
| `layout`     | `PageHeader` `Stack` `Grid` `Box` `Section` `Card`                                       |
| `forms`      | `FormField`                                                                              |
| `states`     | `LoadingState` `EmptyState` `ErrorState`                                                 |
| `overlay`    | `Modal` `ConfirmDialog`                                                                  |
| `feedback`   | `Badge` `InlineAlert` `ToastProvider`                                                    |
| `data`       | `DetailList` `DataTable` `Pagination`                                                    |
| `theme`      | `tokens` (read-only `var()` accessors for canvas/chart use)                              |

`Input`, `Select` and `Textarea` use `forwardRef`, so they drop straight into
`react-hook-form`'s `register`, and pick up their `id` / `aria-describedby` from the
`FormField` around them.

### Not yet here

`BrandMark` — measured as recurring
across ≥3 products. They land as migrating products contribute their implementation upward,
rather than being designed up front.

Until one lands, a product writing its own control can import `CONTROL_CLASS` so that at least
the focus ring and the disabled treatment match the rest of the kit. **What each product imports
it for is the measured list of what the kit is still missing.**

## Contributing a component

The kit grows by **promotion, not invention**. If a screen needs something the kit lacks:

1. Build it in that product's `shared/ui` first, against tokens only.
2. When a second product needs the same thing, promote it here — the second use is the evidence.
3. Open an issue if a variant is missing. **Do not special-case it in the screen**; one exception
   granted is the moment the kit stops meaning anything.

## Development

```bash
npm ci
npm run check    # type-check + format:check + test
```

## License

MIT © hideyuki MORI
