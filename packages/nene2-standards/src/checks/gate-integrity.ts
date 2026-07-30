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
import { detectTailwind, TAILWIND_DEPENDENT_RULES } from './tailwind-presence.js';

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

  // Tailwind 実 entry を要求する検査器は、非 Tailwind 艦では「検査不能」であって「緩和」ではない
  // （#163・concierge 照会 + fleet 横断実測。非 Tailwind は concierge/serve/corpus/suite の4艦）。
  // 4艦に同じ差異登録を手書きさせるのは G-7 に反するので canonical 側（ここ）で表現する。
  // 判定は**依存の実測**（艦の申告ではない）— 「styling 軸を展開していない」を理由に外すと
  // 「外せば緩和が消える」抜け道になる。
  const tailwind = detectTailwind(cwd);
  const outOfScope = new Set(tailwind.present ? [] : TAILWIND_DEPENDENT_RULES);

  const details: string[] = [];
  const skipped: string[] = [];
  for (let i = 0; i < canonTable.length; i++) {
    const canon = canonTable[i];
    const prod = productTable[i];
    if (!canon || !prod) continue;
    if (outOfScope.has(canon.rule)) {
      // 対象外は**黙って飛ばさない**（隠れた不検査を作らないため・G-6 の趣旨）。
      if (!skipped.includes(canon.rule)) skipped.push(canon.rule);
      continue;
    }
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

  // 対象外にしたルールは green/red のどちらでも必ず出す（「何を見ていないか」を隠さない）。
  const scopeNote =
    skipped.length > 0
      ? [
          `照合対象外 ${skipped.length}件（Tailwind 非依存艦のため）: ${skipped.join(', ')}` +
            ` — 判定根拠: ${tailwind.reason}。Tailwind 実 entry を要する検査器は非 Tailwind 艦では` +
            `検査不能であって緩和ではない（#163）。`,
        ]
      : [];

  // green の KeyState はスキーマ（nene2-conformance/1）が details を持たないので、
  // green のときは付けられない。**代わりに `gateIntegrityScope()` で機械可読に外へ出す**
  // （呼び出し側＝レポートや他レーンが「何を見ていないか」を取れる）。
  // green に details を持たせるのはスキーマ変更＝凍結明けの案件（本 PR の射程外）。
  if (details.length === 0) return { state: 'green' };
  return { state: 'red', details: [...details, ...scopeNote] };
}

/**
 * この艦で **照合対象から外れるルール**とその根拠（#163）。
 *
 * `checkGateIntegrity` が green を返したときは KeyState に details を積めない
 * （`nene2-conformance/1` の green は details を持たない）ため、「何を見ていないか」は
 * ここから取る。**黙って飛ばした対象外を作らない**ための問い合わせ口。
 */
export function gateIntegrityScope(cwd: string): { excluded: string[]; reason: string } {
  const tailwind = detectTailwind(cwd);
  return {
    excluded: tailwind.present ? [] : [...TAILWIND_DEPENDENT_RULES],
    reason: tailwind.present
      ? `Tailwind 依存を実測（${tailwind.reason}）— 全ルールが照合対象`
      : `Tailwind 非依存（${tailwind.reason}）— Tailwind 実 entry を要する検査器は検査不能であり緩和ではない（#163）`,
  };
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
