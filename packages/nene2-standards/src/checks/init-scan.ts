/**
 * `nene2-check init --scan` — 許可リスト / legacy manifest 初期値の走査生成
 * （規約 05 §6.6 T-3・会議R4 AM-10・R5 決定 = AM-10 の「人間の記憶力で列挙値を決めない」）。
 *
 * - 生成はゲート導入 PR の一度きり: 対象台帳（同一 repo・同一 kind のエントリ）が既存なら
 *   **実行拒否**（R5: ラチェット一周リセットの禁止）。
 * - `--check` は読み取り専用の再走査 — 未分類 selector / 未登録ファイルを報告する
 *   （conformance styling green 条件「再走査で未分類 selector 0」の入力）。
 * - maxLines は pinned prettier 整形後の行数（AM-14/AM-25' — 整形非決定下の行数に正準性はない）・
 *   maxBytes はソース実バイト数。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { classTokens, layerParamsInclude } from '../stylelint/helpers.js';
import type { RegistriesDocument } from '../registries/schema.js';
import { enumerateStyleSources } from './scan-coverage.js';

export interface InitScanResult {
  /** @layer components 内の class トークン（完全一致列挙の初期値） */
  allowedClasses: string[];
  /** legacy manifest 初期値（テーマ正準配置・index.css 以外の css） */
  legacyManifest: Array<{ path: string; maxLines: number; maxBytes: number }>;
  /** 500行超の助言 warning（AM-25' — MUST ではない） */
  advisories: string[];
}

const CANONICAL_NON_LEGACY = [/^src\/shared\/ui\/theme\//, /^src\/index\.css$/];
const ADVISORY_LINES = 500;

async function formattedLineCount(source: string): Promise<number> {
  // pinned prettier（workspace 同梱）で整形してから数える
  const prettier = await import('prettier');
  const formatted = await prettier.format(source, { parser: 'css' });
  return formatted.split('\n').filter((l) => l !== '').length;
}

export async function initScan(cwd: string): Promise<InitScanResult> {
  const postcss = (await import('postcss')).default;
  const sources = enumerateStyleSources(cwd).filter((p) => p.endsWith('.css'));
  const allowed = new Set<string>();
  const legacyManifest: InitScanResult['legacyManifest'] = [];
  const advisories: string[] = [];

  for (const rel of sources) {
    const abs = path.join(cwd, rel);
    const raw = readFileSync(abs);
    const text = raw.toString('utf8');

    // @layer components の class トークン収集（許可リスト初期値）
    try {
      const root = postcss.parse(text, { from: abs });
      root.walkAtRules('layer', (at) => {
        if (!layerParamsInclude(at.params, 'components')) return;
        at.walkRules((rule) => {
          for (const token of classTokens(rule.selector)) allowed.add(token);
        });
      });
    } catch (e) {
      advisories.push(`${rel}: CSS パース不能（手動確認が必要）: ${(e as Error).message}`);
      continue;
    }

    // legacy manifest 初期値（テーマ正準配置・エントリ css 以外）
    if (!CANONICAL_NON_LEGACY.some((re) => re.test(rel))) {
      const maxLines = await formattedLineCount(text);
      const entry = { path: rel, maxLines, maxBytes: raw.byteLength };
      legacyManifest.push(entry);
      if (maxLines > ADVISORY_LINES) {
        advisories.push(
          `${rel}: ${maxLines} 行 > ${ADVISORY_LINES}（助言的閾値 — AM-25'。ゲートではない）`,
        );
      }
    }
  }

  return {
    allowedClasses: [...allowed].sort(),
    legacyManifest,
    advisories,
  };
}

/** 対象台帳が既存かどうか（既存なら init --scan は実行拒否 — T-3/R5）。 */
export function ledgersAlreadyInitialized(
  registries: RegistriesDocument,
  repo: string,
): { legacyManifest: boolean } {
  return {
    legacyManifest: registries.entries.some((e) => e.kind === 'legacy-manifest' && e.repo === repo),
  };
}

export interface InitCheckReport {
  unregisteredClasses: string[];
  unregisteredLegacyFiles: string[];
}

/** `--check`（読み取り専用再走査）: 台帳との差分を報告する。 */
export async function initCheck(
  cwd: string,
  repo: string,
  registries: RegistriesDocument,
): Promise<InitCheckReport> {
  const scan = await initScan(cwd);
  const manifestPaths = new Set(
    registries.entries
      .filter((e) => e.kind === 'legacy-manifest' && e.repo === repo)
      .map((e) => (e as { path: string }).path),
  );
  // 許可リストの正本台帳は W1 配線（gen:registered-classes と同一系）— skeleton では
  // testid 同様の中央台帳が未定義のため、@layer components トークンは全て「要分類」として報告
  return {
    unregisteredClasses: scan.allowedClasses,
    unregisteredLegacyFiles: scan.legacyManifest
      .map((e) => e.path)
      .filter((p) => !manifestPaths.has(p)),
  };
}
