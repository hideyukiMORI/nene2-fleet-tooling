/**
 * scan-coverage 検査（規約 05 §5.2 #14・会議R4 AM-11(ii)・R5(5)決定）:
 * style ソース（css/scss/sass/less/styl/html）の全量列挙 − {themes 列挙 ∪ 許可リスト ∪ legacy manifest}
 * = 空 を検査する（補集合検査 — 台帳の外に style ソースを密輸させない）。
 *
 * - css/html 以外の拡張子（scss/sass/less/styl）のヒットは即 red。
 * - manifest 記載ファイルの不存在も red（台帳腐敗防止 — §7.2）。
 * - 台帳（registries）が与えられない場合は unknown(not-installed) — fail-closed（G-6）。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import type { RegistriesDocument } from '../registries/schema.js';
import type { KeyState } from './conformance.js';

const STYLE_EXT = /\.(css|scss|sass|less|styl|html)$/;
const BANNED_EXT = /\.(scss|sass|less|styl)$/;

/** テーマ列挙の正準 glob（05 §1.2 正準配置）＋アプリエントリ。 */
const CANONICAL_ALLOWED = [/^src\/shared\/ui\/theme\//, /^src\/index\.css$/, /^index\.html$/];

/**
 * `.gitignore` によって除外されているパス（cwd 相対・ディレクトリは末尾 `/` なし）の集合
 * （fleet-tooling#28 — enumerateStyleSources が非標準 outDir（`dist-e2e/` 等）を .gitignore
 * を無視して走査し、E2E ハーネスの build 出力を誤収載した実測。git 自身の無視判定に委譲する
 * ことで、任意の outDir 名・ネストした .gitignore・親ディレクトリ側の登録（cwd が
 * リポジトリ直下でない frontend/ 等のケース）を正しく扱う）。
 *
 * git が使えない/リポジトリでない場合は空集合を返す（fail-open — 走査自体は継続。
 * node_modules/dist/dotfile の既定除外は別途ハードコードで維持する）。
 */
function gitIgnoredPaths(cwd: string): Set<string> {
  try {
    const out = execFileSync(
      'git',
      ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory'],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return new Set(
      out
        .split('\0')
        .filter((p) => p !== '')
        .map((p) => p.replace(/\/$/, '')),
    );
  } catch {
    return new Set();
  }
}

export function enumerateStyleSources(cwd: string): string[] {
  const ignored = gitIgnoredPaths(cwd);
  const isIgnored = (rel: string): boolean => {
    if (ignored.has(rel)) return true;
    // --directory は「まるごと無視されたディレクトリ」を単一エントリで返す。
    // rel がその配下（祖先が一致）でも無視扱いにする。
    for (const dir of ignored) {
      if (rel === dir || rel.startsWith(dir + '/')) return true;
    }
    return false;
  };
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
      const rel = path.relative(cwd, full).replaceAll('\\', '/');
      if (isIgnored(rel)) continue;
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (STYLE_EXT.test(name)) found.push(rel);
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
