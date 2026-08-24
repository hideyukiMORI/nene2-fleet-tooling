import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * #380 — サイズ違いで対になっているスロットの検査。
 *
 * `--text-x-slot-button-sm-size` の既定は `inherit` で、兄弟の `--text-x-slot-button-size` も
 * `inherit`。両方とも既定なら同じ大きさに描かれるので「今日は何も変わらない」が成立する。
 * しかし **md だけを上書きした消費者では sm が md より大きくなる**（sm は周囲の本文サイズを
 * 継承するため）。nene-vault は md=13px / sm=12px を出荷しており、このスロットを足した動機
 * そのものが、その条件から外れる艦の存在だった。
 *
 * 対の一覧は **手で書かない**（型1: 列挙で書いた検査は、列挙に無いものを緑にする）。
 * `themes/default.css` から導出し、配布データ `themes/slot-pairs.json` と突合する。
 * 消費者側の検査器はこの JSON を読んで「片側だけ上書き」を検知する。
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const themeCss = readFileSync(path.join(here, '../../themes/default.css'), 'utf8');
const shipped = JSON.parse(
  readFileSync(path.join(here, '../../themes/slot-pairs.json'), 'utf8'),
) as {
  pairs: {
    base: string;
    sm: string;
    defaults: { base: string; sm: string };
    overrideTogether: boolean;
  }[];
};

const DECL_RE = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
const COMMENT_RE = /\/\*[\s\S]*?\*\//g;

/**
 * テーマ CSS の宣言を name → value で読む。
 *
 * コメントを先に落とす —— 落とさないと、**コメントアウトされたスロットを「在る」と数える**。
 * 行頭アンカーは使わない: `:root { --x: 1; }` のような1行の記述を取りこぼす（この検査自身が
 * 最初にそれで空振りした。型4「道具の窓が主張の射程より狭いと、静かに過小に出る」の現物）。
 */
function declarations(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.replace(COMMENT_RE, '').matchAll(DECL_RE)) out.set(m[1]!, m[2]!.trim());
  return out;
}

/** `--<ns>-x-slot-<comp>-sm-<rest>` を、その base 相手と対にして導出する。 */
function derivePairs(css: string) {
  const decls = declarations(css);
  const pairs: { base: string; sm: string }[] = [];
  for (const name of decls.keys()) {
    const m = /^(--(?:text|spacing|color|radius)-x-slot-[a-z0-9-]*?)sm-(.+)$/.exec(name);
    if (!m) continue;
    const base = `${m[1]}${m[2]}`;
    if (decls.has(base)) pairs.push({ base, sm: name });
  }
  return pairs.sort((a, b) => a.sm.localeCompare(b.sm));
}

/**
 * 片側だけ上書きしている対を返す。消費者のテーマ CSS に対して使う想定。
 * ここでは検知の機序そのものをテストする（実際の消費者テーマは本リポに無い）。
 */
export function findOneSidedOverrides(consumerCss: string, pairs: { base: string; sm: string }[]) {
  const decls = declarations(consumerCss);
  return pairs.filter((p) => decls.has(p.base) !== decls.has(p.sm));
}

describe('サイズ対スロット（#380）', () => {
  const derived = derivePairs(themeCss);

  it('配布データが themes/default.css から導出した対と一致する（列挙を腐らせない）', () => {
    expect(derived.length).toBeGreaterThan(0);
    expect(
      shipped.pairs
        .map((p) => ({ base: p.base, sm: p.sm }))
        .sort((a, b) => a.sm.localeCompare(b.sm)),
    ).toEqual(derived);
  });

  it('配布データの既定値が themes/default.css の現物と一致する', () => {
    const decls = declarations(themeCss);
    for (const p of shipped.pairs) {
      expect(p.defaults.base, p.base).toBe(decls.get(p.base));
      expect(p.defaults.sm, p.sm).toBe(decls.get(p.sm));
    }
  });

  it('両方が inherit の対だけが overrideTogether を立てている', () => {
    for (const p of shipped.pairs) {
      const bothInherit = p.defaults.base === 'inherit' && p.defaults.sm === 'inherit';
      expect(p.overrideTogether, p.sm).toBe(bothInherit);
    }
  });

  it('既定は対称である（片側だけ inherit の対をキットが出荷しない）', () => {
    for (const p of shipped.pairs) {
      expect(
        (p.defaults.base === 'inherit') === (p.defaults.sm === 'inherit'),
        `${p.base} と ${p.sm} の既定が非対称`,
      ).toBe(true);
    }
  });

  describe('片側上書きの検知', () => {
    const pairs = derived;

    it('md だけを上書きしたテーマを検知する（vault が踏んだ形）', () => {
      const css = ':root { --text-x-slot-button-size: var(--text-sm); }';
      expect(findOneSidedOverrides(css, pairs).map((p) => p.sm)).toEqual([
        '--text-x-slot-button-sm-size',
      ]);
    });

    it('sm だけを上書きしたテーマも検知する（逆向き）', () => {
      const css = ':root { --text-x-slot-button-sm-size: var(--text-xs); }';
      expect(findOneSidedOverrides(css, pairs).map((p) => p.base)).toEqual([
        '--text-x-slot-button-size',
      ]);
    });

    it('両方を上書きしたテーマは検知しない（vault の現状）', () => {
      const css = `:root {
        --text-x-slot-button-size: var(--text-sm);
        --text-x-slot-button-sm-size: var(--text-xs);
      }`;
      expect(findOneSidedOverrides(css, pairs)).toEqual([]);
    });

    it('どちらも上書きしないテーマは検知しない', () => {
      expect(findOneSidedOverrides(':root { --color-x-slot-control-fg: red; }', pairs)).toEqual([]);
    });

    it('コメントアウトされた上書きは上書きとして数えない', () => {
      const css = ':root { /* --text-x-slot-button-size: var(--text-sm); */ }';
      expect(findOneSidedOverrides(css, pairs)).toEqual([]);
    });

    it('陰性対照: 検知器が何にでも反応するわけではない', () => {
      expect(findOneSidedOverrides('', pairs)).toEqual([]);
      expect(pairs.length).toBeGreaterThan(0);
    });
  });
});
