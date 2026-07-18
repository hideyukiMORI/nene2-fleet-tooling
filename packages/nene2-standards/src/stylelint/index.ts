/**
 * @hideyukimori/nene2-standards/stylelint — 配布実体（規約 05 §3.2 が意味論の正本）。
 *
 * 製品側 stylelint.config.js（コピペ正本 — 05 §3.1）:
 * `export default { extends: ['@hideyukimori/nene2-standards/stylelint'] };`
 *
 * 台帳由来 secondary（layer-components-allowlist の allowedClasses / legacy manifest の files）は
 * ここでは**未指定＝fail-closed（空集合）**。実効値は registries から機械生成した override を
 * ゲート導入 PR（W1）で合成する — 手書き列挙 MUST NOT（会議R4 AM-10/AM-13(ii)決定・G-7）。
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { Config } from 'stylelint';

import {
  parseRegistries,
  type ComponentsAllowlistEntry,
  type LegacyManifestEntry,
  type LintBaselineEntry,
  type RegistriesDocument,
} from '../registries/schema.js';

const config: Config = {
  plugins: ['@hideyukimori/nene2-standards/stylelint-plugin'],
  rules: {
    'declaration-no-important': true, // !important MUST NOT・例外なし（会議R1⑤決定）
    'selector-max-id': 0, // ID セレクタ MUST NOT（会議R1⑤決定）
    'selector-max-specificity': '0,2,0', // 単一クラス＋状態擬似/属性1個（会議R1⑤決定）
    'nene2/no-unlayered-css': true, // 無レイヤ CSS MUST NOT（themes/*.css は下で除外）
    'nene2/no-theme-inline': true, // @theme inline MUST NOT（会議R2⑥決定）
    'nene2/data-theme-selector-location': true, // [data-theme] は themes/*.css 内のみ（会議R2⑥決定）
    'nene2/layer-components-allowlist': true, // registries 許可リスト（完全一致列挙 — 会議R4 AM-10決定）
    'nene2/layer-legacy-manifest-only': true, // @layer legacy は manifest 列挙ファイルのみ（会議R3⑩M-2決定）
    'nene2/layer-base-location': true, // @layer base ブロックは base.css 内のみ（ST-08 — base の家は1つ）
    'nene2/no-reserved-sublayer-name': true, // sub-layer 名にルート6レイヤ名の再利用 MUST NOT（ST-06）
    'nene2/no-double-layer-import': true, // 自リポ CSS の @import に layer() を付けない（ST-06 — 二重指定）
    'color-no-hex': true, // 生 hex の theme 外直書き MUST NOT（会議R1⑤決定）
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'], // 色は oklch/color-mix（会議R1⑤決定）
  },
  overrides: [
    {
      // テーマファイル（非 .components）: token-only 文法（会議R4 AM-9決定）。
      // `*.css` は `*.components.css` にもマッチするため明示除外 MUST（05 §3.2 注記 —
      // 除外なしだと第2 override と順序依存の null 上書きになる）。
      // 実測（2026-07-14・stylelint 16.14 / micromatch）: 05 §3.2 起草形の `!` 否定パターンは
      // 配列内で「否定に合致しない全ファイル」を match させ override が全 CSS に適用される
      // （空虚どころか過剰適用 — fail-open）。除外は extglob `!(*.components)` で表現する
      // （配布物が正 — 文書へ追随 PR）。
      files: ['**/src/shared/ui/theme/themes/!(*.components).css'],
      rules: {
        'nene2/no-unlayered-css': null, // テーマ上書きブロックは無レイヤが正（会議R2⑥決定・実測T9）
        'nene2/themes-token-only': true,
        'nene2/data-theme-selector-location': null,
      },
    },
    {
      // .components 対は全ルール @layer components 内（会議R4 AM-9決定）
      files: ['**/src/shared/ui/theme/themes/*.components.css'],
      rules: { 'nene2/all-rules-in-components-layer': true },
    },
    {
      // base.css: @layer base の唯一の家（ST-08）。element-only 閉文法 = AM-9 token-only の双対。
      // layer-base-location はこのファイルでは当然 green になるため null 化は不要（自己一致）。
      files: ['**/src/shared/ui/theme/base.css'],
      rules: { 'nene2/base-element-only': true },
    },
  ],
};

export default config;

/**
 * 台帳由来 secondary を焼いた stylelint config を合成する（#65 — 供給経路の欠落の根治）。
 *
 * base config は `layer-components-allowlist` / `layer-legacy-manifest-only` を fail-closed（空集合）
 * で持つ。本関数は**中央 registries の当該 repo エントリ**から実効値を焼く:
 * - components-allowlist（vault/invoice 型）→ `allowedClasses`
 * - legacy-manifest（deal 型）→ `files`
 * どちらのエントリも持たない repo（payout 型・未登録）は base のまま＝fail-closed（G-6）。
 *
 * **供給元は中央 registries のみ**（被検査者=product が書けるファイルは読まない）。これにより
 * 「合成そのものを被検査者の手から取り上げる」＝G-7 を API で強制する（手書き列挙 MUST NOT）。
 */
/**
 * base config が configure する stylelint rule の語彙（core＋nene2/*）。
 * lint-baseline の rule がこの語彙内なら「合成が意味を理解できる rule」＝(rule,file) grandfather の対象。
 * 語彙外（eslint 系 noHardcodedJapanese 等）は stylelint config には無関係＝素通し。
 */
const KNOWN_STYLELINT_RULES: ReadonlySet<string> = new Set<string>([
  ...Object.keys(config.rules ?? {}),
  ...(config.overrides ?? []).flatMap((o) => Object.keys(o.rules ?? {})),
]);

export function stylelintConfigFromRegistries(doc: RegistriesDocument, repo: string): Config {
  const forRepo = doc.entries.filter((e) => e.repo === repo);
  const classes = forRepo
    .filter((e): e is ComponentsAllowlistEntry => e.kind === 'components-allowlist')
    .flatMap((e) => e.classes);
  const files = forRepo
    .filter((e): e is LegacyManifestEntry => e.kind === 'legacy-manifest')
    .map((e) => e.path);
  const rules: NonNullable<Config['rules']> = { ...config.rules };
  if (classes.length > 0) {
    rules['nene2/layer-components-allowlist'] = [true, { allowedClasses: [...classes].sort() }];
  }
  if (files.length > 0) {
    rules['nene2/layer-legacy-manifest-only'] = [true, { files: [...files].sort() }];
  }

  // (rule,file) lint-baseline を per-file grandfather の override として焼く（P2 §2・#101）。
  // 語彙内の rule が file 無しで来たら loud error（黙って未消費の座席にしない — invoice 座席事件 /
  // #92「表に無いものを黙って処理しない」と同族。file 有無 × 語彙内外の4象限を全て明示挙動に）。
  const overrides = config.overrides ? [...config.overrides] : [];
  const baselines = forRepo.filter((e): e is LintBaselineEntry => e.kind === 'lint-baseline');
  for (const b of baselines) {
    if (!KNOWN_STYLELINT_RULES.has(b.rule)) continue; // 語彙外（eslint 系）は stylelint 合成に無関係＝素通し
    if (!b.file) {
      throw new Error(
        `lint-baseline "${b.id}": rule "${b.rule}" は stylelint 語彙内だが file が無い — ` +
          `(rule,file) 粒度が必要（黙ってスキップしない・loud error — #101/A2）`,
      );
    }
    overrides.push({ files: [b.file], rules: { [b.rule]: null } });
  }

  return { ...config, rules, overrides };
}

/**
 * 製品側 stylelint.config.js のコピペ正本（#65 arm の実効部）:
 * `import { stylelintConfigFor } from '@hideyukimori/nene2-standards/stylelint';`
 * `export default stylelintConfigFor('nene-invoice');`
 *
 * **per-repo registry を読む（P2 B1）**: 既定は cwd の `registries.jsonc`（規約パス・Q1）。
 * 同梱の中央 fleet.jsonc は tarball から外れた（A-1/A-2 根治＝一般ユーザに NeNe 台帳を配らない）。
 * `opts.registriesPath` で明示注入可（run.ts/cli/テスト）。
 *
 * fail-closed:
 * - `registries.jsonc` **不在 → loud error**（silent fallback は廃止＝#92 と同族。移行手順を誘導）。
 * - 空 registries.jsonc（entries []）は valid ＝ base fail-closed で返る（payout 型＝未登録を壊さない）。
 * - 読んだ registry に**別 repo のエントリが混じる → loud error**（取り違え検出 — 別リポの
 *   registries.jsonc を偶然拾う事故を静かに通さない。B1 追加受入条件）。
 */
export function stylelintConfigFor(repo: string, opts?: { registriesPath?: string }): Config {
  const registriesPath = opts?.registriesPath ?? path.resolve(process.cwd(), 'registries.jsonc');
  if (!existsSync(registriesPath)) {
    throw new Error(
      `per-repo registry が見つからない: ${registriesPath} — ` +
        `<repo>/registries.jsonc を fleet-tooling の cross-review PR で用意する` +
        `（G-7・同梱 fallback は廃止＝P2 B1）`,
    );
  }
  const doc = parseRegistries(readFileSync(registriesPath, 'utf8')); // 形式不正は throw（fail-closed）
  const foreignRepos = [...new Set(doc.entries.map((e) => e.repo).filter((r) => r !== repo))];
  if (foreignRepos.length > 0) {
    throw new Error(
      `registry ${registriesPath} に別 repo のエントリ（${foreignRepos.join(', ')}）— ` +
        `<repo>/registries.jsonc は単一 repo（${repo}）のみ MUST（取り違え検出・B1）`,
    );
  }
  return stylelintConfigFromRegistries(doc, repo);
}
