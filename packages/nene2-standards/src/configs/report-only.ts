/**
 * `reportOnly` — ゲート導入段（report-only）の降格ブロックを配布側で持つ（#189・hub 裁定 2026-07-30）。
 *
 * ## なぜ配布側に置くか
 *
 * 2026-07-30 の origin / field 導入で、各艦が同じ降格コードを書いた結果 **3つの事故形**が出た:
 *
 * 1. `Object.keys(canonical).map(r => [r, 'warn'])` — severity を捨てるため、canonical が
 *    **意図的に off にしている 386件**（eslint-config-prettier 由来の衝突回避セット）まで武装し、
 *    未定義プラグインの解決が要求されて **config 読み込み自体が落ちる**。
 *    武装側で解こうとすると 12 名前空間（`@stylistic` / `vue` / `flowtype` …）の install が必要で
 *    構造的に不可能（field 実測）。→ **off のルールは降格対象から外す**。
 * 2. runtime 導出（現在の canonical から毎回作る）は、**canonical が将来追加するルールまで黙って
 *    off に吸収する**。導入段の台帳は「今ある負債」を凍結するものなので、追加分は素通しにせず
 *    差分としてレビューに出したい。→ **既定は凍結台帳（呼び出し側が rule id を渡す）**。
 * 3. `warn` へ落とせば CI が緑になるとは限らない。**両艦とも `eslint . --max-warnings 0`** で、
 *    warn は赤だった。→ **既定 severity は `off`**（負債は conformance / gate-integrity の red と
 *    週次 rollup 側で見える。lint を緑に保つことと負債を隠すことは別）。
 *
 * ## 使い方（艦側）
 *
 * ```js
 * import nene2 from '@hideyukimori/nene2-standards';
 * import { canonicalOff } from './eslint.canonical-off.js'; // 生成物（下記の生成器で作る）
 *
 * export default tseslint.config(
 *   { ignores: [...] },
 *   // canonical は**艦自前ブロックより前**に置く（後勝ちで艦の既存ゲートを守る — §摩擦6）
 *   ...nene2.base, ...nene2.fsd, ...nene2.api, ...nene2.stylingWith(),
 *   nene2.reportOnly({ ruleIds: canonicalOff }),
 *   ...艦自前のブロック,
 *   nene2.toolingExemption(), // どの tsconfig にも属さない JS ツーリング（§摩擦5）
 * );
 * ```
 *
 * 台帳の生成は `renderReportOnlyLedger()` を使う（手書き列挙 MUST NOT — AM-10/G-7 と同旨）。
 */
import type { Linter } from 'eslint';

import { api } from './api.js';
import { base } from './base.js';
import { fsd } from './fsd.js';
import { styling, stylingWith } from './styling.js';

/** 導入段で降格に使う severity。`off` 既定 = 艦の `--max-warnings 0` を壊さない。 */
export type ReportOnlySeverity = 'off' | 'warn';

export interface ReportOnlyOptions {
  /**
   * 降格対象のルール id（**凍結台帳**）。`renderReportOnlyLedger()` の生成物を渡す。
   * ここに無いルールは降格されない ＝ canonical が後から追加したものは
   * canonical の severity で発火し、差分としてレビューに出る（意図した挙動）。
   */
  ruleIds: readonly string[];
  /** 既定 `'off'`。`'warn'` は「warning を許容する CI」の艦だけが選ぶ。 */
  severity?: ReportOnlySeverity;
  /** 既定は全ファイル（`files` を付けない）。座席を絞る艦だけが渡す。 */
  files?: string[];
  /** config オブジェクト名。既定 `'nene2/report-only'`。 */
  name?: string;
}

export interface CanonicalAxesOptions {
  /** `stylingWith()` に渡す Tailwind エントリ（艦の実配置）。 */
  entryPoint?: string;
}

const severityOf = (entry: Linter.RuleEntry | undefined): unknown =>
  Array.isArray(entry) ? entry[0] : entry;

const isOff = (entry: Linter.RuleEntry | undefined): boolean => {
  const s = severityOf(entry);
  return s === 0 || s === 'off';
};

/**
 * 導入段で展開する4軸（i18n / testing は導入段では展開しない — #189 摩擦2）。
 *
 * `entryPoint` 未指定なら **`styling`（正準エントリで組んだ静的版）**を使う。`stylingWith()` は
 * エントリの実在を cwd 基準で確認して fail-loud に throw するので、台帳生成やルール id の
 * 問い合わせ（＝艦の cwd で走るとは限らない）で呼ぶと、艦の配置と無関係に落ちる。
 * `composedConfig()` が `styling` を使っているのと同じ理由。
 */
function introductionAxes(options: CanonicalAxesOptions = {}): Linter.Config[] {
  const stylingAxis = options.entryPoint
    ? stylingWith({ entryPoint: options.entryPoint })
    : styling;
  return [...base, ...fsd, ...api, ...stylingAxis];
}

/**
 * canonical が **武装している**（severity > 0）ルール id を返す。
 * off のものは含めない（含めると降格で武装してしまい config が落ちる — 事故形1）。
 */
export function canonicalRuleIds(options: CanonicalAxesOptions = {}): string[] {
  const merged: Record<string, Linter.RuleEntry> = {};
  for (const block of introductionAxes(options)) Object.assign(merged, block.rules ?? {});
  return Object.entries(merged)
    .filter(([, entry]) => !isOff(entry))
    .map(([id]) => id)
    .sort();
}

/**
 * 凍結台帳が canonical に追随できていない差分を返す（台帳に無い = 降格されず発火する）。
 * 艦の CI / conformance が「台帳が stale」を機械的に言えるようにするための問い合わせ口。
 */
export function reportOnlyStaleRules(
  ruleIds: readonly string[],
  options: CanonicalAxesOptions = {},
): string[] {
  const frozen = new Set(ruleIds);
  return canonicalRuleIds(options).filter((id) => !frozen.has(id));
}

/**
 * 降格ブロックを返す。渡された rule id を一律 `severity` にする。
 *
 * **canonical の off を武装させない**ため、ここでは渡された id をそのまま使う
 * （`canonicalRuleIds()` が既に off を除いている）。台帳を手書きした艦が off のルールを
 * 混ぜてきた場合も `'off'` 既定なら無害で、`'warn'` 指定時のみ危険なので fail-loud にする。
 */
export function reportOnly(options: ReportOnlyOptions): Linter.Config {
  const { ruleIds, severity = 'off', files, name = 'nene2/report-only' } = options;

  if (severity === 'warn') {
    // canonical が off にしているルールを warn に上げると、未定義プラグインの解決が要求されて
    // config 読み込みが落ちる（#189 摩擦3 の事故形そのもの）。静かに通さず、ここで止める。
    const canonOff = new Set(
      introductionAxes()
        .flatMap((b) => Object.entries(b.rules ?? {}))
        .filter(([, entry]) => isOff(entry))
        .map(([id]) => id),
    );
    const armed = ruleIds.filter((id) => canonOff.has(id));
    if (armed.length > 0) {
      throw new Error(
        `[nene2/reportOnly] canonical が off にしているルールを 'warn' で武装させようとしている（${armed.length}件）: ` +
          `${armed.slice(0, 5).join(', ')}${armed.length > 5 ? ' …' : ''}\n` +
          'これらは eslint-config-prettier 由来の衝突回避セットで、武装するとプラグイン解決が' +
          '要求され config 読み込みが落ちる（#189 摩擦3）。台帳は renderReportOnlyLedger() で生成すること。',
      );
    }
  }

  const rules = Object.fromEntries(ruleIds.map((id) => [id, severity])) as Linter.RulesRecord;
  return files ? { name, files, rules } : { name, rules };
}

/**
 * どの TS プログラムにも属さないツーリングファイルの除外ブロック（#189 摩擦5）。
 *
 * canonical は `parserOptions.projectService: true` を全ファイルに宣言するので、
 * `allowJs` の無い艦では `.js` / `.mjs` / `.cjs` が
 * `Parsing error: ... was not found by the project service` になる。
 * **パースエラーは severity 降格の対象外**なので report-only では緑にできない。
 *
 * ⚠️ 艦が既に同等の除外（`ignores` や `disableTypeChecked` ブロック）を **canonical より後ろに**
 * 持っているなら不要（origin は既に持っていたので追加作業 0 だった）。
 */
export function toolingExemption(options: { files?: string[]; name?: string } = {}): Linter.Config {
  const {
    files = ['**/*.js', '**/*.mjs', '**/*.cjs', 'eslint.config.js'],
    name = 'nene2/tooling-exemption',
  } = options;
  return { name, files, languageOptions: { parserOptions: { projectService: false } } };
}

/**
 * 凍結台帳ファイルの中身を生成する（**生成器を配布側に持つ** — 各艦が写経しないため）。
 *
 * 艦側は3行のスクリプトで足りる:
 * ```js
 * import { renderReportOnlyLedger } from '@hideyukimori/nene2-standards';
 * import { writeFileSync } from 'node:fs';
 * writeFileSync('eslint.canonical-off.js', renderReportOnlyLedger({ entryPoint: 'src/index.css' }));
 * ```
 */
export function renderReportOnlyLedger(
  options: CanonicalAxesOptions & { standardsVersion?: string; exportName?: string } = {},
): string {
  const { standardsVersion, exportName = 'canonicalOff' } = options;
  const ids = canonicalRuleIds(options);
  const isBareKey = (id: string): boolean => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id);
  const body = ids.map((id) => `  ${isBareKey(id) ? id : `'${id}'`},`).join('\n');
  return [
    '// 自動生成物 — 手で編集しない（再生成: 艦の生成スクリプト）。',
    '//',
    '// nene2-standards の canonical が **武装している**ルール id の凍結台帳。',
    '// ゲート導入段（report-only）で nene2.reportOnly({ ruleIds }) に渡す。',
    '//',
    '// canonical が後から追加したルールはこの台帳に無いので降格されず、canonical の severity で',
    '// 発火する ＝ 新しい負債が黙って吸収されない（差分としてレビューに出る）。追随するときは',
    '// 再生成し、増えた行を意図的にレビューすること。',
    standardsVersion ? `//\n// 生成時の @hideyukimori/nene2-standards: ${standardsVersion}` : '//',
    `// ルール数: ${ids.length}`,
    '',
    `export const ${exportName} = [`,
    body,
    '];',
    '',
  ].join('\n');
}
