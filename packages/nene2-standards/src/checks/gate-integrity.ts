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
  //
  // ⚠️ ここは「艦が未導入」だけでなく「**測る cwd を間違えた**」でも来る。field 実測（2026-07-30）:
  // 同一 commit・同一コマンドで cwd をリポ直下にすると適用0（unknown）・`frontend/` にすると red。
  // fail-closed なので誤って green にはならないが、**測り方の誤りと艦の欠陥が同じ出力**になるので
  // 測り直し手順を details に書く（#193 の crashed 内訳と同型の手当て）。
  const applied = await countAppliedFiles(cwd);
  if (applied === 0) {
    return {
      state: 'unknown',
      reason: 'not-installed',
      details: [
        `適用ファイル数 0（${cwd} 配下に src/**/*.{ts,tsx} が無い）— G-6 により green ではなく unknown`,
        '切り分け: フロントが下位ディレクトリにある艦（frontend/ 等）をリポ直下から測るとこの形になる。' +
          'src/** を持つディレクトリ（例: frontend/）で実行して測り直すこと。',
      ],
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

  // crashed はどちら側で落ちたかを details に書く（#193）。両者を1つの try で束ねていたため、
  // 「製品 config が読めない」と「配布 config 自身が壊れている」が同じ出力になっていた。
  // 2026-07-30 に origin で観測した crashed は再現条件が特定できず（5通りの統制条件で再現せず・
  // 未導入 config でも計器は red を返す）、**次に出たときに切り分けられる情報が無かった**ことが
  // 調査を止めた直接の原因だった。分類は変えない（crashed は crashed のまま = G-6）。
  let productTable: SeverityCell[];
  let canonTable: SeverityCell[];
  try {
    productTable = await severityTable(productEslint, cwd);
  } catch (e) {
    const message = (e as Error).message;
    // 配布パッケージ自体が解決できない = **依存が入っていない**（= not-installed）。
    // 「壊れている（crashed）」ではないので区別する。2026-07-30 に field で実測した形:
    // 導入 PR はマージ済み・CI は緑なのに、測定した checkout で `npm install` が未実行だと
    // 製品 config の `import nene2 from '@hideyukimori/nene2-standards'` が解決できず、
    // 「艦の欠陥」と見分けのつかない crashed になっていた（**測定前提の未充足**）。
    // 分類は unknown のまま（fail-closed は維持・G-6）。reason を正確にするだけ。
    if (/Cannot find (?:package|module) '@hideyukimori\//.test(message)) {
      return {
        state: 'unknown',
        reason: 'not-installed',
        details: [
          `製品 config が配布パッケージを解決できない（cwd=${cwd}）: ${message}`,
          '切り分け: 艦に依存が入っていない（未導入、または測定した checkout で npm install 未実行）。' +
            '導入済みの艦を測る場合は、その checkout で依存を入れてから測り直すこと。',
        ],
      };
    }
    return {
      state: 'unknown',
      reason: 'crashed',
      details: [
        `製品 config の実効 severity 取得で例外（cwd=${cwd}）: ${message}`,
        '切り分け: 製品側（艦の eslint.config.js とその依存）で落ちている。canonical 側は未評価。',
      ],
    };
  }
  try {
    canonTable = await canonicalSeverityTable(cwd);
  } catch (e) {
    return {
      state: 'unknown',
      reason: 'crashed',
      details: [
        `canonical 表の導出で例外（cwd=${cwd}）: ${(e as Error).message}`,
        '切り分け: 配布 config（composedConfig）側で落ちている。製品 config の読み込みは成功した。',
      ],
    };
  }

  const details: string[] = [];
  for (let i = 0; i < canonTable.length; i++) {
    const canon = canonTable[i];
    const prod = productTable[i];
    if (!canon || !prod) continue;
    // ルール不在（severity null）と off（0）は**同じ実効挙動**（そのルールは走らない）。
    // 不在を -1 に落とすと「canonical が off・製品が不在」を緩和と誤検出する（#178 実測: origin の
    // `no-restricted-globals: 実効 -1 < canonical 0`）。緩和とは「canonical が走らせるものを
    // 製品が走らせない/弱める」ことなので、走らない同士の比較は差ではない。
    const sevCanon = canon.severity ?? 0;
    const sevProd = prod.severity ?? 0;
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
