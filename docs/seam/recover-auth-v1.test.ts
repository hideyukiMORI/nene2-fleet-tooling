/**
 * seam 仕様書の腐敗防止テスト:
 * 1. §1 の TS ブロックが型検査を通る（仕様の interface が壊れたら CI が落ちる）
 * 2. S-1〜S-12・FT-1〜12 の必須不変条件が本文に存在する（削除・番号欠落の検知）
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const specPath = fileURLToPath(new URL('./recover-auth-v1.md', import.meta.url));
const spec = readFileSync(specPath, 'utf8');

function extractTsBlocks(md: string): string[] {
  return [...md.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1] ?? '');
}

const fileName = '/virtual/spec.ts';

// モジュールスコープの定数。lib SourceFile キャッシュのキーが name+target だけで足りるのは、
// 全 typecheck() 呼び出しがこの同一 options を使うため（options を可変にするならキーも見直すこと）。
const options: ts.CompilerOptions = {
  strict: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  types: [],
};

// typecheck() の所要はほぼ全部が lib d.ts の読み込み（#156 実測: createProgram 1回あたり
// 約 0.8〜1.0 秒）。仮想ファイル以外は呼び出しをまたいで同一なので SourceFile を使い回す。
const libSourceFiles = new Map<string, ts.SourceFile | undefined>();

function typecheck(source: string): string[] {
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, ...rest) => {
    if (name === fileName) {
      return ts.createSourceFile(name, source, ts.ScriptTarget.ES2022, true);
    }
    const target =
      typeof languageVersion === 'object' ? languageVersion.languageVersion : languageVersion;
    const key = `${name}::${target}`;
    if (!libSourceFiles.has(key)) {
      libSourceFiles.set(key, getSourceFile(name, languageVersion, ...rest));
    }
    return libSourceFiles.get(key);
  };
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (name) => name === fileName || fileExists(name);
  const program = ts.createProgram([fileName], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

// TypeScript コンパイラをテストプロセス内で起動するため、vitest 既定の 5000ms では
// 負荷下（npm run check の直列実行で type-check→lint→format:check の後に回る）に落ちる。
// #156 実測: 単体 1.8 秒 / check 経由で 4回中2回タイムアウト。上限は明示的に与える
// （リポ全体の testTimeout 引き上げは本物のハングを見逃すので採らない）。
const TYPECHECK_TIMEOUT_MS = 30_000;

describe('seam 仕様 v1（recoverAuth）— 仕様書の機械検査', () => {
  it('§1 interface 定義ブロックが型検査を通る', { timeout: TYPECHECK_TIMEOUT_MS }, () => {
    const blocks = extractTsBlocks(spec);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    for (const block of blocks) {
      expect(typecheck(block)).toEqual([]);
    }
  });

  it(
    '故意 fail: 壊れた TS は検査器が検知する（検査器の空虚合格防止）',
    { timeout: TYPECHECK_TIMEOUT_MS },
    () => {
      expect(typecheck('export type Broken = (x: Missing) => Nope;').length).toBeGreaterThan(0);
    },
  );

  it('config キーは recoverAuth 1個のみ・経路除外 config の不在が明文', () => {
    expect(spec).toContain('config キーは **`recoverAuth` 1個のみ**');
    expect(spec).toContain('経路除外 config');
    expect(spec).toContain('死んだ設定キー');
  });

  it('S-1〜S-12 が全て存在する（意味論の欠落検知）', () => {
    for (let i = 1; i <= 12; i++) {
      expect(spec, `S-${i} が存在すること`).toContain(`| S-${i} |`);
    }
    // 中核の不変条件の文言
    expect(spec).toContain('send() 先頭からの再入 MUST');
    expect(spec).toContain('requestInit 再利用 MUST NOT');
    expect(spec).toContain('同一の失敗 token につき recover 1回');
    expect(spec).toContain('{undefined, string, Blob, FormData}');
    expect(spec).toContain('store 直書き MUST NOT');
    expect(spec).toContain('null` と同値');
  });

  it('FT-1〜FT-12（field-trials 12本 = release gate）が全て存在する', () => {
    for (let i = 1; i <= 12; i++) {
      expect(spec, `FT-${i} が存在すること`).toContain(`| FT-${i} |`);
    }
    expect(spec).toContain('release gate');
  });

  it('実装は nene2-js 側（W2b）— 本書は仕様の正本化のみ、が明文', () => {
    expect(spec).toContain('実装は nene2-js 管轄（W2b）');
    expect(spec).toContain('実装コードを含まない');
  });
});
