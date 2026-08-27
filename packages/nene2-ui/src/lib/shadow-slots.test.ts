import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * #386 — 影のスロットの検査。
 *
 * 影は 0.9.0 の「色・字重・型段をすべてスロット経由へ」の列挙から漏れ、**スロット化されなかった
 * 唯一の次元**だった（契約 v1 は `SHADOW_KEYS` を持ち、スケール値 `--shadow-sm` も在るのに
 * `--shadow-x-slot-` は0件）。`Card` と `Toast` は `rounded-x-slot-*` と同じ行で `shadow-sm` を
 * 直書きし、`Button` は影を持てなかった。
 *
 * 🔴 この検査の主眼は「既定が現状の描画の写しであること」。`#380` で
 * `--text-x-slot-button-sm-size: inherit` を「既定は無害」として入れ、**片側だけ上書きした艦で
 * 段が反転した**。影は対を持たないので反転はしないが、**同じ日に外した手は、次に使うとき検査ごと持っていく。**
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const themeCss = readFileSync(path.join(root, 'themes/default.css'), 'utf8');

const COMMENT_RE = /\/\*[\s\S]*?\*\//g;
const DECL_RE = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;

function declarations(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.replace(COMMENT_RE, '').matchAll(DECL_RE)) out.set(m[1]!, m[2]!.trim());
  return out;
}

const decls = declarations(themeCss);
const shadowSlots = [...decls.entries()].filter(([n]) => n.startsWith('--shadow-x-slot-'));

/** キットの実装ファイル（テストを除く）。🔴 `.ts` を含める — `lib/states.ts` がスロットを読む。 */
function sourceFiles(): string[] {
  return globSync('src/**/*.{ts,tsx}', { cwd: root })
    .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
    .map((f) => path.join(root, f));
}

/** Tailwind の shadow utility のうち、スロット経由でないもの（= スケール値の直書き）。 */
const RAW_SHADOW_RE = /(?<![\w-])shadow-(?!x-slot-)[a-z0-9-]+/g;

describe('影のスロット（#386）', () => {
  it('影のスロットが存在する（陰性対照 — 0件なら以下の検査は全部空虚に緑になる）', () => {
    expect(shadowSlots.length).toBeGreaterThan(0);
  });

  it('既定は「段を選ぶ」だけで、段を発明しない', () => {
    // README §① — "A slot chooses a step; it may not invent one."
    for (const [name, value] of shadowSlots) {
      expect(
        value === 'none' || /^var\(--shadow-[a-z0-9-]+\)$/.test(value),
        `${name}: ${value} — none か var(--shadow-*) のいずれかであること`,
      ).toBe(true);
    }
  });

  it('既定は載せ替え前の描画の写しである（凍結記録・変えると全艦の見た目が動く）', () => {
    // 🔴 導出できない。この3行は「0.15.0 以前に各部品が実際に描いていたもの」という
    // 過去の事実であり、現在のコードからは復元できないので、記録として固定する。
    // 変更するときは「描画を変える」判断とセットでなければならない。
    expect(decls.get('--shadow-x-slot-button-solid')).toBe('none'); // Button は影を持たなかった（0.20.0 で primary→solid・#487）
    expect(decls.get('--shadow-x-slot-card-raised')).toBe('var(--shadow-sm)'); // Card.tsx が shadow-sm
    expect(decls.get('--shadow-x-slot-toast')).toBe('var(--shadow-sm)'); // ToastProvider.tsx が shadow-sm
  });

  it('部品はスケール値を直書きしない（スロット経由だけ）', () => {
    const offenders: string[] = [];
    for (const f of sourceFiles()) {
      const src = readFileSync(f, 'utf8')
        .replace(COMMENT_RE, '')
        .replace(/\/\/[^\n]*/g, '');
      for (const m of src.matchAll(RAW_SHADOW_RE)) {
        offenders.push(`${path.relative(root, f)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('陽性対照: その検査は直書きを実際に見つけられる', () => {
    // 上の検査が「常に空配列を返すだけ」でないことを示す。
    const sample = "className={cx('rounded-x-slot-card shadow-sm')}";
    expect([...sample.matchAll(RAW_SHADOW_RE)].map((m) => m[0])).toEqual(['shadow-sm']);
    // スロット経由は拾わない（偽陽性を出さない）。
    const ok = "className={cx('shadow-x-slot-card-raised')}";
    expect([...ok.matchAll(RAW_SHADOW_RE)]).toEqual([]);
  });

  it('影を描く部品がスロットを読んでいる', () => {
    const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');
    expect(read('src/primitives/Button.tsx')).toContain('shadow-x-slot-button-solid');
    expect(read('src/layout/Card.tsx')).toContain('shadow-x-slot-card-raised');
    expect(read('src/feedback/ToastProvider.tsx')).toContain('shadow-x-slot-toast');
  });
});
