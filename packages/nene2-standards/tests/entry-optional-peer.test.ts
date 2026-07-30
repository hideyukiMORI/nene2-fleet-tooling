/**
 * root entry（`@hideyukimori/nene2-standards` = ESLint flat config の消費口）から
 * **optional peer へ静的に到達しない**ことの回帰テスト（#189 摩擦1）。
 *
 * 事故の形: `checks/init-scan.ts` が `../stylelint/plugin.js` を静的 import しており、
 * plugin.js は `stylelint` を静的 import する。root entry は checks を re-export するので、
 * `import nene2 from '@hideyukimori/nene2-standards'` だけで stylelint の解決が要求され、
 * **eslint だけ配線する艦が ERR_MODULE_NOT_FOUND で config を読めなかった**
 * （2026-07-30 origin ゲート導入 PR で実踏）。manifest は
 * `peerDependenciesMeta.stylelint.optional = true` と宣言しているので、
 * コードが宣言に追いついていなかった＝宣言の側が正。
 *
 * 実行時に消費する側（scanLintBaselines）は既に `await import('stylelint')` の遅延形なので、
 * 遅延は設計意図であり、静的 import がその意図を無効化していた。
 *
 * 検査は**静的 import グラフの到達可能性**で行う（`import type` は実行時に消えるので除外）。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** package.json で optional 宣言された peer = root entry から静的に到達してはいけない */
const OPTIONAL_PEERS = ['stylelint'];

/**
 * `from '...'` の静的 import 元を返す（`import type` / `export type` は実行時に残らないので除外・
 * `await import(...)` は動的なので拾わない）。
 */
function staticImportsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const specs: string[] = [];
  const re = /(?:^|\n)\s*(?:import|export)\s+([^'"\n;]*?)\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of source.matchAll(re)) {
    const clause = m[1] ?? '';
    const spec = m[2] ?? '';
    if (/^type\b/.test(clause.trim())) continue; // `import type { X } from` — 実行時に消える
    specs.push(spec);
  }
  return specs;
}

/** src 内の相対 import を実ファイルへ解決する（`.js` 指定 → `.ts` 実体） */
function resolveLocal(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const abs = path.resolve(path.dirname(fromFile), spec);
  for (const cand of [abs.replace(/\.js$/, '.ts'), `${abs}.ts`, path.join(abs, 'index.ts')]) {
    try {
      readFileSync(cand);
      return cand;
    } catch {
      /* 次の候補へ */
    }
  }
  return null;
}

/** entry から静的 import だけを辿り、到達した (bare specifier → 経路) を集める */
function staticReachability(entry: string): Map<string, string[]> {
  const hits = new Map<string, string[]>();
  const seen = new Set<string>();
  const walk = (file: string, trail: string[]): void => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const spec of staticImportsOf(file)) {
      const local = resolveLocal(file, spec);
      if (local) {
        walk(local, [...trail, path.relative(SRC, local)]);
        continue;
      }
      const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (pkg && !hits.has(pkg)) hits.set(pkg, [...trail, spec]);
    }
  };
  walk(entry, [path.relative(SRC, entry)]);
  return hits;
}

describe('root entry から optional peer への静的到達（#189 摩擦1）', () => {
  const reachable = staticReachability(path.join(SRC, 'index.ts'));

  it.each(OPTIONAL_PEERS)('root entry は %s を静的 import しない', (peer) => {
    const trail = reachable.get(peer);
    expect(
      trail,
      trail
        ? `root entry から ${peer} へ静的到達している: ${trail.join(' → ')}\n` +
            `${peer} は optional peer なので、消費側（await import）で遅延読み込みすること。`
        : undefined,
    ).toBeUndefined();
  });

  it('検査自体が空振りしていない（陽性対照 = plugin.ts は stylelint へ静的到達する）', () => {
    // 検査器が「何も見ていないのに green」を返していないことの確認（G-6）。
    expect(staticReachability(path.join(SRC, 'stylelint', 'plugin.ts')).has('stylelint')).toBe(
      true,
    );
  });

  it('optional peer の一覧が package.json の宣言と一致している', () => {
    const manifest = JSON.parse(
      readFileSync(path.join(SRC, '..', 'package.json'), 'utf8'),
    ) as Record<string, Record<string, { optional?: boolean }>>;
    const declared = Object.entries(manifest.peerDependenciesMeta ?? {})
      .filter(([, v]) => v?.optional === true)
      .map(([k]) => k)
      .sort();
    expect(declared).toEqual([...OPTIONAL_PEERS].sort());
  });
});
