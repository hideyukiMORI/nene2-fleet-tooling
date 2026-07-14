/**
 * nene2.testing — testing-library / vitest 規律（規約 05 §2.2.6・会議R2⑧決定）。
 *
 * vi.mock(fetch|client) 禁止・getByTestId 制限は no-restricted-syntax —
 * 合成規律により configs/restrictions.ts（syntax-tests 集合）に統合済み。
 */
import testingLibrary from 'eslint-plugin-testing-library';
import type { Linter } from 'eslint';

import { TEST_FILE_GLOBS } from './restrictions.js';

export const testing: Linter.Config[] = [
  {
    // 推奨ルール群（plugins 登録込み）は独立オブジェクトとして合成する。
    // {files, ...spread, rules: {…}} の形 MUST NOT — spread の後に rules キーを置くと
    // spread 側の推奨ルール群が丸ごと潰れる（05 §2.2.6・2026-07-14 レビュー反映）
    ...(testingLibrary.configs['flat/react'] as Linter.Config),
    name: 'nene2/testing/react-recommended',
    files: TEST_FILE_GLOBS,
  },
  {
    name: 'nene2/testing/queries',
    files: TEST_FILE_GLOBS,
    rules: {
      // クエリ優先順位: getByRole(name付き) > getByLabelText > getByText > その他（会議R2⑧決定）
      'testing-library/prefer-screen-queries': 'error',
      'testing-library/no-container': 'error',
      'testing-library/prefer-presence-queries': 'error',
    },
  },
];
