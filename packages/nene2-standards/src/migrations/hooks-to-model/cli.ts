#!/usr/bin/env node
/**
 * A1 codemod CLI — hooks→model 移行（fleet#66）。各リナが自リポで叩く versioned 実行物。
 *
 *   npx nene2-a1-hooks-to-model <frontend/src> [--dry-run]
 *
 * `--dry-run` は fs を触らず plan（move 対象・movedHooks）だけを出力する。
 * 本適用は per-product PR で（手作業移設 MUST NOT＝#15/W1）。マージは施主承認後。
 */
import { applyA1 } from './move.js';

function main(): number {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const srcRoot = args.find((a) => !a.startsWith('--'));
  if (!srcRoot) {
    console.error('usage: nene2-a1-hooks-to-model <frontend/src ディレクトリ> [--dry-run]');
    return 2;
  }
  const result = applyA1(srcRoot, { dryRun });
  console.log(JSON.stringify(result, null, 2));
  console.error(
    `A1 ${dryRun ? '(dry-run) ' : ''}move ${result.moves.length} 件 / rewrite ${result.rewritten.length} ファイル`,
  );
  return 0;
}

process.exit(main());
