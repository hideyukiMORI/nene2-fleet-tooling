/**
 * resolveBlock — ブロック完成形（authored ∪ fill・root なら root 単独／局所なら root と
 * マージ済みの宣言集合）に対する静的色解決器。
 *
 * F-3/F-4（R5 AM-1 最終形）: contrast 検査は root と局所スコープで **この同一実装** を使う
 * （解決器2実装の禁止）。参照クロージャ（AM-4）と同じ参照グラフ上で評価する。
 */

import {
  ColorEvalError,
  KEYWORD_COLORS,
  mixOklch,
  parseOklchLiteral,
  type Oklch,
} from './color.js';
import { parseColorTerm, type ColorTerm } from './grammar.js';

export interface ResolvedBlock {
  /** トークン名 → 静的評価済み oklch（色として評価できたもののみ） */
  resolveColor(name: string): Oklch;
}

/**
 * 宣言集合（name → 生値文字列）から色解決器を作る純関数。
 * - 悬空参照・循環参照・閉文法外は ColorEvalError（fail-closed）。
 */
export function resolveBlock(decls: ReadonlyMap<string, string>): ResolvedBlock {
  const memo = new Map<string, Oklch>();

  const evalTerm = (term: ColorTerm, stack: string[]): Oklch => {
    switch (term.type) {
      case 'keyword':
        return KEYWORD_COLORS[term.name]!;
      case 'oklch':
        return parseOklchLiteral(term.text);
      case 'var':
        return evalName(term.name, stack);
      case 'mix': {
        const [a, b] = term.items;
        if (!a || !b) throw new ColorEvalError('color-mix needs two items');
        let wa = a.weight;
        let wb = b.weight;
        if (wa === undefined && wb === undefined) {
          wa = 50;
          wb = 50;
        } else if (wa === undefined) {
          wa = 100 - wb!;
        } else if (wb === undefined) {
          wb = 100 - wa;
        }
        return mixOklch(evalTerm(a.term, stack), wa!, evalTerm(b.term, stack), wb!);
      }
    }
  };

  const evalName = (name: string, stack: string[]): Oklch => {
    const cached = memo.get(name);
    if (cached) return cached;
    if (stack.includes(name)) {
      throw new ColorEvalError(`circular var() reference: ${[...stack, name].join(' → ')}`);
    }
    const raw = decls.get(name);
    if (raw === undefined) {
      throw new ColorEvalError(`dangling var() reference: '${name}' is not declared in this block`);
    }
    const term = parseColorTerm(raw); // GrammarError → fail-closed
    const value = evalTerm(term, [...stack, name]);
    memo.set(name, value);
    return value;
  };

  return {
    resolveColor: (name) => evalName(name, []),
  };
}

/**
 * 参照グラフ（AM-4: 契約キー限定ではなく、宣言された **全トークン** の var() 参照グラフ）。
 * 返り値: name → その値が直接参照する var 名集合。
 */
export function referenceGraph(
  decls: ReadonlyMap<string, { refs: Set<string> }>,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const [name, parsed] of decls) graph.set(name, parsed.refs);
  return graph;
}

/** X に（推移的に）依存するトークン集合（X 自身は含まない） */
export function transitiveDependents(
  graph: ReadonlyMap<string, Set<string>>,
  target: string,
): Set<string> {
  const dependents = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, refs] of graph) {
      if (dependents.has(name) || name === target) continue;
      for (const r of refs) {
        if (r === target || dependents.has(r)) {
          dependents.add(name);
          changed = true;
          break;
        }
      }
    }
  }
  return dependents;
}
