/**
 * nene2.fsd — レイヤ境界 zones（規約 05 §2.2.2・会議R1①決定）。
 *
 * スライス跨ぎ相対 import 禁止（'../../*'）と集約バレル禁止は no-restricted-imports —
 * 合成規律により configs/restrictions.ts に統合済み（このファイルには置かない）。
 * unknown-layer / セグメント語彙 / features 兄弟 import は dependency-cruiser 側（05 §4）。
 */
import importX from 'eslint-plugin-import-x';
import type { Linter } from 'eslint';

import { APP_GLOB } from './restrictions.js';

export const fsd: Linter.Config[] = [
  {
    name: 'nene2/fsd/boundaries',
    files: [APP_GLOB],
    plugins: { 'import-x': importX as never },
    rules: {
      // レイヤ下位→上位 import 禁止（会議R1①決定・11リポの既存 zones 資産の共通化）。
      // W0a 確定値: rule prefix は import-x（eslint-plugin-import-x 採用の帰結）。
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './src/shared', from: './src', except: ['./shared'] },
            { target: './src/entities', from: './src', except: ['./entities', './shared'] },
            {
              target: './src/features',
              from: './src',
              except: ['./features', './entities', './shared'],
            },
            { target: './src/pages', from: './src/app' },
          ],
        },
      ],
    },
  },
];
