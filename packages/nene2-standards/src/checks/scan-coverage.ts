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
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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

/**
 * HTML 埋め込み `<style>` の検出（#164 タスク1）。
 *
 * 2.3.x までの**測定経路**（`init --scan` / lint-baseline / `--check`）は `.css` だけを見ていた。一方 scan-coverage は
 * `index.html` を `CANONICAL_ALLOWED` で**無条件に allowed** にしていたため、
 * **埋め込み `<style>` が台帳にも lint にも載らないまま green** になっていた
 * （＝不可視領域があるのに green・G-6 の現物）。実在例: concierge
 * `public_html/admin/index.html`（52KB・`<style>` 1ブロック・fleet 実測 2026-07-30）。
 *
 * ここは依存なしの粗い検出（正規表現）で、**あるか無いか**だけを決める。中身の測定は
 * `enumerateMeasurableStyleSources` が選んだファイルを init-scan が postcss-html で読む（#164 タスク2）。
 * コメント内の `<style` は拾いうるが、**過検出は fail-closed 側に倒れる**ので許容する
 * （見落として green を返すより安全 — 逆向きの誤りは G-6 違反になる）。
 */
export function htmlEmbeddedStyle(cwd: string, rel: string): { blocks: number; lines: number } {
  let text: string;
  try {
    text = readFileSync(path.join(cwd, rel), 'utf8');
  } catch {
    return { blocks: 0, lines: 0 };
  }
  const re = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
  let blocks = 0;
  let lines = 0;
  for (const m of text.matchAll(re)) {
    const body = (m[1] ?? '').trim();
    if (body === '') continue; // 空 <style> は不可視領域ではない
    blocks++;
    lines += body.split('\n').length;
  }
  return { blocks, lines };
}

/**
 * **測定経路**（`init --scan` / lint-baseline / `--check`）の走査対象（#164 タスク2）:
 * `.css` の全件＋**埋め込み `<style>` を持つ `.html`**。埋め込みの無い HTML は測るものが無いので含めない。
 * scss/sass/less/styl は scan-coverage が red にする対象で、測定経路には乗せない。
 * 中身の読み方（postcss-html）は init-scan 側。
 */
export function enumerateMeasurableStyleSources(cwd: string): string[] {
  return enumerateStyleSources(cwd).filter(
    (rel) =>
      rel.endsWith('.css') || (rel.endsWith('.html') && htmlEmbeddedStyle(cwd, rel).blocks > 0),
  );
}

/** `cwd` 配下の HTML のうち、埋め込み `<style>` を持つもの（#164 の不可視領域の列挙）。 */
export function htmlEmbeddedStyleSources(
  cwd: string,
): Array<{ path: string; blocks: number; lines: number }> {
  return enumerateStyleSources(cwd)
    .filter((rel) => rel.endsWith('.html'))
    .map((rel) => ({ path: rel, ...htmlEmbeddedStyle(cwd, rel) }))
    .filter((e) => e.blocks > 0);
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
    const registered = manifestPaths.includes(rel) || widgetEntryFiles.includes(rel);
    // 🔴 HTML は**埋め込み `<style>` を持つ限り無条件 allowed にしない**（#164）。
    // 正準配置（index.html）であっても、中の CSS は台帳（legacy manifest）に載って初めて allowed。
    // 登録済みなら測定経路（init-scan・postcss-html）が cap と違反数を実測する＝不可視領域ではない。
    const embedded = rel.endsWith('.html') ? htmlEmbeddedStyle(cwd, rel) : { blocks: 0, lines: 0 };
    if (embedded.blocks > 0) {
      if (!registered) {
        details.push(
          `HTML 埋め込み <style> が台帳外（${embedded.blocks}ブロック・約${embedded.lines}行）: ${rel}` +
            ` — 正準配置でも中の CSS は themes / 許可リスト / legacy manifest のいずれにも載らない（#164）`,
        );
      }
      continue;
    }
    const allowed = CANONICAL_ALLOWED.some((re) => re.test(rel)) || registered;
    if (!allowed) {
      details.push(`台帳外の style ソース（themes ∪ 許可リスト ∪ legacy manifest に不在）: ${rel}`);
    }
  }

  if (details.length > 0) return { state: 'red', details };
  return { state: 'green' };
}
