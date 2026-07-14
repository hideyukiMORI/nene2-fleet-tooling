/**
 * check:standards-doc — 規約文書の機械監査（規約 05 G-4・§5.2 #19・会議R5 RAT-1/RAT-2・AI-21）。
 *
 * 検査内容:
 * - (i)  MUST / MUST NOT 行の強制タグ欠落を FAIL 列挙（= SHOULD 格下げ棚卸しリストの自動生成 — G-1）。
 * - (ii) `[E:rule-id]` / `[S:rule-id]` を配布 flat config / Stylelint config の実在ルールと照合し、
 *        不存在は FAIL（RAT-2 — 綴りの正本は配布 config。照合対象は「off 以外の severity で
 *        実効配布されるルール」— eslint-config-prettier が off にする数百ルールを実在扱いしない）。
 * - (iii) `[X:file#anchor]` の解決は check:exemplars へ委譲（G-2 — 本検査は参照数のみ報告）。
 * - (iv) MUST 総数と機械強制カバレッジ率を出力する。90%+ / 散文 MUST 上限 60 は
 *        **SHOULD 目標の観測のみ**（G-5 補記 — 数値ゲート化 MUST NOT。本検査は数値では FAIL しない）。
 * - [P] タグの列挙制検査（G-3 — 許容綴りは bare `[P]` と `[P:process]` のみ。列挙外は FAIL）。
 *
 * 判定単位の確定（W0a 実装 = 正本 — G-4「本書内の記述は起草時ドラフト」）:
 * - 走査対象は README.md ＋ 01〜05 の6ファイル（00 は一次資料・規範ではない）。
 * - 判定は**ソース行単位**・fenced code block（``` 〜 ```）内は MUST 監査・タグ収集とも対象外
 *   （コード例内の "MUST" は条文の引用であり規範の定義ではない）。
 * - タグ綴りの構文プレースホルダ（タグ文法の説明行で使われる `rule-id` / `rule` 等）は照合をスキップ
 *   し、件数を報告する（skip は green の根拠にしない — 単に照合対象外）。
 *
 * fail-closed（G-6）: MUST 行が 1 本も見つからない = 入力が規約文書でない可能性 → unknown。
 */

import { collectExemplarRefs, type DocFile } from './exemplars.js';

export type { DocFile };

export type TagKind = 'E' | 'S' | 'T' | 'G' | 'C' | 'X' | 'P';

/** G-1 の全強制タグ。 */
const ALL_TAG_KINDS: readonly TagKind[] = ['E', 'S', 'T', 'G', 'C', 'X', 'P'];
/** 機械強制タグ（カバレッジ率の分子）。[P] はプロセス規則につき機械強制に数えない。 */
const MACHINE_TAG_KINDS: readonly TagKind[] = ['E', 'S', 'T', 'G', 'C', 'X'];

/** タグ文法説明のプレースホルダ綴り（rule-id 照合をスキップ）。 */
const RULE_ID_PLACEHOLDERS: ReadonlySet<string> = new Set(['rule-id', 'rule', '…', '...']);

const TAG_RE = /\[([ESTGCXP])(?::([^\]]*))?\]/g;
const MUST_RE = /\bMUST(?:\s+NOT)?\b/;
const FENCE_RE = /^\s*(```|~~~)/;

export interface TagOccurrence {
  kind: TagKind;
  /** `[E]` のような id なし（bare）タグは null。 */
  id: string | null;
  raw: string;
  file: string;
  line: number;
}

export interface UntaggedMust {
  file: string;
  line: number;
  text: string;
}

export type RuleIdStatus = 'ok' | 'missing' | 'placeholder' | 'malformed';

export interface RuleIdFinding {
  file: string;
  line: number;
  raw: string;
  kind: 'E' | 'S';
  /** 正規化後の照合キー（` — 注釈` / `（…）` / `(...)` を除去）。 */
  candidate: string;
  /** suffix 一致で解決した場合の配布 config 側の正準 id。 */
  resolvedTo?: string;
  status: RuleIdStatus;
}

export interface PEnumFinding {
  file: string;
  line: number;
  raw: string;
}

export interface StandardsDocReport {
  state: 'green' | 'red' | 'unknown';
  files: string[];
  mustTotal: number;
  mustTagged: number;
  mustMachineTagged: number;
  /** 機械強制カバレッジ率 = mustMachineTagged / mustTotal（mustTotal 0 のとき null）。 */
  machineCoverageRate: number | null;
  /** タグ付与率（[P] 含む） = mustTagged / mustTotal。 */
  taggedCoverageRate: number | null;
  /** G-5 補記の SHOULD 目標（観測のみ・ゲート化 MUST NOT）。 */
  targets: { machineCoverageShould: string; proseMustMaxShould: number };
  untaggedMusts: UntaggedMust[];
  /** [E]/[S] 全照合結果（ok / placeholder 含む — 透明性のため全件）。 */
  ruleIdFindings: RuleIdFinding[];
  /** ruleIdFindings のうち missing / malformed のみ（red の根拠）。 */
  ruleIdFailures: RuleIdFinding[];
  pEnumerationFailures: PEnumFinding[];
  /** check:exemplars へ委譲した [X] 参照のユニーク数（placeholder 除外後）。 */
  exemplarRefsDelegated: number;
  details: string[];
}

/** 合成済み ESLint flat config から「off 以外の severity で実効配布されるルール id」を抽出する。 */
export function enforcedEslintRuleIds(configs: ReadonlyArray<unknown>): Set<string> {
  const ids = new Set<string>();
  for (const config of configs) {
    if (typeof config !== 'object' || config === null) continue;
    const rules = (config as Record<string, unknown>)['rules'];
    if (typeof rules !== 'object' || rules === null) continue;
    for (const [ruleId, value] of Object.entries(rules)) {
      const severity: unknown = Array.isArray(value) ? value[0] : value;
      if (severity === 'error' || severity === 'warn' || severity === 1 || severity === 2) {
        ids.add(ruleId);
      }
    }
  }
  return ids;
}

/** Stylelint 共有 config（rules ＋ overrides[].rules）から非 null 設定のルール id を抽出する。 */
export function enforcedStylelintRuleIds(config: unknown): Set<string> {
  const ids = new Set<string>();
  if (typeof config !== 'object' || config === null) return ids;
  const collect = (rules: unknown): void => {
    if (typeof rules !== 'object' || rules === null) return;
    for (const [ruleId, value] of Object.entries(rules)) {
      if (value !== null && value !== undefined && value !== false) ids.add(ruleId);
    }
  };
  collect((config as Record<string, unknown>)['rules']);
  const overrides = (config as Record<string, unknown>)['overrides'];
  if (Array.isArray(overrides)) {
    for (const o of overrides) {
      if (typeof o === 'object' && o !== null) collect((o as Record<string, unknown>)['rules']);
    }
  }
  return ids;
}

/** タグ id → 照合キーへの正規化（` — 注釈` / 全角括弧 / 半角括弧サフィックスを除去）。 */
export function normalizeRuleId(id: string): string {
  let s = id;
  const emDash = s.indexOf(' — ');
  if (emDash >= 0) s = s.slice(0, emDash);
  s = s.replace(/（.*$/u, '');
  s = s.replace(/\(.*$/, '');
  return s.trim();
}

/** 実在照合: 完全一致 → plugin prefix を除いた suffix 一致（`themes-token-only` = `nene2/themes-token-only`）。 */
function resolveRuleId(candidate: string, ids: ReadonlySet<string>): string | null {
  if (ids.has(candidate)) return candidate;
  const suffix = '/' + candidate;
  for (const id of ids) if (id.endsWith(suffix)) return id;
  return null;
}

export interface AuditOptions {
  eslintRuleIds: ReadonlySet<string>;
  stylelintRuleIds: ReadonlySet<string>;
}

export function auditStandardsDoc(
  files: readonly DocFile[],
  options: AuditOptions,
): StandardsDocReport {
  const untaggedMusts: UntaggedMust[] = [];
  const ruleIdFindings: RuleIdFinding[] = [];
  const pEnumerationFailures: PEnumFinding[] = [];
  let mustTotal = 0;
  let mustTagged = 0;
  let mustMachineTagged = 0;

  for (const doc of files) {
    const lines = doc.content.split('\n');
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (FENCE_RE.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;

      const tags: TagOccurrence[] = [];
      for (const m of line.matchAll(TAG_RE)) {
        const kind = m[1] as TagKind;
        tags.push({ kind, id: m[2] ?? null, raw: m[0], file: doc.path, line: i + 1 });
      }

      // (i) MUST / MUST NOT 行のタグ欠落
      if (MUST_RE.test(line)) {
        mustTotal++;
        const hasAnyTag = tags.some((t) => ALL_TAG_KINDS.includes(t.kind));
        const hasMachineTag = tags.some((t) => MACHINE_TAG_KINDS.includes(t.kind));
        if (hasAnyTag) mustTagged++;
        if (hasMachineTag) mustMachineTagged++;
        if (!hasAnyTag) {
          untaggedMusts.push({ file: doc.path, line: i + 1, text: line.trim() });
        }
      }

      for (const tag of tags) {
        // (ii) [E:rule-id] / [S:rule-id] の実在照合（bare タグは id を持たないため対象外）
        if ((tag.kind === 'E' || tag.kind === 'S') && tag.id !== null) {
          const kind = tag.kind;
          const candidate = normalizeRuleId(tag.id);
          const base = { file: tag.file, line: tag.line, raw: tag.raw, kind, candidate };
          if (RULE_ID_PLACEHOLDERS.has(candidate)) {
            ruleIdFindings.push({ ...base, status: 'placeholder' });
          } else if (candidate === '') {
            ruleIdFindings.push({ ...base, status: 'malformed' });
          } else {
            const ids = kind === 'E' ? options.eslintRuleIds : options.stylelintRuleIds;
            const resolved = resolveRuleId(candidate, ids);
            if (resolved === null) {
              ruleIdFindings.push({ ...base, status: 'missing' });
            } else if (resolved === candidate) {
              ruleIdFindings.push({ ...base, status: 'ok' });
            } else {
              ruleIdFindings.push({ ...base, status: 'ok', resolvedTo: resolved });
            }
          }
        }
        // G-3: [P] の列挙制（許容綴りは bare [P] と [P:process] のみ）
        if (tag.kind === 'P' && tag.id !== null && tag.id !== 'process') {
          pEnumerationFailures.push({ file: tag.file, line: tag.line, raw: tag.raw });
        }
      }
    }
  }

  // (iii) [X] は check:exemplars へ委譲 — ユニーク参照数のみ報告
  const { refs } = collectExemplarRefs(files);
  const ruleIdFailures = ruleIdFindings.filter(
    (f) => f.status === 'missing' || f.status === 'malformed',
  );

  const details: string[] = [];
  if (mustTotal === 0) {
    details.push(
      'MUST 行が 1 本も見つからない — 入力が規約文書でない可能性（fail-closed で unknown）',
    );
  }
  details.push(
    `MUST 総数 ${mustTotal}（タグ付き ${mustTagged}・機械強制タグ付き ${mustMachineTagged}・タグ欠落 ${untaggedMusts.length}）`,
    `rule-id 照合: ok ${ruleIdFindings.filter((f) => f.status === 'ok').length} / ` +
      `missing+malformed ${ruleIdFailures.length} / placeholder スキップ ${ruleIdFindings.filter((f) => f.status === 'placeholder').length}`,
    `[P] 列挙外 ${pEnumerationFailures.length}・[X] 委譲 ${refs.length} 参照（解決は check:exemplars）`,
  );

  const red =
    untaggedMusts.length > 0 || ruleIdFailures.length > 0 || pEnumerationFailures.length > 0;
  return {
    state: mustTotal === 0 ? 'unknown' : red ? 'red' : 'green',
    files: files.map((f) => f.path),
    mustTotal,
    mustTagged,
    mustMachineTagged,
    machineCoverageRate: mustTotal === 0 ? null : mustMachineTagged / mustTotal,
    taggedCoverageRate: mustTotal === 0 ? null : mustTagged / mustTotal,
    targets: {
      machineCoverageShould: '90%+（G-5 補記 — SHOULD 観測のみ・数値ゲート化 MUST NOT）',
      proseMustMaxShould: 60,
    },
    untaggedMusts,
    ruleIdFindings,
    ruleIdFailures,
    pEnumerationFailures,
    exemplarRefsDelegated: refs.length,
    details,
  };
}

function pct(rate: number | null): string {
  return rate === null ? 'n/a' : `${(rate * 100).toFixed(1)}%`;
}

/** 初回 red リスト（docs/ratification-red-list）用の決定的 Markdown レンダラ。 */
export function renderStandardsDocMarkdown(report: StandardsDocReport): string {
  const out: string[] = [];
  out.push('## check:standards-doc（RAT-1/RAT-2 — 規約 05 G-4・§5.2 #19）');
  out.push('');
  out.push(`- 判定: **${report.state}**`);
  out.push(`- 走査ファイル: ${report.files.join(' / ')}`);
  out.push(
    `- MUST 総数: **${report.mustTotal}**（タグ付き ${report.mustTagged}・タグ欠落 **${report.untaggedMusts.length}**）`,
  );
  out.push(
    `- 機械強制カバレッジ率（[E][S][T][G][C][X] / MUST 総数）: **${pct(report.machineCoverageRate)}**` +
      `（タグ付与率 [P] 込み: ${pct(report.taggedCoverageRate)}）`,
  );
  out.push(
    `- SHOULD 目標（観測のみ — G-5 補記・ゲート化 MUST NOT）: 機械強制 90%+ / 散文 MUST 上限 60` +
      `（実測 ${report.mustTotal} — 上限比 ${report.mustTotal > 60 ? '超過' : '以内'}）`,
  );
  out.push('');
  out.push(
    `### タグ欠落 MUST（${report.untaggedMusts.length} 件 — SHOULD 格下げ棚卸しリスト・G-1）`,
  );
  out.push('');
  if (report.untaggedMusts.length === 0) {
    out.push('なし');
  } else {
    out.push('| ファイル | 行 | 条文（先頭 120 字） |');
    out.push('|---|---|---|');
    for (const m of report.untaggedMusts) {
      const text = m.text.replaceAll('|', '\\|').slice(0, 120);
      out.push(`| ${m.file} | ${m.line} | ${text} |`);
    }
  }
  out.push('');
  out.push(`### 不存在 rule-id（${report.ruleIdFailures.length} 件 — RAT-2 実在照合 FAIL）`);
  out.push('');
  if (report.ruleIdFailures.length === 0) {
    out.push('なし');
  } else {
    out.push('| ファイル | 行 | タグ | 照合キー | 状態 |');
    out.push('|---|---|---|---|---|');
    for (const f of report.ruleIdFailures) {
      const raw = f.raw.replaceAll('|', '\\|');
      out.push(
        `| ${f.file} | ${f.line} | \`${raw}\` | \`${f.candidate || '（空）'}\` | ${f.status} |`,
      );
    }
  }
  out.push('');
  out.push(`### [P] 列挙外タグ（${report.pEnumerationFailures.length} 件 — G-3）`);
  out.push('');
  if (report.pEnumerationFailures.length === 0) {
    out.push('なし');
  } else {
    for (const p of report.pEnumerationFailures) {
      out.push(`- ${p.file}:${p.line} \`${p.raw}\``);
    }
  }
  out.push('');
  out.push(
    `補足: rule-id 照合 ok ${report.ruleIdFindings.filter((f) => f.status === 'ok').length} 件` +
      `（うち prefix 補完解決 ${report.ruleIdFindings.filter((f) => f.resolvedTo !== undefined).length} 件）・` +
      `構文プレースホルダのスキップ ${report.ruleIdFindings.filter((f) => f.status === 'placeholder').length} 件。` +
      `[X:file#anchor] は ${report.exemplarRefsDelegated} 参照を check:exemplars へ委譲（G-2）。`,
  );
  out.push('');
  return out.join('\n');
}
