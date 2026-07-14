/**
 * scan-coverage 検査（規約 05 §5.2 #14・会議R4 AM-11(ii)・R5(5)決定）:
 * style ソース（css/scss/sass/less/styl/html）の全量列挙 − {themes 列挙 ∪ 許可リスト ∪ legacy manifest}
 * = 空 を検査する（補集合検査 — 台帳の外に style ソースを密輸させない）。
 *
 * - css/html 以外の拡張子（scss/sass/less/styl）のヒットは即 red。
 * - manifest 記載ファイルの不存在も red（台帳腐敗防止 — §7.2）。
 * - 台帳（registries）が与えられない場合は unknown(not-installed) — fail-closed（G-6）。
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import type { RegistriesDocument } from '../registries/schema.js';
import type { KeyState } from './conformance.js';

const STYLE_EXT = /\.(css|scss|sass|less|styl|html)$/;
const BANNED_EXT = /\.(scss|sass|less|styl)$/;

/** テーマ列挙の正準 glob（05 §1.2 正準配置）＋アプリエントリ。 */
const CANONICAL_ALLOWED = [/^src\/shared\/ui\/theme\//, /^src\/index\.css$/, /^index\.html$/];

export function enumerateStyleSources(cwd: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
      const full = path.join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (STYLE_EXT.test(name)) found.push(path.relative(cwd, full).replaceAll('\\', '/'));
    }
  };
  walk(cwd);
  return found.sort();
}

export interface ScanCoverageOptions {
  cwd: string;
  repo: string;
  registries: RegistriesDocument | null;
}

export function checkScanCoverage(options: ScanCoverageOptions): KeyState {
  const { cwd, repo, registries } = options;
  if (registries === null) {
    return {
      state: 'unknown',
      reason: 'not-installed',
      details: ['registries（pinned 台帳）が与えられていない — 補集合検査は台帳なしに定義できない'],
    };
  }

  const manifestPaths = registries.entries
    .filter((e) => e.kind === 'legacy-manifest' && e.repo === repo)
    .map((e) => (e as { path: string }).path);
  const widgetEntryFiles = registries.entries
    .filter((e) => e.kind === 'widget-entry' && e.repo === repo)
    .flatMap((e) => (e as { files: string[] }).files);

  const details: string[] = [];

  // 台帳腐敗防止: manifest 記載ファイルの不存在は FAIL
  for (const p of manifestPaths) {
    if (!existsSync(path.join(cwd, p))) {
      details.push(`legacy manifest 記載ファイルが存在しない（台帳腐敗）: ${p}`);
    }
  }

  const sources = enumerateStyleSources(cwd);
  for (const rel of sources) {
    if (BANNED_EXT.test(rel)) {
      details.push(`css/html 以外の style 拡張子は即 red（R5(5)）: ${rel}`);
      continue;
    }
    const allowed =
      CANONICAL_ALLOWED.some((re) => re.test(rel)) ||
      manifestPaths.includes(rel) ||
      widgetEntryFiles.includes(rel);
    if (!allowed) {
      details.push(`台帳外の style ソース（themes ∪ 許可リスト ∪ legacy manifest に不在）: ${rel}`);
    }
  }

  return details.length === 0 ? { state: 'green' } : { state: 'red', details };
}
