/**
 * A1 codemod（hooks→model 横断移行・fleet#66）の公開 API。
 * migration-only（ロジック不変・move + import rewrite だけ）。施主裁定 07-17: DOM hook も (A) model/ 一律。
 */
export { applyA1, planMoves, type A1Result, type MoveEntry } from './move.js';
export {
  default as hooksToModelTransform,
  moveKeyOf,
  rewriteHooksSegment,
  type HooksToModelOptions,
} from './transform.js';
