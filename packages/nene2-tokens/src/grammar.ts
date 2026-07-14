/**
 * TK-04 値の閉文法 — 正確な EBNF の正本（規約 03 §9.9 の W0 確定・配布物が正）。
 *
 *   color-value  ::= color-term
 *   color-term   ::= oklch-literal              (アルファ付き oklch(L C H / A) 形を含む)
 *                  | var-ref                     (同一ファイル内定義済みトークンのみ — 悬空は error)
 *                  | color-mix                   (in oklch のみ)
 *                  | keyword                     (transparent | white | black — AM-6)
 *   color-mix    ::= 'color-mix(' 'in oklch' ',' mix-item ',' mix-item ')'
 *   mix-item     ::= color-term [ <percentage> ] (重みパーセンテージは任意)
 *   var-ref      ::= 'var(' <custom-property-name> ')'   (fallback 値は不可 — 第2の正本を作らない)
 *   shadow-value ::= shadow-layer (',' shadow-layer)*
 *   shadow-layer ::= ['inset'] <length>{2,4} [ color-term ]
 *   composite    ::= (x- 拡張・非 color/shadow カテゴリ) length/number/percentage/identifier/
 *                    string/var-ref/color-term の列。hex・rgb()・hsl()・currentColor・initial は error
 *
 * currentColor は不可（静的評価不能 — contrast CI の実装可能性条件を壊す・AM-6/R4 REJECTED）。
 */

export class GrammarError extends Error {}

export interface OklchNode {
  type: 'oklch';
  text: string;
}
export interface VarNode {
  type: 'var';
  name: string;
}
export interface KeywordNode {
  type: 'keyword';
  name: 'transparent' | 'white' | 'black';
}
export interface MixNode {
  type: 'mix';
  items: { term: ColorTerm; weight?: number }[];
}
export type ColorTerm = OklchNode | VarNode | KeywordNode | MixNode;

/** トップレベル（括弧の外）だけで区切る split */
export function splitTop(text: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/** トップレベルの空白区切りトークン化（関数呼び出し・クォート文字列は1トークン） */
export function tokenizeTop(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  for (const ch of text) {
    if (quote !== null) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

const PERCENT = /^-?\d+(?:\.\d+)?%$/;
const LENGTH = /^-?(?:\d+(?:\.\d+)?)(?:px|rem|em)$|^0$/;
/** composite（非 color/shadow カテゴリ）で許す数値系: 長さ・時間・角度・比率 */
const DIMENSION = /^-?(?:\d+(?:\.\d+)?)(?:px|rem|em|ms|s|deg|vh|vw|ch|fr|%)?$/;
/** composite で許す数値引数のみの関数（cubic-bezier 等 — records 現物較正） */
const NUMERIC_FUNCTION = /^[a-z-]+\(\s*-?\d[\d.,\s%-]*\)$/;
const BANNED_VALUE =
  /(^|[\s,(])(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|hwb\(|lab\(|lch\(|currentColor|initial|inherit|unset|revert)/;

function assertNotBanned(text: string): void {
  const m = BANNED_VALUE.exec(text);
  if (m) {
    throw new GrammarError(
      `'${m[2]}' is outside the closed grammar (allowed: oklch() / var() / color-mix(in oklch, …) / transparent|white|black)`,
    );
  }
}

/** color-term のパース（閉文法外は GrammarError） */
export function parseColorTerm(raw: string): ColorTerm {
  const text = raw.trim();
  assertNotBanned(text);
  if (text === 'transparent' || text === 'white' || text === 'black') {
    return { type: 'keyword', name: text };
  }
  if (/^oklch\(/i.test(text)) {
    if (!/^oklch\([^()]*\)$/i.test(text)) {
      throw new GrammarError(`malformed oklch() literal: '${text}'`);
    }
    return { type: 'oklch', text };
  }
  if (/^var\(/i.test(text)) {
    const m = /^var\(\s*(--[a-zA-Z0-9-]+)\s*\)$/.exec(text);
    if (!m) {
      throw new GrammarError(
        `malformed var() (fallback values are not allowed — a fallback would be a second source of truth): '${text}'`,
      );
    }
    return { type: 'var', name: m[1]! };
  }
  if (/^color-mix\(/i.test(text)) {
    const inner = text.replace(/^color-mix\(/i, '').replace(/\)$/, '');
    if (!text.endsWith(')')) throw new GrammarError(`malformed color-mix(): '${text}'`);
    const parts = splitTop(inner, ',');
    if (parts.length !== 3) {
      throw new GrammarError(`color-mix() must have exactly 'in oklch' + 2 items: '${text}'`);
    }
    if (parts[0] !== 'in oklch') {
      throw new GrammarError(
        `color-mix() interpolation space must be 'in oklch' (got '${parts[0]}')`,
      );
    }
    const items = parts.slice(1).map((p) => {
      const toks = tokenizeTop(p);
      if (toks.length === 1) return { term: parseColorTerm(toks[0]!) };
      if (toks.length === 2 && PERCENT.test(toks[1]!)) {
        return { term: parseColorTerm(toks[0]!), weight: Number(toks[1]!.slice(0, -1)) };
      }
      if (toks.length === 2 && PERCENT.test(toks[0]!)) {
        return { term: parseColorTerm(toks[1]!), weight: Number(toks[0]!.slice(0, -1)) };
      }
      throw new GrammarError(`malformed color-mix() item: '${p}'`);
    });
    return { type: 'mix', items };
  }
  throw new GrammarError(
    `'${text}' is outside the closed grammar (allowed: oklch() / var() / color-mix(in oklch, …) / transparent|white|black)`,
  );
}

/** term が参照する var 名の収集 */
export function collectRefs(term: ColorTerm, into: Set<string> = new Set()): Set<string> {
  if (term.type === 'var') into.add(term.name);
  if (term.type === 'mix') for (const i of term.items) collectRefs(i.term, into);
  return into;
}

export interface ParsedValue {
  kind: 'color' | 'shadow' | 'composite';
  /** color のとき単一 term */
  term?: ColorTerm;
  /** shadow のときレイヤごとの color term（無い層は undefined） */
  layers?: { colorTerm?: ColorTerm }[];
  /** 参照する var 名 */
  refs: Set<string>;
}

/** --color-* 値のパース */
export function parseColorValue(raw: string): ParsedValue {
  const term = parseColorTerm(raw);
  return { kind: 'color', term, refs: collectRefs(term) };
}

/** --shadow-* 値のパース */
export function parseShadowValue(raw: string): ParsedValue {
  assertNotBanned(raw);
  const layers = splitTop(raw.trim(), ',').map((layer) => {
    const toks = tokenizeTop(layer);
    let colorTerm: ColorTerm | undefined;
    let lengths = 0;
    for (const t of toks) {
      if (t === 'inset') continue;
      if (LENGTH.test(t)) {
        lengths++;
        continue;
      }
      if (colorTerm)
        throw new GrammarError(`shadow layer has more than one color term: '${layer}'`);
      colorTerm = parseColorTerm(t); // throws if not a color term
    }
    if (lengths < 2 || lengths > 4) {
      throw new GrammarError(`shadow layer must have 2–4 lengths (got ${lengths}): '${layer}'`);
    }
    return colorTerm !== undefined ? { colorTerm } : {};
  });
  const refs = new Set<string>();
  for (const l of layers) if (l.colorTerm) collectRefs(l.colorTerm, refs);
  return { kind: 'shadow', layers, refs };
}

/**
 * 非 color/shadow カテゴリの x- 拡張トークン値（composite）。
 * 色成分は閉文法のみ・hex/rgb 等は error（W0 具体化 — v1 契約スコープ外カテゴリの安全側規則）。
 */
export function parseCompositeValue(raw: string): ParsedValue {
  assertNotBanned(raw);
  const refs = new Set<string>();
  for (const part of splitTop(raw.trim(), ',')) {
    for (const t of tokenizeTop(part)) {
      if (
        /^(oklch|color-mix|var)\(/i.test(t) ||
        t === 'transparent' ||
        t === 'white' ||
        t === 'black'
      ) {
        collectRefs(parseColorTerm(t), refs);
        continue;
      }
      if (DIMENSION.test(t)) continue; // 長さ・時間・角度・数値（records 現物較正: 120ms 等）
      if (/^'[^']*'$/.test(t) || /^"[^"]*"$/.test(t)) continue;
      if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(t)) continue; // identifier (e.g. font keyword)
      if (NUMERIC_FUNCTION.test(t)) continue; // cubic-bezier(0.4, 0, 0.2, 1) 等（records 現物較正）
      if (/^[a-zA-Z-]+\(/.test(t)) {
        throw new GrammarError(`function '${t.split('(')[0]}(' is outside the closed grammar`);
      }
      throw new GrammarError(`'${t}' is outside the closed grammar`);
    }
  }
  return { kind: 'composite', refs };
}

/** トークン名に応じた値パース入口 */
export function parseTokenValue(name: string, raw: string): ParsedValue {
  if (name.startsWith('--color-')) return parseColorValue(raw);
  if (name.startsWith('--shadow-')) return parseShadowValue(raw);
  return parseCompositeValue(raw);
}
