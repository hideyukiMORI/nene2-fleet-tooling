/**
 * A1 codemod — move ランナー＋オーケストレーション（fleet#66・施主裁定 07-17）。
 *
 * 施主裁定①（07-17）で **DOM/interaction hook も (A) model/ 一律**へ確定したため、
 * move 対象は「barrel が re-export する page hook」に限らず **全 `features/<slice>/hooks/use-*.{ts,tsx}`**
 * （併置 test 含む・use-kanban-dnd 等の DOM hook 含む）。分類判定は不要になった。
 *
 * 手順（migration-only・ロジック不変）:
 *   1. `features/<slice>/hooks/use-*.{ts,tsx}` を列挙（実装＋併置 test）
 *   2. `hooks/` → `model/` へ fs move（model/ を作成・空になった hooks/ を削除）
 *   3. src 配下の全 `.ts/.tsx` に import rewrite transform を適用（barrel index.ts の re-export も追随）
 *
 * `dryRun` で move/書換を行わず plan だけ返す（各リナが自リポで確認してから適用するため）。
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import jscodeshift from 'jscodeshift';

import transform from './transform.js';

const tsx = jscodeshift.withParser('tsx');

export interface MoveEntry {
  slice: string;
  /** 拡張子つきファイル名（例 `use-login.ts` / `use-login.test.tsx`）。 */
  file: string;
  from: string;
  to: string;
}

export interface A1Result {
  moves: MoveEntry[];
  /** transform に渡す `"<slice>/<basename>"`（実装・test を basename で正規化した集合）。 */
  movedHooks: string[];
  /** import rewrite で実際に書き換わったファイル（相対パス）。 */
  rewritten: string[];
  dryRun: boolean;
}

const HOOK_FILE_RE = /^use-.+\.tsx?$/;

/** `use-login.ts` / `use-login.test.tsx` → `use-login`（実装と test を同一キーへ）。 */
function baseKey(file: string): string {
  return file.replace(/\.(test\.)?tsx?$/, '');
}

/** features 配下の `hooks/use-*.{ts,tsx}`（実装＋test）を列挙。 */
export function planMoves(featuresDir: string): MoveEntry[] {
  const entries: MoveEntry[] = [];
  if (!existsSync(featuresDir)) return entries;
  for (const slice of readdirSync(featuresDir, { withFileTypes: true })) {
    if (!slice.isDirectory()) continue;
    const hooksDir = path.join(featuresDir, slice.name, 'hooks');
    if (!existsSync(hooksDir)) continue;
    for (const f of readdirSync(hooksDir)) {
      if (!HOOK_FILE_RE.test(f)) continue;
      entries.push({
        slice: slice.name,
        file: f,
        from: path.join(hooksDir, f),
        to: path.join(featuresDir, slice.name, 'model', f),
      });
    }
  }
  return entries;
}

/** src 配下の全 `.ts/.tsx` を列挙（node_modules/dist は除外）。 */
function allSourceFiles(srcRoot: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(e.name)) out.push(full);
    }
  };
  walk(srcRoot);
  return out;
}

function rewriteFile(absPath: string, movedHooks: string[]): boolean {
  const source = readFileSync(absPath, 'utf8');
  const api = { jscodeshift: tsx, j: tsx, stats: () => {}, report: () => {} };
  const next = transform({ source, path: absPath }, api as never, { movedHooks });
  if (typeof next === 'string' && next !== source) {
    writeFileSync(absPath, next);
    return true;
  }
  return false;
}

/**
 * srcRoot（`…/frontend/src`）に A1 を適用する。
 * dryRun=true なら fs を触らず plan（moves / movedHooks）だけ返す。
 */
export function applyA1(srcRoot: string, opts: { dryRun?: boolean } = {}): A1Result {
  const dryRun = opts.dryRun ?? false;
  const featuresDir = path.join(srcRoot, 'features');
  const moves = planMoves(featuresDir);
  const movedHooks = [...new Set(moves.map((m) => `${m.slice}/${baseKey(m.file)}`))];

  if (dryRun) return { moves, movedHooks, rewritten: [], dryRun: true };

  // 1. fs move（model/ 作成 → rename → 空 hooks/ 削除）
  const touchedHooksDirs = new Set<string>();
  for (const m of moves) {
    mkdirSync(path.dirname(m.to), { recursive: true });
    renameSync(m.from, m.to);
    touchedHooksDirs.add(path.dirname(m.from));
  }
  for (const d of touchedHooksDirs) {
    if (existsSync(d) && readdirSync(d).length === 0) rmdirSync(d);
  }

  // 2. import rewrite（全 .ts/.tsx・move 後のパスに対して）
  const rewritten: string[] = [];
  for (const f of allSourceFiles(srcRoot)) {
    if (rewriteFile(f, movedHooks)) rewritten.push(path.relative(srcRoot, f));
  }

  return { moves, movedHooks, rewritten, dryRun: false };
}
