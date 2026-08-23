import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
