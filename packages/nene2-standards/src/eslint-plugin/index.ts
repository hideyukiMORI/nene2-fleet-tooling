/**
 * nene2 custom ESLint plugin（配布 config に同梱 — 製品側 plugins 追加 MUST NOT）。
 * rule prefix: `nene2/`（W0a 確定値 — RAT-2 生成表の入力）。
 */
import type { ESLint } from 'eslint';

import { stylePropCssVarsOnly } from './style-prop-css-vars-only.js';

export const nene2Plugin: ESLint.Plugin = {
  meta: { name: '@hideyukimori/nene2-standards', version: '1.0.0' },
  rules: {
    'style-prop-css-vars-only': stylePropCssVarsOnly,
  },
};
