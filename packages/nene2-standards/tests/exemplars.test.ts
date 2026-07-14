/**
 * check:exemplars のテスト（G-2・AM-15・§5.2 #18）。
 * 故意 fail（未植栽アンカー・不存在ファイル・行番号参照・malformed）が red を出すことを検証する。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { checkExemplars, collectExemplarRefs } from '../src/checks/exemplars.js';

const FLEET_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'exemplar-fleet',
);

const OK_REF = 'nene-alpha/frontend/src/shared/api/client.ts#nene2-exemplar:api-client';

function check(content: string) {
  return checkExemplars({ files: [{ path: 'doc.md', content }], fleetRoot: FLEET_ROOT });
}

describe('collectExemplarRefs', () => {
  it('fence 内も含めて全量収集し、ユニーク化して出現位置を持つ', () => {
    const { refs } = collectExemplarRefs([
      { path: 'a.md', content: `本文 [X:${OK_REF}]\n\`\`\`ts\n// [X:${OK_REF}]\n\`\`\`\n` },
    ]);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.occurrences).toEqual([
      { file: 'a.md', line: 1 },
      { file: 'a.md', line: 3 },
    ]);
  });

  it('構文プレースホルダ（[X:file#anchor] 等）はスキップし件数を報告する', () => {
    const { refs, placeholders } = collectExemplarRefs([
      { path: 'a.md', content: '`[X:file#anchor]` 形式・`[X:…#anchor]`・[X:...]・[X:]\n' },
    ]);
    expect(refs).toHaveLength(0);
    expect(placeholders).toHaveLength(4);
  });
});

describe('checkExemplars', () => {
  it('植栽済みアンカーは resolved・green', () => {
    const r = check(`exemplar: [X:${OK_REF}]\n`);
    expect(r.state).toBe('green');
    expect(r.findings[0]?.status).toBe('resolved');
  });

  it('故意 fail: アンカー未植栽は anchor-missing で red', () => {
    const r = check(
      '[X:nene-alpha/frontend/src/entities/auth/model.ts#nene2-exemplar:auth-store]\n',
    );
    expect(r.state).toBe('red');
    expect(r.failures[0]?.status).toBe('anchor-missing');
  });

  it('故意 fail: 参照先ファイル不存在は file-missing で red', () => {
    const r = check('[X:nene-alpha/frontend/src/nope.ts#nene2-exemplar:ghost]\n');
    expect(r.failures[0]?.status).toBe('file-missing');
  });

  it('故意 fail: 行番号参照は line-number で red（G-2 行番号 MUST NOT）', () => {
    const r = check(
      `[X:nene-alpha/frontend/src/shared/api/client.ts:2#nene2-exemplar:api-client]\n` +
        `[X:nene-alpha/frontend/src/shared/api/client.ts#L2]\n`,
    );
    expect(r.failures.map((f) => f.status)).toEqual(['line-number', 'line-number']);
  });

  it('故意 fail: # なし・prefix なし anchor は malformed で red', () => {
    const r = check(
      '[X:vault auth model]\n[X:nene-alpha/frontend/src/shared/api/client.ts#api-client]\n',
    );
    expect(r.failures.map((f) => f.status).sort()).toEqual(['malformed', 'malformed']);
  });

  it('fleet ルート外への脱出（絶対パス・..）は malformed', () => {
    const r = check('[X:../etc/passwd#nene2-exemplar:x]\n[X:/etc/passwd#nene2-exemplar:x]\n');
    expect(r.failures.map((f) => f.status)).toEqual(['malformed', 'malformed']);
  });

  it('fail-closed（G-6）: [X] 参照 0 = unknown（空虚合格 MUST NOT）', () => {
    const r = check('[X:file#anchor] の説明だけの文書\n');
    expect(r.state).toBe('unknown');
  });

  it('findings は content 昇順で決定的', () => {
    const r = check(`[X:zz/nope.ts#nene2-exemplar:z]\n[X:${OK_REF}]\n`);
    expect(r.findings.map((f) => f.content)).toEqual([OK_REF, 'zz/nope.ts#nene2-exemplar:z']);
  });
});
