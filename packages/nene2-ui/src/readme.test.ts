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

  it('every slot default points at the scale, never at a literal', () => {
    // 🔴 A slot holding `0.6875rem` would be a product-invented value living in the kit —
    // exactly the drift the scale exists to stop.
    const slots = [...theme.matchAll(/--(?:spacing|radius)-x-slot-[a-z0-9-]+:\s*([^;]+);/g)];
    expect(slots.length).toBeGreaterThan(20);
    for (const [, value] of slots) {
      expect(value!.trim(), 'slot defaults must reference the scale').toMatch(
        /^var\(--(spacing|radius)-x-[a-z0-9-]+\)$/,
      );
    }
  });

  it('no component reaches past the slots into the scale', () => {
    // 部品がスケールを直接使うと、艦はその部品だけ割り当てを変えられなくなる。
    // 例外は lib/spacing.ts（Stack/Box の gap/pad prop そのもの＝呼び出し側が選ぶ層）。
    const offenders: string[] = [];
    for (const f of componentSources()) {
      if (f.endsWith('lib/spacing.ts') || f.endsWith('lib/source-probe.ts')) continue;
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(
        /(?<![\w-])(?:p|px|py|pt|pb|pl|pr|gap|m|mt|mb|rounded)-x-(?!slot-)[a-z0-9-]+/g,
      )) {
        offenders.push(`${path.relative(root, f)}: ${m[0]}`);
      }
    }
    expect(offenders, `components must use slots, not the scale directly`).toEqual([]);
  });
});
