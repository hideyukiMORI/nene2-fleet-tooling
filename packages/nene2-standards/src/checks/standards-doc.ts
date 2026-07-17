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

/**
 * 未配布注記（`[E:<rule>（未配布——…）]`）。配布 config に未有効化のルールを著者が
 * **明示注記**したもの＝意図的な W0b 送りであり、綴り誤り（missing）とは意味が違う。
 * placeholder と同種の「照合対象外」として deferred 扱いにし件数を報告する（skip は green の
 * 根拠にしない）。注記の無い不存在 rule-id は従来どおり missing（fail-open にしない）。
 * 綴りは正規化前の raw id に対して照合する（normalizeRuleId が `（…）` を落とすため）。
 */
const RULE_ID_DEFERRED_MARKER = '未配布';

/**
 * 非規範マーカー（`<!-- nonnormative -->`）。規範を「**述べる**」行でなく「**言及する/来歴を記す**」行
 * — RFC2119 定義行・根拠/是正注記・REJECTED 記録・導入文・未確定 ledger・決定ログ・メタ規約本体 等 —
 * は MUST の語を含むだけで untagged に誤計上される（#63 の誤検知）。施主確定 2026-07-17 の方式＝
 * **doc 側の明示マーキング**（heuristic な述べる/言及判定は fail-open で G-1「推測せず明示列挙」に逆行）。
 *
 * マーカーの効力は**その行のみ・MUST 監査のみ**（見出し skip と同作法）: 件数を報告し green の根拠にしない。
 * ブロックを跨いで伝染させない（fail-open 防止）。rule-id 実在照合（RAT-2）は独立軸につき影響しない。
 * HTML コメントなので描画 markdown には現れない。
 */
const NONNORMATIVE_MARKER = '<!-- nonnormative -->';

const TAG_RE = /\[([ESTGCXP])(?::([^\]]*))?\]/g;
const MUST_RE = /\bMUST(?:\s+NOT)?\b/;
const FENCE_RE = /^\s*(```|~~~)/;
/** 見出し（規範の**名前**であって本体ではない — MUST 監査の対象外）。 */
const HEADING_RE = /^\s*#{1,6}\s/;
/** 箇条書き項目の開始（`- ` `* ` `+ ` `1. `）。 */
const BULLET_RE = /^\s*(?:[-*+]|\d+\.)\s/;
/** 表の行（セル内 MUST は行ごとに独立した規範として扱う）。 */
const TABLE_ROW_RE = /^\s*\|/;
/** 空行（規範ブロックの境界）。 */
const BLANK_RE = /^\s*$/;

/** 規範ブロックの境界外＝MUST 監査の対象外を表す blockId。 */
const NO_BLOCK = -1;

/**
 * 行を「規範ブロック」へ分割する（#61 の較正 — 判定単位をソース行からブロックへ）。
 *
 * 規範ブロック = ひとつの規範文と、それに属する継続行（タグ行・出典行）の集合。
 * 文書の執筆慣習が **タグを次行に置く**ため、行単位ではタグを取りこぼす:
 *
 *     生 `fetch()` … の導入は MUST NOT。          ← 規範文
 *     `[E:no-restricted-globals]` `[E:…]`【…】   ← タグは次行（同一ブロック）
 *
 * 境界の決め方（**保守的** — 広く取りすぎると兄弟項目へタグが伝染し「空虚合格」を作る＝G-6 違反）:
 * - 空行・見出し・fence は境界。見出し自体は MUST 監査の対象外（規範の名前であって本体ではない）。
 * - **MUST を含む行はそれ自体が独立した規範**＝新しいブロックを開始する。
 *   これが無いと `MUST [T]` / `MUST [E:x]` / `MUST`（無タグ）の3連が1ブロックになり、
 *   **無タグの規範が隣の規範のタグで green になる**（実際に既存テストが捕捉した fail-open）。
 * - 箇条書き項目（`- ` 等）と表の行も各々が独立したブロックを開始する
 *   （`- A MUST NOT [E:x]` の次の `- B MUST NOT` を green にしない）。
 * - タグを寄与できるのは **MUST を持たない継続行だけ**（タグ行・出典行）。これが A-1 型を救う唯一の経路。
 */
export function segmentNormativeBlocks(lines: readonly string[]): number[] {
  const blockOf: number[] = new Array(lines.length).fill(NO_BLOCK);
  let inFence = false;
  let current = NO_BLOCK;
  let next = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      current = NO_BLOCK;
      continue;
    }
    if (inFence) continue;
    if (BLANK_RE.test(line) || HEADING_RE.test(line)) {
      current = NO_BLOCK;
      continue;
    }
    if (
      MUST_RE.test(line) ||
      BULLET_RE.test(line) ||
      TABLE_ROW_RE.test(line) ||
      current === NO_BLOCK
    ) {
      current = next++;
    }
    blockOf[i] = current;
  }
  return blockOf;
}

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

export type RuleIdStatus = 'ok' | 'missing' | 'placeholder' | 'malformed' | 'deferred';

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
  /**
   * 見出しに現れた MUST の件数（#61 — 監査対象外。見出しは規範の**名前**であって本体ではない）。
   * 観測のみ・green の根拠にしない（placeholder スキップと同じ作法）。
   */
  headingMustsSkipped: number;
  /**
   * `<!-- nonnormative -->` で明示除外した MUST 行の件数（#74 — 規範を言及する行・監査対象外）。
   * 観測のみ・green の根拠にしない（見出し skip と同じ作法）。
   */
  nonnormativeMarked: number;
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
  let headingMustsSkipped = 0;
  let nonnormativeMarked = 0;

  for (const doc of files) {
    const lines = doc.content.split('\n');
    const blockOf = segmentNormativeBlocks(lines);

    // 規範ブロックごとのタグ在庫（#61 — タグが次行にある形を強制済みと認める）。
    const blockAnyTag = new Set<number>();
    const blockMachineTag = new Set<number>();
    for (let i = 0; i < lines.length; i++) {
      const b = blockOf[i];
      if (b === undefined || b === NO_BLOCK) continue;
      for (const m of (lines[i] ?? '').matchAll(TAG_RE)) {
        const kind = m[1] as TagKind;
        if (ALL_TAG_KINDS.includes(kind)) blockAnyTag.add(b);
        if (MACHINE_TAG_KINDS.includes(kind)) blockMachineTag.add(b);
      }
    }

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

      // (i) MUST / MUST NOT のタグ欠落 — 判定単位は**規範ブロック**（#61 の較正）。
      // 見出し（blockOf = NO_BLOCK）は規範の名前であって本体ではないので監査対象外。件数のみ報告する
      // （skip は green の根拠にしない — placeholder スキップと同じ作法）。
      if (MUST_RE.test(line)) {
        const b = blockOf[i];
        if (b === undefined || b === NO_BLOCK) {
          // 見出し等は MUST 監査の対象外。ただし rule-id 照合（RAT-2）は**独立した軸**なので
          // ここで continue してはならない（見出しに付いた [E:rule-id] の実在照合が消える）。
          if (HEADING_RE.test(line)) headingMustsSkipped++;
        } else if (line.includes(NONNORMATIVE_MARKER)) {
          // 明示マーカーの行＝規範を「述べる」でなく「言及する」行。MUST 監査の対象外・件数のみ報告。
          // 行単位・明示（ブロック伝染なし）＝ fail-open にしない。rule-id 照合は下の軸で別途続行。
          nonnormativeMarked++;
        } else {
          mustTotal++;
          const hasAnyTag = blockAnyTag.has(b);
          const hasMachineTag = blockMachineTag.has(b);
          if (hasAnyTag) mustTagged++;
          if (hasMachineTag) mustMachineTagged++;
          if (!hasAnyTag) {
            untaggedMusts.push({ file: doc.path, line: i + 1, text: line.trim() });
          }
        }
      }

      for (const tag of tags) {
        // (ii) [E:rule-id] / [S:rule-id] の実在照合（bare タグは id を持たないため対象外）
        if ((tag.kind === 'E' || tag.kind === 'S') && tag.id !== null) {
          const kind = tag.kind;
          const candidate = normalizeRuleId(tag.id);
          const base = { file: tag.file, line: tag.line, raw: tag.raw, kind, candidate };
          if (tag.id.includes(RULE_ID_DEFERRED_MARKER)) {
            // 著者が「未配布」と明示注記＝意図的な W0b 送り（missing ではない）。raw id で照合。
            ruleIdFindings.push({ ...base, status: 'deferred' });
          } else if (RULE_ID_PLACEHOLDERS.has(candidate)) {
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
    `見出しの MUST ${headingMustsSkipped} 件は監査対象外（規範の名前であって本体ではない — skip は green の根拠にしない）`,
    `非規範マーカー除外 ${nonnormativeMarked} 件（言及する行 — 明示マーキング・skip は green の根拠にしない）`,
    `rule-id 照合: ok ${ruleIdFindings.filter((f) => f.status === 'ok').length} / ` +
      `missing+malformed ${ruleIdFailures.length} / placeholder スキップ ${ruleIdFindings.filter((f) => f.status === 'placeholder').length}` +
      ` / 未配布 deferred ${ruleIdFindings.filter((f) => f.status === 'deferred').length}`,
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
    headingMustsSkipped,
    nonnormativeMarked,
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
  // 出所は RAT-1（minutes:807 — check:standards-doc MUST）＋ RAT-2（:808 — lint 対応表は
  // rule metadata から生成）・満たす批准前提は RAT-3(a)。exemplars 節と軸を揃える（#47）
  out.push('## check:standards-doc（RAT-1/RAT-2・批准前提 RAT-3(a) — 規約 05 G-4・§5.2 #19）');
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
      `構文プレースホルダのスキップ ${report.ruleIdFindings.filter((f) => f.status === 'placeholder').length} 件・` +
      `未配布注記の deferred ${report.ruleIdFindings.filter((f) => f.status === 'deferred').length} 件。` +
      `[X:file#anchor] は ${report.exemplarRefsDelegated} 参照を check:exemplars へ委譲（G-2）。`,
  );
  out.push('');
  return out.join('\n');
}
