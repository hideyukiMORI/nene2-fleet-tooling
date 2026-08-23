import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COLS, GAP, PAD, PAD_X, PAD_Y, resolve, type Space } from './spacing.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const themeCss = readFileSync(path.join(here, '../../themes/default.css'), 'utf8');

const SPACES: Space[] = ['none', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const TABLES = { GAP, PAD, PAD_X, PAD_Y };

describe('spacing scale', () => {
  it('covers every step in every table, at every breakpoint', () => {
    for (const [name, table] of Object.entries(TABLES)) {
      for (const space of SPACES) {
        const set = table[space];
        expect(set, `${name}.${space}`).toBeDefined();
        for (const bp of ['base', 'sm', 'md', 'lg'] as const) {
          expect(set[bp], `${name}.${space}.${bp}`).toBeTruthy();
        }
      }
    }
  });

  it('names no step numerically — `gap-x-2` is Tailwind’s own column-gap utility', () => {
    // A step called `2` would produce `gap-x-2`, which Tailwind resolves to column-gap
    // rather than to our token. The styling would look almost right, which is worse.
    for (const space of SPACES) {
      expect(Number.isNaN(Number(space)), `step "${space}" must not parse as a number`).toBe(true);
    }
  });

  it('every token a class refers to is actually defined in the theme', () => {
    // 🔴 Fail-closed: a class naming a token the theme does not define produces no CSS at
    // all, and the component silently renders unspaced. This is the check that would have
    // caught it.
    const referenced = new Set<string>();
    for (const table of Object.values(TABLES)) {
      for (const set of Object.values(table)) {
        for (const cls of Object.values(set)) {
          const token = cls
            .replace(/^[a-z-]+:/, '')
            .match(/^p[xy]?-(x-[a-z0-9-]+)$|^gap-(x-[a-z0-9-]+)$/);
          if (token) referenced.add(token[1] ?? token[2]!);
        }
      }
    }
    expect(referenced.size).toBeGreaterThan(0);
    for (const token of referenced) {
      expect(themeCss, `--spacing-${token} missing from themes/default.css`).toContain(
        `--spacing-${token}:`,
      );
    }
  });

  it('spells every class out, because Tailwind only finds what it can read', () => {
    // 🔴 This is the one failure the render tests cannot see. Rewriting a table entry as
    // `gap-x-${size}` keeps every unit test green — the component still emits the right
    // string at runtime — while Tailwind's scanner stops finding the class and generates no
    // CSS for it. The spacing silently disappears in the product, not in CI.
    // Measured (2026-08-23): degrading one of the nine gap rows to template literals drops
    // the statically visible class count from 192 to 188, with all tests still passing.
    const source = readFileSync(path.join(here, 'spacing.ts'), 'utf8');
    const tables = source
      .slice(source.indexOf('export const GAP'))
      // Comments legitimately quote class names with backticks; the tables must not.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    expect(tables.length).toBeGreaterThan(1000);
    expect(tables, 'a table value is built at runtime — Tailwind will not see it').not.toMatch(
      /[`$]/,
    );
  });

  it('keeps the v0.1 semantic names as aliases, never as second values', () => {
    // Two names holding the same literal is the drift this kit exists to prevent, so the
    // primitives that shipped in v0.1 must read their spacing through the scale.
    for (const legacy of ['x-inline-sm', 'x-inline-md', 'x-stack-sm', 'x-stack-md', 'x-stack-lg']) {
      expect(themeCss).toMatch(
        new RegExp(`--spacing-${legacy}:\\s*var\\(--spacing-x-[a-z0-9]+\\)`),
      );
    }
  });
});

describe('resolve', () => {
  it('returns nothing for an unset prop, so the class list stays clean', () => {
    expect(resolve(undefined, GAP)).toBe('');
  });

  it('takes a bare value as the base breakpoint', () => {
    expect(resolve('md', GAP)).toBe('gap-x-md');
    expect(resolve('none', PAD)).toBe('p-0');
  });

  it('emits one class per breakpoint given an object, in cascade order', () => {
    expect(resolve({ base: 'xs', sm: 'md', lg: 'xl' }, GAP)).toBe(
      'gap-x-xs sm:gap-x-md lg:gap-x-xl',
    );
  });

  it('skips breakpoints that are not given', () => {
    expect(resolve({ sm: 'sm' }, GAP)).toBe('sm:gap-x-sm');
  });

  it('resolves numeric column counts, including responsive ones', () => {
    expect(resolve(1, COLS)).toBe('grid-cols-1');
    expect(resolve({ base: 1, sm: 2 }, COLS)).toBe('grid-cols-1 sm:grid-cols-2');
  });

  it('ignores a value that is not on the scale rather than emitting a broken class', () => {
    // Callers are typed, but JS callers and stale builds exist.
    expect(resolve('4.5' as unknown as Space, GAP)).toBe('');
    expect(resolve({ base: 99 }, COLS)).toBe('');
  });
});
