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
```

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

## What is in scope

**In:** admin console and business-screen UI, page layout scaffolding, form field structure, the
loading/empty/error state set, read-only detail displays.

**Out:** end-user-facing themes that are a _product feature_ (NeNe Records ships 30 of them —
`aurora`, `newsprint`, `noir`, `japandi`, …), public marketing and brand surfaces, domain-specific
screens (invoice previews, kanban boards, reports), and anything in the `model/` layer — data
fetching and state are governed by `@hideyukimori/nene2-standards`, not by this kit.

## Components (v0.1)

Promoted verbatim from `nene-payout`, the fleet's only conformance-violation-free product, with
one correctness fix: `className` now composes instead of replacing.

| Group        | Components                                                  |
| ------------ | ----------------------------------------------------------- |
| `primitives` | `Button` `Input` `Select` `Spinner` `Text`                  |
| `layout`     | `PageHeader`                                                |
| `forms`      | `FormField`                                                 |
| `states`     | `EmptyState` `ErrorState`                                   |
| `data`       | `DetailList`                                                |
| `theme`      | `tokens` (read-only `var()` accessors for canvas/chart use) |

`Input` and `Select` use `forwardRef`, so they drop straight into `react-hook-form`'s `register`.

### Not yet here

`Modal` `ConfirmDialog` `Toast` `Badge` `Card` `Stack` `DataTable` `Pagination` `Textarea`
`Checkbox` `Alert` `LoadingState` — all measured as recurring across ≥3 products. They land as
migrating products contribute their implementation upward, rather than being designed up front.

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
