import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
const index = readFileSync(path.join(root, 'src/index.ts'), 'utf8');

/** Component names as the package actually exports them. */
function exportedComponents(): string[] {
  const names: string[] = [];
  for (const m of index.matchAll(/export \{([^}]+)\} from '\.\/([^']+)'/g)) {
    for (const raw of m[1]!.split(',')) {
      const name = raw.trim();
      if (name === '' || name.startsWith('type ')) continue;
      if (!/^[A-Z]/.test(name) || name.includes('CLASS')) continue;
      names.push(name);
    }
  }
  return names;
}

describe('README component table', () => {
  // 🔴 The README says this table is generated from src/index.ts. A claim like that is
  // worth nothing unless something checks it — and a component list that lags the code is
  // exactly how a product writes a part that already exists. v0.1 shipped with `Stack`,
  // `Card`, `Textarea`, `Modal`, `Badge`, `LoadingState` and `ConfirmDialog` all listed
  // under "Not yet here" while several of them were, in fact, already here.
  const components = exportedComponents();

  it('finds components to check, so a broken parser cannot pass vacuously', () => {
    expect(components.length).toBeGreaterThan(15);
  });

  it('lists every exported component', () => {
    const table = readme.slice(readme.indexOf('| Group'), readme.indexOf('### Not yet here'));
    const missing = components.filter((name) => !table.includes(`\`${name}\``));
    expect(missing, `missing from the README table: ${missing.join(', ')}`).toEqual([]);
  });

  it('does not still promise a component it already ships', () => {
    const notYet = readme.slice(readme.indexOf('### Not yet here'));
    const contradictions = components.filter((name) => notYet.includes(`\`${name}\``));
    expect(
      contradictions,
      `listed as "Not yet here" but exported: ${contradictions.join(', ')}`,
    ).toEqual([]);
  });
});

describe('the @source instruction', () => {
  // 🔴 Without it Tailwind generates none of the kit's classes, and nothing goes red:
  // build, types and tests all pass (jsdom does not compute styles). #316.
  it('is in the Use section, not only in prose further down', () => {
    const use = readme.slice(readme.indexOf('## Use'), readme.indexOf('## Theming'));
    expect(use).toContain('@source');
    expect(use).toContain('@hideyukimori/nene2-ui/dist');
  });

  it('ships a probe class that the theme actually defines', () => {
    // A sentinel naming a token that does not exist would never be generated even when the
    // @source is correct — it would report failure forever, and be switched off.
    const theme = readFileSync(path.join(root, 'themes/default.css'), 'utf8');
    const probe = readFileSync(path.join(root, 'src/lib/source-probe.ts'), 'utf8');
    const cls = probe.match(/SOURCE_PROBE_CLASS = '([^']+)'/)?.[1];
    expect(cls).toBeTruthy();
    const token = cls!.replace(/^p-/, '');
    expect(theme, `--spacing-${token} missing from themes/default.css`).toContain(
      `--spacing-${token}:`,
    );
  });

  it('exports the probe, so a consumer can reference it instead of hard-coding it', () => {
    expect(index).toContain('SOURCE_PROBE_CLASS');
  });
});

describe('typography tokens', () => {
  const theme = readFileSync(path.join(root, 'themes/default.css'), 'utf8');

  it.each([
    '--color-x-slot-field-label',
    '--text-x-slot-field-label-size',
    '--font-weight-x-slot-field-label',
    '--text-x-slot-control-size',
  ])('defines %s', (token) => {
    expect(theme).toContain(`${token}:`);
  });

  it('never gives a colour and a text size the same suffix', () => {
    // 🔴 Tailwind resolves `text-<name>` against --color-* first, so a matching pair makes
    // the size unreachable while everything still compiles (verified on tailwindcss 4.3.2).
    const colours = new Set([...theme.matchAll(/--color-(x-[a-z0-9-]+):/g)].map((m) => m[1]));
    const sizes = [...theme.matchAll(/--text-(x-[a-z0-9-]+):/g)].map((m) => m[1]);
    const clash = sizes.filter((s) => colours.has(s));
    expect(clash, `colour and text-size share a suffix: ${clash.join(', ')}`).toEqual([]);
  });
});

describe('the override boundary', () => {
  it('says which tokens a product may redefine, and which it may not', () => {
    // 🔴 機構上は艦が全部上書きできる（読み込み順で勝つ）。書かないと、±2px で困った艦が
    // **善意で spacing を上書きし、9段という語彙だけ残して規律が消える**。
    const section = readme.slice(readme.indexOf('## 🔴 What a product may redefine'));
    // 片方だけだと、次の艦が反対側で迷う。両方書く。
    expect(section, 'must say slots are overridable').toMatch(/Slots — 🟢 redefine these/);
    expect(section, 'must say the scale is not').toMatch(/The scale — 🔒 do not redefine/);
    expect(section).toContain('--spacing-x-slot-card-pad');
    expect(section).toContain('--spacing-x-3xs');
    // 🔴 規則の射程を書いていないと、艦がキット本体を落とす検査を作る（vault が実際に踏んだ）。
    expect(section, 'must name the namespaces the rule covers').toMatch(/--brightness-\*/);
  });
});

describe('the two token layers', () => {
  const theme = readFileSync(path.join(root, 'themes/default.css'), 'utf8');

  function componentSources(): string[] {
    const out: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f);
        else if (/\.tsx?$/.test(f) && !/\.test\./.test(f)) out.push(f);
      }
    };
    walk(path.join(root, 'src'));
    return out;
  }

  it('every slot default is built only from scale references', () => {
    // 🔴 A slot holding `0.6875rem` would be a product-invented value living in the kit —
    // exactly the drift the scale exists to stop.
    //
    // Compositions are fine and expected: a four-sided padding slot is
    // `var(--spacing-x-xl) var(--spacing-x-md) var(--spacing-x-lg) var(--spacing-x-md)`.
    // What is not fine is any literal appearing among them. Checking it this way — rather
    // than matching one whole `var(...)` — is only possible because the kit deliberately has
    // no shorthand syntax: plain CSS `var()` composition is directly greppable, while a
    // shorthand would need an expander before it could be inspected at all.
    // Covers the namespaces that have a scale. `--brightness-*` and `--opacity-*` hold
    // literals because there is nothing to reference — stated in the README as the exception.
    const scaled = '(?:spacing|radius|text|color|font-weight)';
    const slots = [
      ...theme.matchAll(new RegExp(`--${scaled}-x-slot-[a-z0-9-]+:\\s*([^;]+);`, 'g')),
    ];
    expect(slots.length).toBeGreaterThan(30);
    for (const [, raw] of slots) {
      const value = raw!.trim();
      // 🔴 `inherit` is allowed, and only `inherit`. It is not a value the kit invented —
      // it is the kit declining to have an opinion, in a place a product can now answer.
      // `Button` and the choice controls set no font-size before 0.9.0, so any step chosen
      // here would change how every product already renders. See the theme for the case
      // that made this necessary (nene-vault: 13px buttons against a 14px body).
      if (value === 'inherit') continue;
      // The palette has no `x-` segment (`--color-accent`), the dimensional scales do
      // (`--spacing-x-md`). Both count as references.
      const refPattern =
        /var\(--(?:spacing|radius|text)-x-[a-z0-9-]+\)|var\(--(?:color|font-weight)-[a-z0-9-]+\)/g;
      expect(
        [...value.matchAll(refPattern)].length,
        `slot must reference a scale: ${value}`,
      ).toBeGreaterThan(0);
      // `max(...)` and friends are allowed to wrap references; bare lengths are not.
      const remainder = value.replace(refPattern, '').replace(/[a-z]*\(|\)|,|\s/g, '');
      expect(remainder, `slot contains a literal outside the scale: ${value}`).toBe('');
    }
  });

  /**
   * Utilities that put a design value on an element without going through a slot.
   *
   * Three kinds, deliberately built differently:
   *  - the dimensional scales, matched by their `x-` namespace (`px-x-md`);
   *  - the palette, matched by names read out of the theme, so it cannot fall behind;
   *  - bare literals for weight and size (`font-medium`, `text-sm`).
   *
   * `font-sans` is the family — one per theme, nothing to choose — and `text-center` is
   * alignment, not a design value. Neither is matched.
   */
  const palette = [
    ...readFileSync(path.join(root, 'themes/default.css'), 'utf8').matchAll(
      /--color-((?!x-)[a-z0-9-]+):/g,
    ),
  ].map((m) => m[1]!);
  const variant =
    '(?:hover:|active:|focus:|focus-visible:|disabled:|placeholder:|checked:|group-hover:)?';
  const reachPattern = new RegExp(
    [
      // ① a dimensional scale step, reached directly
      `(?<![\\w-])${variant}(?:p|px|py|pt|pb|pl|pr|gap|m|mt|mb|rounded|size|w|h|max-h|max-w|text|font|shadow)-x-(?!slot-)[a-z0-9-]+`,
      // ② a palette colour, reached directly
      `(?<![\\w-])${variant}(?:text|bg|border|accent|outline|ring|fill|stroke|decoration)-(?:${palette.join('|')})(?![a-z0-9-])`,
      // ③ a literal weight or type step
      `(?<![\\w-])${variant}font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?![a-z0-9-])`,
      `(?<![\\w-])${variant}text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![a-z0-9-])`,
    ].join('|'),
    'g',
  );

  it('no component reaches past the slots into the scale', () => {
    // 部品がスケールを直接使うと、艦はその部品だけ割り当てを変えられなくなる。
    // 例外は lib/spacing.ts（Stack/Box の gap/pad prop そのもの＝呼び出し側が選ぶ層）。
    const offenders: string[] = [];
    for (const f of componentSources()) {
      if (f.endsWith('lib/spacing.ts') || f.endsWith('lib/source-probe.ts')) continue;
      const src = readFileSync(f, 'utf8');
      // 🔴 The prefix list is the whole point of failure. Until 0.9.0 it named only the
      // spacing and radius utilities, so `text-text-primary` and `font-medium` — a colour
      // and a weight written straight into a component — were never inspected at all. The
      // rule read "every design value comes from a slot" while 59 of them did not, across
      // 20 components, and the check was green the entire time.
      // 🔑 A check written as an enumeration passes everything the enumeration omits.
      //
      // So the colour half is not enumerated here at all: the palette is READ FROM THE
      // THEME. A colour added to the palette tomorrow is covered by this check today,
      // which is the only version of it that cannot fall behind.
      for (const m of src.matchAll(reachPattern)) {
        offenders.push(`${path.relative(root, f)}: ${m[0]}`);
      }
    }
    expect(offenders, `components must use slots, not the scale directly`).toEqual([]);
  });
});

describe('the touch floor', () => {
  const theme = readFileSync(path.join(root, 'themes/default.css'), 'utf8');

  it('keeps the touch size on the iOS floor, not on a design step', () => {
    // 🔴 `max()` を外した引き換えに、フロアがスロットになった＝艦が下げられる。
    // 下げるとページごと拡大が戻るので、キットの既定が floor を指していることを固定する。
    expect(theme).toMatch(/--text-x-slot-control-touch-size:\s*var\(--text-x-ios-floor\)/);
  });

  it('says the touch slot is a device constraint, not a design choice', () => {
    const readmeSaysSo = /device constraint, not a design choice/.test(readme);
    const themeSaysSo = /device constraint, not a design choice/.test(theme);
    expect(readmeSaysSo || themeSaysSo).toBe(true);
  });
});

describe('the radius scale', () => {
  const theme = readFileSync(path.join(root, 'themes/default.css'), 'utf8');

  /**
   * Scale steps in a namespace — everything in it that is not a slot.
   *
   * The dimensional scales carry an `x-` segment (`--radius-x-md`); the colour palette
   * does not (`--color-accent`). Excluding slots rather than requiring `x-` covers both.
   */
  function steps(ns: string): Map<string, string> {
    const out = new Map<string, string>();
    for (const [, name, value] of theme.matchAll(
      new RegExp(`--(${ns}-(?!x-slot-)[a-z0-9-]+):\\s*([^;]+);`, 'g'),
    )) {
      out.set(name!, value!.trim());
    }
    return out;
  }

  it('every namespace that has slots offers more than one step to choose from', () => {
    // 🔴 This is the general form of the 0.7.0 defect, and the only test here that would
    // have caught it. Eight radius slots all pointed at `--radius-x-md` because it was the
    // only radius the kit had, so a product following the rules could render exactly one
    // rounding. Nothing failed: the slots existed, their defaults were scale references,
    // no component reached past them. Every structural check passed on a layer that could
    // not express a choice.
    //
    // 🔑 A two-layer token system needs a value, a condition and a set of options. The
    // other two were already tested; this is the third.
    const slotNamespaces = new Set(
      [...theme.matchAll(/--([a-z-]+)-x-slot-[a-z0-9-]+:/g)].map((m) => m[1]!),
    );
    expect(slotNamespaces.size).toBeGreaterThan(2);
    for (const ns of slotNamespaces) {
      // `brightness` and `opacity` hold literals by design — the README states why, and a
      // scale invented so this rule could cover them would have one real user.
      if (ns === 'brightness' || ns === 'opacity') continue;
      const distinct = new Set(steps(ns).values());
      if (distinct.size > 0) {
        expect(
          distinct.size,
          `--${ns}-x-slot-* has ${distinct.size} step(s) to choose from — a slot with one value is not a slot`,
        ).toBeGreaterThan(1);
        continue;
      }
      // The kit defines no steps in this namespace, which is fine when the scale comes from
      // Tailwind (`--font-weight-medium` and its eight siblings). What is then required is
      // that the slots defer to it: a literal would be a value invented next to a scale
      // nobody looked at. Checked by reference rather than by reading Tailwind's theme,
      // since it is a peer dependency and may not be installed beside this test.
      const defaults = [
        ...theme.matchAll(new RegExp(`--${ns}-x-slot-[a-z0-9-]+:\\s*([^;]+);`, 'g')),
      ];
      for (const [, raw] of defaults) {
        expect(
          raw!.trim(),
          `--${ns}-x-slot-* holds a literal while the kit defines no ${ns} scale — reference the one Tailwind ships`,
        ).toMatch(/^var\(--/);
      }
    }
  });

  it('keeps 0 and 2px as separate steps', () => {
    // 🔴 Not a rounding question. nene-records ships nine product themes at 0px and three
    // at 2–3px; folding 2px into 0 deletes a distinction somebody drew on purpose, and
    // "no rounding" is a whole design language rather than a tighter corner. 2px is also
    // the fleet's single most common radius (56 of 266 measured values, #348).
    const values = new Set(steps('radius').values());
    expect(values).toContain('0');
    expect(values).toContain('2px');
  });

  it('offers pill as a step of its own', () => {
    // Most-used radius in nene-field (48), present in five products (64 total). A product
    // with no rounding points its slots at `--radius-x-none` rather than redefining this.
    expect(steps('radius').get('radius-x-pill')).toBe('9999px');
  });

  it('leaves --radius-x-md where it was, so no product moves silently', () => {
    // Every slot points at it. Adding steps must not change what already renders.
    expect(steps('radius').get('radius-x-md')).toBe('0.5rem');
  });

  it('gives every step a distinct value', () => {
    // Two steps with one value is the single-step defect wearing more names.
    const all = steps('radius');
    expect(new Set(all.values()).size).toBe(all.size);
  });
});
