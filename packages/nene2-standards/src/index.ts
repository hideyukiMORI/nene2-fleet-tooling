/**
 * @hideyukimori/nene2-standards — NeNe フリート・フロント統一規約の配布 lint config。
 *
 * 製品側 eslint.config.js（コピペ正本 — 規約 05 §2.1）:
 *
 * ```js
 * import nene2 from '@hideyukimori/nene2-standards';
 * export default [
 *   ...nene2.base, ...nene2.fsd, ...nene2.api,
 *   ...nene2.stylingWith(), ...nene2.i18n, ...nene2.testing,
 * ];
 * ```
 */
import type { Linter } from 'eslint';

import { api } from './configs/api.js';
import { base } from './configs/base.js';
import { fsd } from './configs/fsd.js';
import { i18n } from './configs/i18n.js';
import { overrides } from './configs/overrides.js';
import { styling, stylingWith, CANONICAL_THEME_ENTRY } from './configs/styling.js';
import type { StylingOptions } from './configs/styling.js';
import { testing } from './configs/testing.js';

export { api, base, fsd, i18n, overrides, styling, stylingWith, CANONICAL_THEME_ENTRY, testing };
export type { StylingOptions };
export { nene2Plugin } from './eslint-plugin/index.js';
export {
  API_FETCH_SYNTAX,
  I18N_RUNTIME_SYNTAX,
  STYLING_SYNTAX,
  TESTING_SYNTAX,
} from './selectors.js';
export { I18N_JP_SYNTAX } from './configs/restrictions.js';
export {
  ALL_KINDS,
  DEBT_KINDS,
  STRUCTURAL_KINDS,
  REGISTRIES_SCHEMA_ID,
  WAIVER_MAX_DAYS,
  parseRegistries,
  stripJsonc,
  validateRegistries,
} from './registries/schema.js';
export type {
  RegistriesDocument,
  RegistryDiagnostic,
  RegistryEntry,
  RegistryKind,
} from './registries/schema.js';

/** 全断片の正準合成（gate-integrity の canonical 表・パッケージテストの検出プローブが使用）。 */
export function composedConfig(): Linter.Config[] {
  return [...base, ...fsd, ...api, ...styling, ...i18n, ...testing];
}

const nene2 = { base, fsd, api, styling, stylingWith, i18n, testing, overrides };
export default nene2;

export {
  CONFORMANCE_KEYS,
  CONFORMANCE_SCHEMA_ID,
  validateConformance,
} from './checks/conformance.js';
export type { ConformanceKey, ConformanceVector, KeyState } from './checks/conformance.js';
export { checkGateIntegrity, canonicalSeverityTable } from './checks/gate-integrity.js';
export { checkScanCoverage } from './checks/scan-coverage.js';
export { initScan, initCheck } from './checks/init-scan.js';
export { runConformance } from './checks/run.js';
export {
  auditStandardsDoc,
  enforcedEslintRuleIds,
  enforcedStylelintRuleIds,
  normalizeRuleId,
  renderStandardsDocMarkdown,
} from './checks/standards-doc.js';
export type { StandardsDocReport, RuleIdFinding, UntaggedMust } from './checks/standards-doc.js';
export {
  checkExemplars,
  collectExemplarRefs,
  renderExemplarsMarkdown,
} from './checks/exemplars.js';
export type {
  DocFile,
  ExemplarFinding,
  ExemplarsReport,
  ExemplarStatus,
} from './checks/exemplars.js';
