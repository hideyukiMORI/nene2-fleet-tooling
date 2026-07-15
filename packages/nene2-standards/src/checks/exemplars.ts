/**
 * check:exemplars — [X:file#anchor] ポインタの全解決検査（規約 05 G-2・§5.2 #18・会議R4 AM-15）。
 *
 * - `[X:<repo>/<path>#nene2-exemplar:<name>]` を実リポ（fleetRoot/<repo>/<path>）の
 *   アンカーコメント `[nene2-exemplar:<name>]` の実在と突合する。
 * - 行番号参照（`path.ts:12` / `#L12` 等）は FAIL（G-2 — 行番号 MUST NOT）。
 * - `file#anchor` 形式でない参照・`nene2-exemplar:` プレフィックスのない anchor は
 *   malformed FAIL（README §8 ④ でアンカー形式は `nene2-exemplar:` に統一済み）。
 * - 参照は fenced code block 内も含めて全量収集する（コード例内の [X] も実参照 — G-2「全解決」）。
 * - タグ文法説明のプレースホルダ（`[X:file#anchor]` / `[X:…#anchor]` / `[X:...]` / `[X:]`）は
 *   照合対象外としてスキップ・件数を報告する。
 *
 * **読み取り源は origin/main が既定**（規約 02 A-10 — 準拠判定の正は origin/main ＋ CI・commit SHA 併記
 * MUST `[P]`）。作業ツリー読みは参考値であり、`worktreeSource` を明示的に渡した場合のみ（#37）。
 * A-10 の根拠事故（stale なローカル grep による誤った準拠主張）を検査器が再生産していた是正。
 *
 * fail-closed（G-6・CF-1）:
 * - [X] 参照が 1 件も見つからない = 入力が規約文書でない可能性 → unknown。
 * - 参照先リポが検査不能（fetch 不能・ref 解決不能）→ unknown。red とも green とも言わない。
 *
 * 未実施（スコープ外の明記）: registries の dangling reason-ref 解決（05 §5.2 #18 の同一機構適用）は
 * W0b — 本実装は規約文書の [X] のみを対象とする。
 */
import path from 'node:path';

import type { ExemplarSource } from './exemplar-source.js';

export interface DocFile {
  path: string;
  content: string;
}

const X_REF_RE = /\[X:([^\]]*)\]/g;

/** タグ文法説明のプレースホルダ綴り（照合スキップ）。 */
const X_PLACEHOLDERS: ReadonlySet<string> = new Set(['file#anchor', '…#anchor', '...', '…', '']);

const ANCHOR_PREFIX = 'nene2-exemplar:';
const ANCHOR_RE = /^nene2-exemplar:[A-Za-z0-9_-]+$/;
const LINE_NUMBER_PATH_RE = /:\d+(?:[-–]\d+)?$/;
const LINE_NUMBER_ANCHOR_RE = /^L?\d+(?:[-–]\d+)?$/;

export interface ExemplarOccurrence {
  file: string;
  line: number;
}

export interface ExemplarRef {
  /** `[X:` と `]` を除いた参照本体。 */
  content: string;
  occurrences: ExemplarOccurrence[];
}

export type ExemplarStatus =
  | 'resolved'
  | 'malformed'
  | 'line-number'
  | 'file-missing'
  | 'anchor-missing'
  /** 参照先リポが検査不能（fetch 不能等）。red ではなく unknown へ寄与する（CF-1）。 */
  | 'repo-unavailable';

export interface ExemplarFinding extends ExemplarRef {
  status: ExemplarStatus;
  detail: string;
}

/** 検査対象リポの来歴（A-10 — 準拠状況の記載には commit SHA 併記 MUST `[P]`）。 */
export interface RepoProvenance {
  repo: string;
  sha: string | null;
  /** 検査不能の理由（null = 検査できた）。 */
  unavailableReason: string | null;
}

export interface ExemplarsReport {
  state: 'green' | 'red' | 'unknown';
  fleetRoot: string;
  /** 読み取り源のラベル（'origin/main（fetch 済み）' 等）。 */
  source: string;
  /** 読み取り源が A-10 の言う準拠判定の正か（false = 参考値・批准前提の主張に使えない）。 */
  authoritative: boolean;
  /** 検査対象リポの SHA 一覧（A-10 の SHA 併記 MUST — repo 昇順で決定的）。 */
  repos: RepoProvenance[];
  /** placeholder 除外後のユニーク参照数。 */
  refTotal: number;
  resolved: number;
  placeholdersSkipped: string[];
  findings: ExemplarFinding[];
  failures: ExemplarFinding[];
  /** 検査不能（unknown 寄与）— failures とは別腕。 */
  unavailable: ExemplarFinding[];
  details: string[];
}

/** 全文書から [X:...] 参照をユニーク収集する（fence 内含む・出現位置つき）。 */
export function collectExemplarRefs(files: readonly DocFile[]): {
  refs: ExemplarRef[];
  placeholders: string[];
} {
  const byContent = new Map<string, ExemplarRef>();
  const placeholders = new Set<string>();
  for (const doc of files) {
    const lines = doc.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const m of (lines[i] ?? '').matchAll(X_REF_RE)) {
        const content = m[1] ?? '';
        if (X_PLACEHOLDERS.has(content)) {
          placeholders.add(`[X:${content}]`);
          continue;
        }
        const existing = byContent.get(content);
        const occurrence = { file: doc.path, line: i + 1 };
        if (existing) existing.occurrences.push(occurrence);
        else byContent.set(content, { content, occurrences: [occurrence] });
      }
    }
  }
  return { refs: [...byContent.values()], placeholders: [...placeholders].sort() };
}

function classify(ref: ExemplarRef, source: ExemplarSource): ExemplarFinding {
  const hash = ref.content.indexOf('#');
  if (hash < 0) {
    return {
      ...ref,
      status: 'malformed',
      detail: '`file#anchor` 形式でない（G-2 — 散文ショートハンドは実行可能ポインタにならない）',
    };
  }
  const target = ref.content.slice(0, hash);
  const anchor = ref.content.slice(hash + 1);

  if (LINE_NUMBER_PATH_RE.test(target) || LINE_NUMBER_ANCHOR_RE.test(anchor)) {
    return { ...ref, status: 'line-number', detail: '行番号参照は MUST NOT（G-2・AM-15）' };
  }
  if (!ANCHOR_RE.test(anchor)) {
    return {
      ...ref,
      status: 'malformed',
      detail: `anchor が \`${ANCHOR_PREFIX}<name>\` 形式でない（README §8 ④ の統一形式）`,
    };
  }
  if (target === '' || path.isAbsolute(target) || target.split('/').includes('..')) {
    return { ...ref, status: 'malformed', detail: 'パスは fleet ルート相対の repo/path 形式 MUST' };
  }
  const slash = target.indexOf('/');
  if (slash <= 0 || slash === target.length - 1) {
    return {
      ...ref,
      status: 'malformed',
      detail: 'パスは fleet ルート相対の `repo/path` 形式 MUST（repo 名から始まる）',
    };
  }
  const repo = target.slice(0, slash);
  const relPath = target.slice(slash + 1);

  const state = source.resolveRepo(repo);
  if (state.kind === 'unavailable') {
    // 検査不能を red と言うと「アンカーが無い」という嘘の主張になる（A-10 の事故の型）
    return {
      ...ref,
      status: 'repo-unavailable',
      detail: `${repo} を ${source.label} で検査できない: ${state.reason}`,
    };
  }

  const body = source.readFile(repo, relPath);
  if (body === null) {
    return {
      ...ref,
      status: 'file-missing',
      detail: `参照先ファイルが存在しない: ${target}（${source.label}）`,
    };
  }
  if (!body.includes(`[${anchor}]`)) {
    return {
      ...ref,
      status: 'anchor-missing',
      detail: `アンカーコメント \`[${anchor}]\` が ${target} に未植栽（${source.label}）`,
    };
  }
  return { ...ref, status: 'resolved', detail: `${target} で解決（${source.label}）` };
}

export interface CheckExemplarsOptions {
  files: readonly DocFile[];
  /**
   * 読み取り源。A-10 準拠の既定は `gitRefSource({ fleetRoot })`（origin/main）。
   * `worktreeSource(fleetRoot)` は参考値であり準拠判定に使えない。
   */
  source: ExemplarSource;
}

export function checkExemplars(options: CheckExemplarsOptions): ExemplarsReport {
  const { source } = options;
  const { refs, placeholders } = collectExemplarRefs(options.files);
  const findings = refs
    .map((r) => classify(r, source))
    .sort((a, b) => a.content.localeCompare(b.content));
  const unavailable = findings.filter((f) => f.status === 'repo-unavailable');
  const failures = findings.filter(
    (f) => f.status !== 'resolved' && f.status !== 'repo-unavailable',
  );
  const resolved = findings.filter((f) => f.status === 'resolved').length;

  // A-10: 準拠状況の記載には commit SHA 併記 MUST。検査に触れた repo を昇順で列挙する
  const repos: RepoProvenance[] = [
    ...new Set(
      findings
        .map((f) => {
          const target = f.content.slice(0, Math.max(0, f.content.indexOf('#')));
          const slash = target.indexOf('/');
          return slash > 0 ? target.slice(0, slash) : null;
        })
        .filter((r): r is string => r !== null),
    ),
  ]
    .sort()
    .map((repo) => {
      const state = source.resolveRepo(repo);
      return state.kind === 'ready'
        ? { repo, sha: state.sha, unavailableReason: null }
        : { repo, sha: null, unavailableReason: state.reason };
    });

  const details: string[] = [];
  if (findings.length === 0) {
    details.push(
      '[X] 参照が 1 件も見つからない — 入力が規約文書でない可能性（fail-closed で unknown）',
    );
  }
  if (unavailable.length > 0) {
    details.push(
      `検査不能 ${unavailable.length} 件 — fail-closed で unknown（CF-1。検査できていないことを ` +
        'red と言うと「アンカーが無い」という嘘の主張になる）',
    );
  }
  if (!source.authoritative) {
    details.push(
      `読み取り源が ${source.label} — この出力は A-10 により**参考値**であり、` +
        '準拠判定・批准前提の主張には使えない',
    );
  }
  details.push(
    `[X] ユニーク参照 ${findings.length} 件: resolved ${resolved} / ` +
      `失敗 ${failures.length} / 検査不能 ${unavailable.length}` +
      `（placeholder スキップ ${placeholders.length}・源 ${source.label}）`,
  );

  const state: ExemplarsReport['state'] =
    findings.length === 0 || unavailable.length > 0
      ? 'unknown'
      : failures.length > 0
        ? 'red'
        : 'green';

  return {
    state,
    fleetRoot: source.fleetRoot,
    source: source.label,
    authoritative: source.authoritative,
    repos,
    refTotal: findings.length,
    resolved,
    placeholdersSkipped: placeholders,
    findings,
    failures,
    unavailable,
    details,
  };
}

/** 初回 red リスト（docs/ratification-red-list）用の決定的 Markdown レンダラ。 */
export function renderExemplarsMarkdown(report: ExemplarsReport): string {
  const out: string[] = [];
  out.push('## check:exemplars（RAT-3(a) — 規約 05 G-2・§5.2 #18）');
  out.push('');
  out.push(`- 判定: **${report.state}**`);
  out.push(`- fleet ルート: ${report.fleetRoot}`);
  out.push(`- 読み取り源: **${report.source}**`);
  if (!report.authoritative) {
    out.push(
      '- ⚠️ **この出力は参考値**（A-10 — 準拠判定の正は origin/main ＋ CI。批准前提の主張に使えない）',
    );
  }
  out.push(
    `- ユニーク [X] 参照: **${report.refTotal}**（resolved ${report.resolved} / 失敗 **${report.failures.length}** / ` +
      `検査不能 ${report.unavailable.length}・placeholder スキップ ${report.placeholdersSkipped.length}）`,
  );
  out.push('');
  out.push('### 検査対象リポの来歴（A-10 — commit SHA 併記 MUST `[P]`）');
  out.push('');
  if (report.repos.length === 0) {
    out.push('なし');
  } else {
    out.push('| repo | commit SHA | 検査可否 |');
    out.push('|---|---|---|');
    for (const r of report.repos) {
      out.push(
        `| ${r.repo} | ${r.sha ?? '—'} | ${r.unavailableReason === null ? 'ok' : `**検査不能** — ${r.unavailableReason.replaceAll('|', '\\|')}`} |`,
      );
    }
  }
  out.push('');
  if (report.unavailable.length > 0) {
    out.push(`### 検査不能 [X]（${report.unavailable.length} 件 — unknown 寄与・CF-1）`);
    out.push('');
    for (const f of report.unavailable) {
      out.push(`- \`[X:${f.content}]\` — ${f.detail}`);
    }
    out.push('');
  }
  out.push(`### 未解決 [X]（${report.failures.length} 件）`);
  out.push('');
  if (report.failures.length === 0) {
    out.push('なし');
  } else {
    out.push('| 参照 | 状態 | 詳細 | 出現箇所 |');
    out.push('|---|---|---|---|');
    for (const f of report.failures) {
      const refCell = `\`[X:${f.content.replaceAll('|', '\\|')}]\``;
      const where = f.occurrences.map((o) => `${o.file}:${o.line}`).join('<br>');
      out.push(`| ${refCell} | ${f.status} | ${f.detail.replaceAll('|', '\\|')} | ${where} |`);
    }
  }
  out.push('');
  if (report.resolved > 0) {
    out.push(`### 解決済み [X]（${report.resolved} 件）`);
    out.push('');
    for (const f of report.findings.filter((x) => x.status === 'resolved')) {
      out.push(`- \`[X:${f.content}]\``);
    }
    out.push('');
  }
  return out.join('\n');
}
