/**
 * gate-integrity 検査（規約 05 §5.2 #15・会議R4 AM-11(iii)決定）:
 * 実効 severity / effective ignores を canonical 表と照合し、差異登録なき緩和を FAIL にする。
 *
 * canonical 表は配布 config（composedConfig）自身から機械導出する — 手書き二重管理 MUST NOT
 * （G-7 と同旨: 正本は配布物）。照合は ESLint.calculateConfigForFile の実効値
 * （05 §10.2 で「実測未実施」だった方式 — 本実装＋パッケージテストが実測）。
 *
 * fail-closed（G-6）:
 * - 製品 eslint.config.js が無い / ESLint が解決できない → unknown(not-installed)
 * - config 読み込みがクラッシュ → unknown(crashed)
 * - 適用ファイル数 0（src 直下に *.ts(x) が1つも無い）→ unknown（§1.2 の G-6 適用）
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

import { ESLint, type Linter } from 'eslint';

import { composedConfig } from '../index.js';
import type { KeyState } from './conformance.js';

/**
 * 照合マトリクス: 「(仮想パス, ルール) → canonical 実効 severity」。
 * パスは §2.2 の互いに素な集合それぞれの代表点（統合ミス・緩和が最も隠れやすい座席）。
 */
export const GATE_INTEGRITY_MATRIX: ReadonlyArray<{ path: string; rules: string[] }> = [
  {
    path: 'src/features/probe/file.tsx',
    rules: [
      'no-restricted-syntax',
      'no-restricted-imports',
      'no-restricted-globals',
      '@typescript-eslint/no-restricted-imports',
      'import-x/no-restricted-paths',
      'better-tailwindcss/no-unknown-classes',
      'nene2/style-prop-css-vars-only',
      'eslint-comments/no-restricted-disable',
    ],
  },
  {
    path: 'src/shared/ui/probe/file.tsx',
    rules: ['no-restricted-syntax', 'no-restricted-imports', 'no-restricted-globals'],
  },
  {
    path: 'src/shared/api/client.ts',
    rules: ['no-restricted-syntax', 'no-restricted-imports', 'no-restricted-globals'],
  },
  {
    path: 'src/shared/i18n/messages/ja.ts',
    rules: ['no-restricted-syntax'],
  },
  {
    path: 'tests/probe.test.ts',
    rules: ['no-restricted-syntax'],
  },
];

type SeverityCell = {
  path: string;
  rule: string;
  /** 0=off / 1=warn / 2=error。null = ルール定義なし */
  severity: number | null;
  /** no-restricted-syntax のセレクタ本数（後勝ち全置換による欠落の検出 — severity では見えない） */
  optionCount: number | null;
};

function normalizeSeverity(entry: Linter.RuleEntry | undefined): {
  severity: number | null;
  optionCount: number | null;
} {
  if (entry === undefined) return { severity: null, optionCount: null };
  const arr = Array.isArray(entry) ? entry : [entry];
  const sevRaw = arr[0];
  const map: Record<string, number> = { off: 0, warn: 1, error: 2 };
  const severity = typeof sevRaw === 'number' ? sevRaw : (map[String(sevRaw)] ?? null);
  return { severity, optionCount: Array.isArray(entry) ? entry.length - 1 : 0 };
}

async function severityTable(eslint: ESLint, cwd: string): Promise<SeverityCell[]> {
  const cells: SeverityCell[] = [];
  for (const { path: p, rules } of GATE_INTEGRITY_MATRIX) {
    const abs = path.join(cwd, p);
    const cfg = (await eslint.calculateConfigForFile(abs)) as
      | { rules?: Record<string, Linter.RuleEntry> }
      | undefined;
    for (const rule of rules) {
      const { severity, optionCount } = normalizeSeverity(cfg?.rules?.[rule]);
      cells.push({ path: p, rule, severity, optionCount });
    }
  }
  return cells;
}

/** canonical 表（配布 config から導出）。 */
export async function canonicalSeverityTable(cwd: string): Promise<SeverityCell[]> {
  const eslint = new ESLint({ cwd, overrideConfigFile: true, overrideConfig: composedConfig() });
  return severityTable(eslint, cwd);
}

export interface GateIntegrityOptions {
  cwd: string;
  /** テスト用: 製品 config の代わりに直接評価する config（ファイル読込経路を迂回） */
  productConfigOverride?: Linter.Config[];
}

/** 実効 severity 照合の結果を conformance の KeyState で返す。 */
export async function checkGateIntegrity(options: GateIntegrityOptions): Promise<KeyState> {
  const { cwd, productConfigOverride } = options;

  // G-6: 適用ファイル数 0 = unknown（glob 不一致による静かな非適用は green ではない — §1.2）
  const applied = await countAppliedFiles(cwd);
  if (applied === 0) {
    return {
      state: 'unknown',
      reason: 'not-installed',
      details: ['適用ファイル数 0（src/**/*.{ts,tsx} 不在）— G-6 により green ではなく unknown'],
    };
  }

  let productEslint: ESLint;
  if (productConfigOverride) {
    productEslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: productConfigOverride,
    });
  } else {
    if (!existsSync(path.join(cwd, 'eslint.config.js'))) {
      return {
        state: 'unknown',
        reason: 'not-installed',
        details: ['eslint.config.js が正準配置（§1.2）に存在しない'],
      };
    }
    productEslint = new ESLint({ cwd });
  }

  let productTable: SeverityCell[];
  let canonTable: SeverityCell[];
  try {
    [productTable, canonTable] = await Promise.all([
      severityTable(productEslint, cwd),
      canonicalSeverityTable(cwd),
    ]);
  } catch (e) {
    return { state: 'unknown', reason: 'crashed', details: [(e as Error).message] };
  }

  const details: string[] = [];
  for (let i = 0; i < canonTable.length; i++) {
    const canon = canonTable[i];
    const prod = productTable[i];
    if (!canon || !prod) continue;
    const sevCanon = canon.severity ?? -1;
    const sevProd = prod.severity ?? -1;
    // 緩和（canonical より弱い severity）= FAIL。強化は oracle 正本（O-5）に反し得るが
    // gate-integrity の管轄は「差異登録なき緩和」— 強化の是非は check:tw-oracle 側。
    if (sevProd < sevCanon) {
      details.push(
        `${canon.path} / ${canon.rule}: 実効 severity ${sevProd} < canonical ${sevCanon}（差異登録なき緩和）`,
      );
    }
    // 後勝ち全置換によるオプション欠落（severity 照合では検出できない — §2.2 冒頭）
    if (
      canon.optionCount !== null &&
      prod.optionCount !== null &&
      sevProd >= 1 &&
      prod.optionCount < canon.optionCount
    ) {
      details.push(
        `${canon.path} / ${canon.rule}: 実効オプション数 ${prod.optionCount} < canonical ${canon.optionCount}（後勝ち全置換の疑い）`,
      );
    }
  }

  return details.length === 0 ? { state: 'green' } : { state: 'red', details };
}

/** src/**' の適用ファイル数（G-6 の空虚合格検査）。 */
export async function countAppliedFiles(cwd: string): Promise<number> {
  const { readdirSync, statSync } = await import('node:fs');
  let count = 0;
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
      else if (/\.(ts|tsx)$/.test(name)) count++;
    }
  };
  walk(path.join(cwd, 'src'));
  return count;
}
