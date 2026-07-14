/**
 * テーマファイルパーサ — TH-03 / AM-9 の token-only 文法専用。
 *
 * 意図的に「寛容な CSS パーサ」ではない: テーマファイルに書けるのは
 * ① 契約版プラグマ ② .components.css @import ③ @theme ブロック 0〜1
 * ④ 登録スコープセレクタブロック ⑤ authored/fill 二領域マーカー、のみ。
 * それ以外の構文は構造 error として収集する（fail-closed の一部）。
 */

export interface Pragma {
  contract: string;
  themegen: string | undefined;
  line: number;
}

export interface Decl {
  name: string;
  value: string;
  line: number;
  region: 'authored' | 'fill';
}

export type BlockKind = 'theme' | 'container' | 'scope';

export interface Block {
  kind: BlockKind;
  /** kind='scope'|'container' のときセレクタ文字列（@theme のとき '@theme'） */
  selector: string;
  line: number;
  decls: Decl[];
}

export interface StructError {
  line: number;
  message: string;
}

export interface ParsedThemeFile {
  pragma: Pragma | undefined;
  imports: { text: string; line: number }[];
  /** @theme inline を検出したか（TH-04 MUST NOT） */
  themeInline: boolean;
  blocks: Block[];
  errors: StructError[];
}

const FILL_MARKER = /^@nene2-fill:(start|end)\b/;
const PRAGMA = /^@nene2-contract\s+(\S+)(?:\s+@themegen\s+(\S+))?\s*$/;

export function parseThemeFile(source: string): ParsedThemeFile {
  const result: ParsedThemeFile = {
    pragma: undefined,
    imports: [],
    themeInline: false,
    blocks: [],
    errors: [],
  };

  let i = 0;
  let line = 1;
  let block: Block | null = null;
  let region: 'authored' | 'fill' = 'authored';
  let buf = '';
  let bufLine = 1;

  const err = (message: string, atLine = line) => result.errors.push({ line: atLine, message });

  const flushStatement = () => {
    const text = buf.trim();
    buf = '';
    if (!text) return;
    if (block) {
      const m = /^(--[a-zA-Z0-9-]+)\s*:\s*([\s\S]+)$/.exec(text);
      if (m) {
        block.decls.push({ name: m[1]!, value: m[2]!.trim(), line: bufLine, region });
      } else {
        const pm = /^([a-zA-Z-]+)\s*:/.exec(text);
        if (pm) {
          err(
            `normal property '${pm[1]}' inside theme block — token-only grammar allows custom property declarations only (AM-9)`,
            bufLine,
          );
        } else {
          err(`unparsable statement inside block: '${text.slice(0, 60)}'`, bufLine);
        }
      }
    } else {
      if (/^@import\b/.test(text)) {
        result.imports.push({ text, line: bufLine });
      } else {
        err(`unexpected top-level statement: '${text.slice(0, 60)}'`, bufLine);
      }
    }
  };

  while (i < source.length) {
    const ch = source[i]!;
    // comment
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      const raw = end === -1 ? source.slice(i + 2) : source.slice(i + 2, end);
      const commentLine = line;
      const body = raw.trim();
      const fm = FILL_MARKER.exec(body);
      if (fm) {
        if (!block) err('@nene2-fill marker outside a block', commentLine);
        else region = fm[1] === 'start' ? 'fill' : 'authored';
      } else {
        const pm = PRAGMA.exec(body);
        if (pm && !result.pragma) {
          result.pragma = { contract: pm[1]!, themegen: pm[2], line: commentLine };
        }
      }
      line += (raw.match(/\n/g) ?? []).length;
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (ch === '\n') {
      line++;
      buf += ch;
      i++;
      continue;
    }
    if (ch === '{') {
      if (block) {
        err('nested block — token-only grammar has no nesting');
        // skip to matching close brace to keep going
        let depth = 1;
        i++;
        while (i < source.length && depth > 0) {
          if (source[i] === '{') depth++;
          if (source[i] === '}') depth--;
          if (source[i] === '\n') line++;
          i++;
        }
        buf = '';
        continue;
      }
      const head = buf.trim();
      buf = '';
      if (/^@theme\s+inline$/.test(head)) {
        result.themeInline = true;
        result.blocks.push({ kind: 'theme', selector: '@theme inline', line, decls: [] });
        block = result.blocks[result.blocks.length - 1]!;
      } else if (head === '@theme') {
        result.blocks.push({ kind: 'theme', selector: '@theme', line, decls: [] });
        block = result.blocks[result.blocks.length - 1]!;
      } else if (head === ':root') {
        result.blocks.push({ kind: 'container', selector: ':root', line, decls: [] });
        block = result.blocks[result.blocks.length - 1]!;
      } else if (head.length > 0 && !head.startsWith('@')) {
        result.blocks.push({ kind: 'scope', selector: head, line, decls: [] });
        block = result.blocks[result.blocks.length - 1]!;
      } else {
        err(`unexpected block '${head || '(empty selector)'}'`);
        result.blocks.push({ kind: 'scope', selector: head, line, decls: [] });
        block = result.blocks[result.blocks.length - 1]!;
      }
      region = 'authored';
      bufLine = line;
      i++;
      continue;
    }
    if (ch === '}') {
      if (!block) err("unmatched '}'");
      flushStatement();
      if (region === 'fill') err('@nene2-fill:start without matching end before block close');
      block = null;
      region = 'authored';
      i++;
      continue;
    }
    if (ch === ';') {
      flushStatement();
      bufLine = line;
      i++;
      continue;
    }
    if (buf.trim() === '') bufLine = line;
    buf += ch;
    i++;
  }
  if (block) err('unclosed block at end of file');
  else if (buf.trim()) flushStatement();
  return result;
}

/**
 * ルートスコープ判定 — テーマスコープ要素（`<html>`）上の同名上書きは
 * `[data-theme='…']` 単独セレクタ（連鎖の自動追従が成立 — TH-06 PASS 側）。
 * それ以外の複合・クラス付きセレクタは局所スコープ。
 * --container 時は containerSelector と一致するセレクタもルート扱い（widget スコープ要素）。
 */
export function isRootScopeSelector(selector: string, containerSelector?: string): boolean {
  if (containerSelector !== undefined && selector === containerSelector) return true;
  return /^\[data-theme=['"][^'"]+['"]\]$/.test(selector.trim());
}
