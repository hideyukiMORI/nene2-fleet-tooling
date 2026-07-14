export {
  CONTRACT_VERSION,
  CONTRACT_TOKENS,
  CONTRACT_CATEGORIES,
  COLOR_KEYS,
  SHADOW_KEYS,
  COLOR_TOKEN_NAMES,
  SHADOW_TOKEN_NAMES,
  CONTRAST_PAIRS,
  EXTENSION_TOKEN_PATTERN,
  RESERVED_TOKEN_NAMES,
  ORDINAL_SUFFIX_PATTERN,
  SYNONYM_BANS,
  EXCLUDED_NAMESPACES,
  isContractTokenName,
  isExtensionTokenName,
} from './contract.js';
export type {
  ColorTokenKey,
  ShadowTokenKey,
  ColorTokenName,
  ShadowTokenName,
  ContractTokenName,
  ContractCategory,
  ContrastPair,
} from './contract.js';

export { validateThemeSource } from './validate.js';
export type { Diagnostic, ValidateOptions, ValidateResult } from './validate.js';

export {
  THEMEGEN_VERSION,
  generateTheme,
  extractTheme,
  fillSource,
  toPlain,
  toTheme,
  computeFillForScope,
  canonicalCompare,
  ThemegenError,
} from './themegen.js';
export type { ThemeDocument, GenerateOptions, ExtractOptions } from './themegen.js';

export {
  CODEMOD_MAP_V1,
  CODEMOD_MAP_VERSION,
  COMMON_TABLE,
  ORIGIN_TABLE,
  VAULT_TABLE,
  REMEDIATION_V1,
  mapTokenName,
} from './codemod-map.js';
export type { MappingTableId, RemediationItem } from './codemod-map.js';

export { FROZEN_CONTRACT_VERSION, checkContractFreeze } from './release-gate.js';
export type { FreezeRecord, CurrentContract, GateOptions, GateResult } from './release-gate.js';

export { parseThemeFile, isRootScopeSelector } from './parser.js';
export type { ParsedThemeFile, Block, Decl, Pragma } from './parser.js';

export { resolveBlock, transitiveDependents } from './resolve.js';
export {
  contrastRatio,
  parseOklchLiteral,
  mixOklch,
  relativeLuminance,
  ColorEvalError,
} from './color.js';
export type { Oklch } from './color.js';
export { GrammarError, parseTokenValue, parseColorTerm } from './grammar.js';
