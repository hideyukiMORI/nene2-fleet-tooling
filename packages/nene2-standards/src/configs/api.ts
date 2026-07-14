/**
 * nene2.api — 単一チョークポイント（規約 05 §2.2.3・会議R3④A-1/A-2/A-6/A-7・R5 AM-20決定）。
 *
 * 合成規律（05 §2.2 冒頭）の帰結として、fsd×api×styling×i18n×testing に跨る
 * no-restricted-{syntax,imports,globals} の統合定義群（configs/restrictions.ts）は
 * この api 断片が収容する（関心別断片のうち順序先頭の restricted 系断片）。
 * 意味論の帰属は selectors.ts / restricted-imports.ts のコメントが正。
 */
import type { Linter } from 'eslint';

import { restrictions } from './restrictions.js';

export const api: Linter.Config[] = [...restrictions];
