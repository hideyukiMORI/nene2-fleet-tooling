/**
 * A1 codemod — hooks→model 移行の import rewrite（jscodeshift transform・fleet#66）。
 *
 * 規約 01:99「hook は model/ に置く」・01:266「hook ファイルは `use-<kebab>.ts(x)`・model/ 配下」。
 * この transform は **move されるフックへの相対 import を書き換える**だけ（ロジック不変・migration-only）:
 *
 *   import { useDealDetailPage } from '../hooks/use-deal-detail-page'
 *   → import { useDealDetailPage } from '../model/use-deal-detail-page'
 *
 * 設計上の要点（3リナ pre-stage の特異ケースを反映）:
 * - **move 対象だけ書き換える**: `options.movedHooks`（`"<slice>/<basename>"` の集合）に含まれる
 *   フックへの参照のみ。move されない hook（deal use-kanban-dnd = DOM/interaction・fail-closed 保留）は保存する。
 * - **命名は (a) ディレクトリ移動のみ**（`hooks/`→`model/` の1セグメント置換・`use-` は落とさない・
 *   basename 不変）。リネームしないので **named export / import 識別子は不変**（jscodeshift は識別子を触らない）。
 * - **`import type` を温存**: `ImportDeclaration.importKind` と specifier の importKind は書き換えないので、
 *   deal DealDetailView の `import type { DealDetailStatus } from '../hooks/…'`（型のみ相対 import）も型のまま。
 * - **barrel（index.ts）の re-export も同一規則**: `export { … } from './hooks/…'` /
 *   `export type { … } from './hooks/…'` は ExportNamedDeclaration の source として同じ置換を受ける。
 *
 * 標準の jscodeshift transform 署名。ファイルの move（fs）は姉妹モジュール `move.ts` の責務で、
 * この transform は move 後（または move と同時）に全 `.ts/.tsx` へ適用して参照を追随させる。
 */
import type { API, FileInfo, Options, Transform } from 'jscodeshift';

export interface HooksToModelOptions extends Options {
  /**
   * move されるフックの識別集合。各要素は `"<slice>/<basename>"`
   * （例 `"deal-detail/use-deal-detail-page"`・拡張子なし）。
   * import path をこの集合と突き合わせ、該当するものだけ `hooks/`→`model/` に書き換える。
   */
  movedHooks?: ReadonlyArray<string>;
}

/** `./hooks/use-x` `../<slice>/hooks/use-x` から `<slice>/<basename>` を取り出す（相対 import のみ）。 */
export function moveKeyOf(importPath: string): string | null {
  if (!importPath.startsWith('.')) return null; // スライス跨ぎは @/ 絶対 → 対象外
  // 同一スライス内の hooks/ 参照（slice 名を持たない）を先に判定（`.` を slice と誤認しないため）:
  // `./hooks/use-x`（hooks 隣接ファイルから）と `../hooks/use-x`（ui/ 等の子セグメントから）。
  // FSD ではスライス跨ぎは @/ 絶対（01:128）なので `../hooks/` は必ず同一スライス。
  const same = importPath.match(/^\.\.?\/hooks\/(use-[^/]+?)(?:\.tsx?)?$/);
  if (same) return `*/${same[1]}`; // ワイルドカードスライス（basename で緩く照合）
  // 別スライス `../<slice>/hooks/use-x`（slice 名は `.`/`..` で始まらない）
  const m = importPath.match(/\/([^/.][^/]*)\/hooks\/(use-[^/]+?)(?:\.tsx?)?$/);
  if (m) return `${m[1]}/${m[2]}`;
  return null;
}

/** import path の `hooks/` セグメントを `model/` に置換（basename・拡張子・use- は不変）。 */
export function rewriteHooksSegment(importPath: string): string {
  return importPath.replace(/(^|\/)hooks\/(use-)/, '$1model/$2');
}

/**
 * movedHooks に該当するか。`<slice>/<basename>` の完全一致、または同一スライス相対
 * （moveKeyOf がワイルドカードスライスを返した場合）は basename 一致で許可
 * （同一スライス内の `./hooks/use-x` は import 元がその slice 内なので安全）。
 */
function isMoved(moveKey: string, movedHooks: ReadonlyArray<string>): boolean {
  if (movedHooks.includes(moveKey)) return true;
  if (moveKey.startsWith('*/')) {
    const base = moveKey.slice(2);
    return movedHooks.some((k) => k.endsWith('/' + base));
  }
  return false;
}

const transform: Transform = (file: FileInfo, api: API, options: HooksToModelOptions) => {
  const j = api.jscodeshift;
  const root = j(file.source);
  const movedHooks = options.movedHooks ?? [];
  let changed = false;

  // import ... from '…/hooks/use-x' と export ... from '…/hooks/use-x'（barrel re-export）の両方。
  const sources = [
    ...root.find(j.ImportDeclaration).paths(),
    ...root.find(j.ExportNamedDeclaration).paths(),
    ...root.find(j.ExportAllDeclaration).paths(),
  ];

  for (const p of sources) {
    const src = p.node.source;
    if (!src || typeof src.value !== 'string') continue;
    const importPath = src.value;
    const key = moveKeyOf(importPath);
    if (key === null) continue;
    if (!isMoved(key, movedHooks)) continue; // move されない hook（DOM 等）は保存
    const next = rewriteHooksSegment(importPath);
    if (next !== importPath) {
      src.value = next;
      changed = true;
    }
  }

  return changed ? root.toSource({ quote: 'single' }) : file.source;
};

export default transform;
