/**
 * conformance skeleton の実行部 — リポの適合ベクトル JSON を組み立てる（CF-1）。
 *
 * W0a skeleton の実装状況（誠実性ガード — 空虚合格 MUST NOT）:
 * - gate-integrity: 実装（calculateConfigForFile 照合）
 * - styling.scan-coverage: 実装（補集合検査）
 * - 他キー: 検査器未配線につき **unknown(not-installed)** を出力する。
 *   green を返す経路は「検査が走り正の証拠を得た」実装のみ（G-6）。
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { parseRegistries, type RegistriesDocument } from '../registries/schema.js';
import {
  CONFORMANCE_KEYS,
  CONFORMANCE_SCHEMA_ID,
  type ConformanceKey,
  type ConformanceMeta,
  type ConformanceVector,
  type KeyState,
} from './conformance.js';
import { checkGateIntegrity } from './gate-integrity.js';
import { checkScanCoverage } from './scan-coverage.js';

const FLEET_PACKAGES = [
  ['standardsVersion', '@hideyukimori/nene2-standards'],
  ['tokensVersion', '@hideyukimori/nene2-tokens'],
  ['i18nVersion', '@hideyukimori/nene2-i18n'],
  ['clientVersion', '@hideyukimori/nene2-client'],
] as const;

function resolveVersion(cwd: string, pkg: string): string | null {
  try {
    const require = createRequire(path.join(cwd, 'package.json'));
    const pkgJson = require(`${pkg}/package.json`) as { version?: string };
    return pkgJson.version ?? null;
  } catch {
    return null;
  }
}

/** 全テーマファイルのプラグマ最小値（CF-4/AM-11(v) — 版比較は semver 単純比較で足りる範囲のみ） */
function contractVersionFromThemes(cwd: string): string | null {
  const themesDir = path.join(cwd, 'src/shared/ui/theme/themes');
  if (!existsSync(themesDir)) return null;
  const versions: string[] = [];
  for (const name of readdirSync(themesDir)) {
    if (!name.endsWith('.css')) continue;
    const text = readFileSync(path.join(themesDir, name), 'utf8');
    const m = /@nene2-contract\s+([\w.-]+)/.exec(text);
    if (m?.[1]) versions.push(m[1]);
  }
  if (versions.length === 0) return null;
  return versions.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  )[0] as string;
}

function gitCommitSha(cwd: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

export interface RunOptions {
  cwd: string;
  repo: string;
  /** pinned registries jsonc のパス（パッケージ同梱の registries/fleet.jsonc が既定） */
  registriesPath?: string | undefined;
}

export function loadRegistries(registriesPath: string | undefined): {
  registries: RegistriesDocument | null;
  manifestSha: string | null;
  error?: string;
} {
  const defaultPath = new URL('../../registries/fleet.jsonc', import.meta.url);
  const p = registriesPath ?? defaultPath;
  try {
    const source = readFileSync(p, 'utf8');
    return {
      registries: parseRegistries(source),
      manifestSha: createHash('sha256').update(source).digest('hex'),
    };
  } catch (e) {
    return { registries: null, manifestSha: null, error: (e as Error).message };
  }
}

export async function runConformance(options: RunOptions): Promise<ConformanceVector> {
  const { cwd, repo } = options;
  const { registries, manifestSha, error } = loadRegistries(options.registriesPath);

  const meta: ConformanceMeta = {
    standardsVersion: null,
    tokensVersion: null,
    i18nVersion: null,
    clientVersion: null,
    contractVersion: contractVersionFromThemes(cwd),
    manifestSha,
    commitSha: gitCommitSha(cwd),
  };
  for (const [field, pkg] of FLEET_PACKAGES) {
    meta[field] = resolveVersion(cwd, pkg);
  }

  const notWired = (what: string): KeyState => ({
    state: 'unknown',
    reason: 'not-installed',
    details: [`検査器未配線（W0a skeleton）: ${what}`],
  });

  const keys = {} as Record<ConformanceKey, KeyState>;
  for (const key of CONFORMANCE_KEYS) keys[key] = notWired(key);

  // 実装済みの検査（green は正の証拠を得た場合のみ）
  keys['gate-integrity'] = await checkGateIntegrity({ cwd });
  keys['styling.scan-coverage'] = checkScanCoverage({ cwd, repo, registries });
  if (error && registries === null) {
    keys['styling.scan-coverage'] = {
      state: 'unknown',
      reason: 'unsupported-schema',
      details: [`registries 読込失敗: ${error}`],
    };
  }

  return { schema: CONFORMANCE_SCHEMA_ID, repo, meta, keys };
}
