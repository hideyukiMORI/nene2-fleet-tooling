import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import jscodeshift from 'jscodeshift';
import { describe, expect, it } from 'vitest';
import { buildPlan, buildRenameIndex } from './codemod.js';
import transform, { applyToSource, applyToSourceDetailed } from './codemod-transform.js';

const j = jscodeshift.withParser('tsx');

const payoutBefore = readFileSync(
  fileURLToPath(new URL('./__fixtures__/payout-w1-before.css', import.meta.url)),
  'utf8',
);
const index = buildRenameIndex(buildPlan(payoutBefore, 'common'));

const run = (source: string): string | undefined => applyToSource(source, j, index);

describe('codemod transform — payout#159 現物の行を再現する', () => {
  it('rewrites a非-JSX class string (payout: `const base = …`)', () => {
    // 実際の payout diff の 1 行そのもの。className 属性に限定すると取り漏らす現物。
    const src = `const base = 'block rounded-md px-inline-md py-stack-sm font-sans text-body'\n`;
    expect(run(src)).toBe(
      `const base = 'block rounded-x-md px-x-inline-md py-x-stack-sm font-sans text-body'\n`,
    );
  });

  it('rewrites className attributes (payout: AppLayout header)', () => {
    const src = `<header className="flex items-center justify-between border-b border-border px-inline-md py-stack-sm">x</header>;\n`;
    expect(run(src)).toBe(
      `<header className="flex items-center justify-between border-b border-border px-x-inline-md py-x-stack-sm">x</header>;\n`,
    );
  });

  it('rewrites the accent-contrast button (payout: text-accent-contrast → text-on-accent)', () => {
    const src = `<button className="rounded-md bg-accent px-inline-md py-stack-sm font-sans text-body font-medium text-accent-contrast">go</button>;\n`;
    expect(run(src)).toBe(
      `<button className="rounded-x-md bg-accent px-x-inline-md py-x-stack-sm font-sans text-body font-medium text-on-accent">go</button>;\n`,
    );
  });

  it('does not double-replace gap-inline-sm (payout 35件誤置換の回帰)', () => {
    const src = `<div className="flex items-center gap-inline-sm">x</div>;\n`;
    const out = run(src);
    expect(out).toBe(`<div className="flex items-center gap-x-inline-sm">x</div>;\n`);
    expect(out).not.toContain('gap-x-x-');
  });
});

describe('codemod transform — 出力の非破壊性（splice 方式の根拠）', () => {
  it('preserves single quotes on JS strings (prettier singleQuote:true)', () => {
    expect(run(`const a = 'px-inline-md';\n`)).toBe(`const a = 'px-x-inline-md';\n`);
  });

  it('preserves double quotes on JSX attributes (prettier jsxSingleQuote:false)', () => {
    expect(run(`const A = () => <b className="px-inline-md" />;\n`)).toBe(
      `const A = () => <b className="px-x-inline-md" />;\n`,
    );
  });

  it('leaves everything it does not rename byte-identical (semicolons/spacing 不変)', () => {
    // semi:false・独特のインデントでも触らない（repo ごとの prettier 設定に非依存）
    const src = [
      'export function Panel() {',
      '  const cls = `px-inline-md ${flag ? "gap-inline-sm" : ""}`',
      '  return <div className={cls} data-x="untouched" />',
      '}',
      '',
    ].join('\n');
    const out = run(src)!;
    expect(out).toBe(
      [
        'export function Panel() {',
        '  const cls = `px-x-inline-md ${flag ? "gap-x-inline-sm" : ""}`',
        '  return <div className={cls} data-x="untouched" />',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('returns undefined when nothing matches (jscodeshift の「触っていない」表現)', () => {
    expect(run(`const a = 'nothing-to-see';\n`)).toBeUndefined();
  });
});

describe('codemod transform — AST スコープ（sed との差）', () => {
  it('does not rewrite module specifiers', () => {
    const src = `import x from './px-inline-md';\n`;
    expect(run(src)).toBeUndefined();
  });

  it('does not rewrite identifiers or comments (文字列位置のみ撃つ)', () => {
    const src = `// px-inline-md is the old name\nconst px_inline_md = 1;\n`;
    expect(run(src)).toBeUndefined();
  });

  it('rewrites template literal chunks around interpolations', () => {
    const src = 'const c = `px-inline-md ${v} gap-inline-sm`;\n';
    expect(run(src)).toBe('const c = `px-x-inline-md ${v} gap-x-inline-sm`;\n');
  });

  it('rewrites var(--) references inside strings', () => {
    const src = `const s = 'var(--spacing-inline-md)';\n`;
    expect(run(src)).toBe(`const s = 'var(--spacing-x-inline-md)';\n`);
  });
});

describe('codemod transform — 実測カウント', () => {
  it('counts 109 spacing utility replacements across a payout 模擬コンポーネント', () => {
    // payout 実測「spacing utility 109 箇所」を模した現実的な構成
    const spacing = [
      'px-inline-md',
      'py-stack-sm',
      'gap-inline-sm',
      'gap-stack-md',
      'px-inline-sm',
    ];
    const lines: string[] = ['export const Big = () => (', '  <div>'];
    for (let i = 0; i < 109; i++)
      lines.push(`    <span className="${spacing[i % spacing.length]}" />`);
    lines.push('  </div>', ');', '');
    const src = lines.join('\n');

    const out = applyToSourceDetailed(src, j, index);
    expect(out?.count).toBe(109);
    // 109 箇所すべてが x- 送り後の綴りになる ＝ dead 化しない
    expect(out!.text).not.toMatch(/className="(px|py|gap)-(inline|stack)-/);
    expect(out!.text).not.toContain('-x-x-');
  });
});

describe('codemod transform — jscodeshift transform 署名', () => {
  it('is callable as a standard jscodeshift transform with a prebuilt plan', () => {
    const plan = buildPlan(payoutBefore, 'common');
    const api = { jscodeshift: j, j, stats: () => {}, report: () => {} };
    const out = transform(
      { path: 'X.tsx', source: `const a = 'px-inline-md';\n` },
      api as unknown as Parameters<typeof transform>[1],
      { plan },
    );
    expect(out).toBe(`const a = 'px-x-inline-md';\n`);
  });

  it('is fail-closed when no theme is given (写像を発明しない)', () => {
    const api = { jscodeshift: j, j, stats: () => {}, report: () => {} };
    expect(() =>
      transform(
        { path: 'X.tsx', source: `const a = 'px-inline-md';\n` },
        api as unknown as Parameters<typeof transform>[1],
        {},
      ),
    ).toThrow(/requires a theme/);
  });
});
