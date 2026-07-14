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
 * fail-closed（G-6）: [X] 参照が 1 件も見つからない = 入力が規約文書でない可能性 → unknown。
 *
 * 未実施（スコープ外の明記）: registries の dangling reason-ref 解決（05 §5.2 #18 の同一機構適用）は
 * W0b — 本実装は規約文書の [X] のみを対象とする。
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

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
  | 'anchor-missing';

export interface ExemplarFinding extends ExemplarRef {
  status: ExemplarStatus;
  detail: string;
}

export interface ExemplarsReport {
  state: 'green' | 'red' | 'unknown';
  fleetRoot: string;
  /** placeholder 除外後のユニーク参照数。 */
  refTotal: number;
  resolved: number;
  placeholdersSkipped: string[];
  findings: ExemplarFinding[];
  failures: ExemplarFinding[];
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

function classify(ref: ExemplarRef, fleetRoot: string): ExemplarFinding {
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
  const abs = path.join(fleetRoot, target);
  let isFile = false;
  try {
    isFile = existsSync(abs) && statSync(abs).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) {
    return { ...ref, status: 'file-missing', detail: `参照先ファイルが存在しない: ${target}` };
  }
  const body = readFileSync(abs, 'utf8');
  if (!body.includes(`[${anchor}]`)) {
    return {
      ...ref,
      status: 'anchor-missing',
      detail: `アンカーコメント \`[${anchor}]\` が ${target} に未植栽`,
    };
  }
  return { ...ref, status: 'resolved', detail: `${target} で解決` };
}

export interface CheckExemplarsOptions {
  files: readonly DocFile[];
  /** 実リポ群の親ディレクトリ（例: /home/xi/docker）。 */
  fleetRoot: string;
}

export function checkExemplars(options: CheckExemplarsOptions): ExemplarsReport {
  const { refs, placeholders } = collectExemplarRefs(options.files);
  const findings = refs
    .map((r) => classify(r, options.fleetRoot))
    .sort((a, b) => a.content.localeCompare(b.content));
  const failures = findings.filter((f) => f.status !== 'resolved');
  const resolved = findings.length - failures.length;

  const details: string[] = [];
  if (findings.length === 0) {
    details.push(
      '[X] 参照が 1 件も見つからない — 入力が規約文書でない可能性（fail-closed で unknown）',
    );
  }
  details.push(
    `[X] ユニーク参照 ${findings.length} 件: resolved ${resolved} / ` +
      `失敗 ${failures.length}（placeholder スキップ ${placeholders.length}）`,
  );

  return {
    state: findings.length === 0 ? 'unknown' : failures.length > 0 ? 'red' : 'green',
    fleetRoot: options.fleetRoot,
    refTotal: findings.length,
    resolved,
    placeholdersSkipped: placeholders,
    findings,
    failures,
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
  out.push(
    `- ユニーク [X] 参照: **${report.refTotal}**（resolved ${report.resolved} / 失敗 **${report.failures.length}**・` +
      `placeholder スキップ ${report.placeholdersSkipped.length}）`,
  );
  out.push('');
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
