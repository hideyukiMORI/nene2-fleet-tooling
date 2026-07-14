/**
 * nene2.i18n — jsx-a11y strict＋i18n 規律（規約 05 §2.2.5・会議R1②⑦決定）。
 *
 * ハードコード日本語 3ノード・Intl 直呼び・lang 操作・shared/ui の i18n import 禁止は
 * no-restricted-{syntax,imports} — 合成規律により configs/restrictions.ts に統合済み。
 * ここに残るのは jsx-a11y strict（recommended 止まり11リポからの引き上げ — 会議R1⑦決定）のみ。
 */
import jsxA11y from 'eslint-plugin-jsx-a11y';
import type { Linter } from 'eslint';

import { APP_GLOB } from './restrictions.js';

// 推奨ルール群（plugins 登録込み）は独立オブジェクトとして合成する。
// spread の後に rules キーを置く形 MUST NOT（05 §2.2.6 注記 — files 追加は rules を潰さない）
const a11yStrict = {
  ...(jsxA11y.flatConfigs.strict as Linter.Config),
  name: 'nene2/i18n/jsx-a11y-strict',
  files: [APP_GLOB],
};

export const i18n: Linter.Config[] = [a11yStrict];
