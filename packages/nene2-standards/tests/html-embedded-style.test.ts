/**
 * HTML 埋め込み `<style>` の不可視領域（#164）の回帰テスト。
 *
 * 事故形: 測定経路（`init --scan` / lint-baseline / run）は `.css` だけを見るのに、
 * scan-coverage は `index.html` を無条件 allowed にしていた。**中の CSS は台帳にも lint にも
 * 載らないまま green** ＝ G-6 の現物（不可視領域があるのに緑）。
 * 実在例: concierge `public_html/admin/index.html`（52KB・`<style>` 1ブロック・fleet 実測）。
 *
 * 「登録されていない（red）」と「登録されている（測定経路が postcss-html で測る＝green）」を分けることが
 * 本体なので、3状態それぞれを陽性対照つきで固定する。2.3.x では登録済みでも「測れない」ので unknown
 * だったが、#164 タスク2 で測定経路が HTML を読むようになり green になった。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  checkScanCoverage,
  enumerateMeasurableStyleSources,
  htmlEmbeddedStyle,
  htmlEmbeddedStyleSources,
} from '../src/index.js';
import type { RegistriesDocument } from '../src/registries/schema.js';

const REPO = 'nene-probe';
const EMPTY: RegistriesDocument = { schema: 'nene2-registries/1', entries: [] };

const withManifest = (rel: string): RegistriesDocument => ({
  schema: 'nene2-registries/1',
  entries: [
    {
      kind: 'legacy-manifest',
      id: `${REPO}-legacy-html`,
      repo: REPO,
      path: rel,
      maxLines: 999,
      maxBytes: 999_999,
    },
  ],
});

let root: string;

function html(body: string): string {
  return `<!doctype html>\n<html><head>${body}</head><body></body></html>\n`;
}

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'nene2-html-'));
  mkdirSync(path.join(root, 'src', 'shared', 'ui', 'theme'), { recursive: true });
  writeFileSync(path.join(root, 'src', 'shared', 'ui', 'theme', 'index.css'), '@theme {}\n');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('htmlEmbeddedStyle — 不可視領域の実測', () => {
  it('埋め込み <style> のブロック数と行数を返す', () => {
    const dir = mkdtempSync(path.join(root, 'a-'));
    writeFileSync(
      path.join(dir, 'index.html'),
      html('<style>\n.a{color:red}\n.b{color:blue}\n</style><style>.c{}</style>'),
    );
    const r = htmlEmbeddedStyle(dir, 'index.html');
    expect(r.blocks).toBe(2);
    expect(r.lines).toBeGreaterThanOrEqual(3);
  });

  it('空の <style> は不可視領域として数えない', () => {
    const dir = mkdtempSync(path.join(root, 'b-'));
    writeFileSync(path.join(dir, 'index.html'), html('<style>\n\n</style>'));
    expect(htmlEmbeddedStyle(dir, 'index.html').blocks).toBe(0);
  });

  it('埋め込みを持つ HTML だけを列挙する', () => {
    const dir = mkdtempSync(path.join(root, 'c-'));
    writeFileSync(path.join(dir, 'index.html'), html('<style>.a{}</style>'));
    writeFileSync(path.join(dir, 'plain.html'), html('<link rel="stylesheet" href="a.css">'));
    const list = htmlEmbeddedStyleSources(dir);
    expect(list.map((e) => e.path)).toEqual(['index.html']);
  });

  it('測定経路の対象 = .css 全件 ＋ 埋め込みを持つ .html（埋め込みの無い HTML は含めない・#164 タスク2）', () => {
    const dir = mkdtempSync(path.join(root, 'c2-'));
    writeFileSync(path.join(dir, 'index.html'), html('<style>.a{}</style>'));
    writeFileSync(path.join(dir, 'plain.html'), html('<link rel="stylesheet" href="a.css">'));
    writeFileSync(path.join(dir, 'a.css'), '.x{}\n');
    writeFileSync(path.join(dir, 'b.scss'), '.y{}\n'); // scan-coverage が red にする側・測定経路には乗せない
    expect(enumerateMeasurableStyleSources(dir)).toEqual(['a.css', 'index.html']);
  });
});

describe('checkScanCoverage — 埋め込み <style> を持つ HTML は無条件 allowed にしない（#164）', () => {
  it('🔴 台帳外なら red（正準配置の index.html でも）', () => {
    const dir = mkdtempSync(path.join(root, 'd-'));
    writeFileSync(path.join(dir, 'index.html'), html('<style>.a{color:red}</style>'));
    const r = checkScanCoverage({ cwd: dir, repo: REPO, registries: EMPTY });
    expect(r.state).toBe('red');
    if (r.state === 'red') {
      expect(r.details.some((d) => d.includes('HTML 埋め込み <style> が台帳外'))).toBe(true);
    }
  });

  it('台帳登録済みなら green — 測定経路が postcss-html で中の CSS を測るので不可視領域ではない（#164 タスク2）', () => {
    const dir = mkdtempSync(path.join(root, 'e-'));
    writeFileSync(path.join(dir, 'index.html'), html('<style>.a{color:red}</style>'));
    const r = checkScanCoverage({ cwd: dir, repo: REPO, registries: withManifest('index.html') });
    expect(r.state).toBe('green');
  });

  it('🔴 陽性対照: 埋め込みが無ければ従来どおり green（免除が壊れていない）', () => {
    const dir = mkdtempSync(path.join(root, 'f-'));
    writeFileSync(path.join(dir, 'index.html'), html('<link rel="stylesheet" href="a.css">'));
    mkdirSync(path.join(dir, 'src', 'shared', 'ui', 'theme'), { recursive: true });
    writeFileSync(path.join(dir, 'src', 'shared', 'ui', 'theme', 'index.css'), '@theme {}\n');
    expect(checkScanCoverage({ cwd: dir, repo: REPO, registries: EMPTY }).state).toBe('green');
  });
});
