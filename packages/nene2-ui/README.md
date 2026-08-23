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

The theme has two layers, and the line between them is the point.

### ② Slots — 🟢 redefine these

Every design value a component uses comes from a slot, and slots are named per component:

```css
/* your product's theme, loaded after the kit's */
@theme {
  --spacing-x-slot-card-pad: var(--spacing-x-lg); /* roomier cards, everywhere */
  --color-x-slot-field-label: var(--color-text-primary); /* darker field labels */
  --radius-x-slot-control: var(--radius-x-md);
}
```

This is where your product decides how it looks. Change a slot and every instance of that
component follows.

### ① The scale — 🔒 do not redefine

`--spacing-x-3xs` … `--spacing-x-2xl`, `--radius-x-none` … `--radius-x-3xl` plus
`--radius-x-pill`, `--text-x-2xs` … `--text-x-xl`, and the colour palette.

🔴 **A namespace with one step has no slots, only aliases.** Until 0.8.0 the radius
namespace held a single value and eight slots pointed at it, so a product following the
rules could render exactly one rounding — and every structural check passed, because the
slots existed and their defaults referenced the scale. The scale had been promoted verbatim
from the one product with the fewest conformance violations, which turned out to be the
product with the fewest choices. **A component implementation may come from one ship; the
set of choices may only come from the fleet's distribution.**

```css
--spacing-x-slot-card-pad: 1.375rem; /* 🔴 no */
--spacing-x-md: 1.375rem; /* 🔴 no */
```

**A slot chooses a step; it may not invent one.** That is the whole mechanism: a product can
make its cards roomier, and cannot end up with `2.25` again.

### Why the scale is locked

Measured in nene-vault before its migration: **128 spacing utilities using 19 distinct
values**, five of which appeared exactly once. That is drift, not design. Retuning the scale
to match it also fits _worse_, not better:

| scale                           | exact match | within 2px |  worst case |
| ------------------------------- | ----------: | ---------: | ----------: |
| **the kit's nine**              |         47% |    **99%** |     **4px** |
| nine chosen to fit this product |         84% |        95% | 🔴 **24px** |

More exact matches, five times the worst error — a scale bent toward one histogram drops its
own ends.

The radius scale was measured the same way, across the 266 radius values ten products apply
(2026-08-23). Candidates were scored on a second axis as well: whether two values that exist
**by design** land on the same step. Average error alone would have accepted folding `2px`
into `0`, because 2px is a 2px error — but nene-records ships nine themes at 0px and three at
2–3px as separate product themes, so that error deletes a distinction rather than rounding
one.

| radius scale                | exact match | within 2px | designed values collapsed |
| --------------------------- | ----------: | ---------: | ------------------------: |
| **the kit's nine + pill**   |   **69.9%** |  **97.7%** |          **3** (all 1px apart) |
| eight, without a `10px` step |       64.3% |      97.7% |                         4 |
| seven, without `2px`        |       43.2% |      97.7% |                         4 |

🔑 **A scale is judged by what it can still tell apart, not only by how far it moves things.**

🔑 **The scale is the set you keep to. The slots are what your brand looks like.**

### 🔴 One slot is not yours to tune

`--text-x-slot-control-touch-size` is a **device constraint, not a design choice**. iOS Safari
zooms the whole page when a focused control is under 16px, so lowering this brings that back.

It is a slot at all only because the kit cannot know your rem base — not because the value is
open. Set `--text-x-slot-control-size` to whatever suits your body text; leave the touch one
pointing at `--text-x-ios-floor`.

Until 0.7.0 the kit wrote this as `max(var(--text-x-md), var(--text-x-ios-floor))`, which is
the same idea expressed in a way that cannot work: `max()` picks the larger number and cannot
ask what kind of device it is on, so every desktop control was pushed to 16px too — visibly
larger than the text beside it in any product whose body is 14px. The two slots split that
into "the size you chose" and "the floor the device imposes", and the components apply the
second only under `@media (pointer: coarse)`.

🔑 **Pointer, not width.** An iPad in landscape is wide and still zooms.

### Composing a slot

A slot can hold several steps — four-sided padding is just CSS:

```css
--spacing-x-slot-login-form-pad: var(--spacing-x-xl) var(--spacing-x-md) var(--spacing-x-lg)
  var(--spacing-x-md);
```

🔴 **There is no shorthand for this, on purpose.** The kit's tokens are written by tooling,
not typed by hand, so brevity buys nothing — and a shorthand would need an expander, which is
one more layer that can quietly drop meaning. Plain `var()` composition has no such layer, and
it can be checked with a regular expression exactly as written.

### What the rule covers

| namespace                             | slot values                  | why                                                                                                                                                                                   |
| ------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--spacing-*` `--radius-*` `--text-*` | 🔒 **scale references only** | each has a scale, so a literal here is a step the product invented                                                                                                                    |
| `--color-*`                           | scale (palette) references   | same                                                                                                                                                                                  |
| `--brightness-*` `--opacity-*`        | literals are fine            | **there is no scale to reference.** A hover darkening of 95% is not a step in a series; inventing a "brightness scale" so the rule could cover it would be a scale with one real user |

🔴 **Check the three namespaces that have scales, not every slot.** Until 0.6.0 this section
said "and nothing else", while the kit's own theme held `--text-x-slot-field-label-size:
0.75rem` and `--brightness-x-slot-hover: 95%` — so a product implementing the rule as written
built a check that failed the kit (nene-vault did exactly that, 2026-08-23). The type scale
now exists and the text slots reference it; brightness is stated as the exception it always
was.

That check is what keeps the scale from leaking. `--spacing-x-slot-field-gap: 0.5625rem`
compiles, looks reasonable, and reintroduces the drift the scale exists to stop — so it fails
here, including when it is hidden among three legitimate references in a composition.

### Both halves are enforced

A slot whose default contains a literal, or a component that reaches past the slots into the
scale, fails the test suite. If a screen cannot be expressed this way, it is a missing slot or
a missing component — open an issue, so every product gets the answer.

**Products: apply the same check to your own theme.** The kit can only police its own file;
the rule is the same one, and the regular expression above is the whole implementation.

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
