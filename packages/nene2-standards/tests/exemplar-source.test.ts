/**
 * check:exemplars の読み取り源のテスト（規約 02 A-10・#37）。
 *
 * 中心は**回帰テスト**: 「ローカル作業ツリーが stale でも origin/main の事実を返す」こと。
 * これが壊れると A-10 の根拠事故（stale 計測による誤った準拠主張）を検査器が再生産する
 * ——実際に 2026-07-16 まで再生産しており、判明しているだけで4回踏まれた。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { gitRefSource, worktreeSource } from '../src/checks/exemplar-source.js';
import { checkExemplars } from '../src/checks/exemplars.js';

const REL = 'frontend/src/shared/api/client.ts';
const REF = `nene-fixture/${REL}#nene2-exemplar:api-client`;
const DOC = `exemplar: [X:${REF}]\n`;

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

let fleetRoot: string;
let repoDir: string;
let originSha: string;

beforeAll(() => {
  fleetRoot = mkdtempSync(path.join(tmpdir(), 'nene2-exemplar-fleet-'));
  const originDir = path.join(fleetRoot, 'origin.git');
  repoDir = path.join(fleetRoot, 'nene-fixture');

  // origin（bare）— ここの main が A-10 の言う「準拠判定の正」
  mkdirSync(originDir);
  git(originDir, ['init', '--bare', '--initial-branch=main', '--quiet']);

  git(fleetRoot, ['clone', '--quiet', originDir, repoDir]);
  for (const [k, v] of [
    ['user.email', 'test@example.invalid'],
    ['user.name', 'test'],
  ]) {
    git(repoDir, ['config', k, v]);
  }

  // origin/main に**アンカーを植えた**状態を作る
  mkdirSync(path.join(repoDir, path.dirname(REL)), { recursive: true });
  writeFileSync(
    path.join(repoDir, REL),
    '// [nene2-exemplar:api-client]\nexport const client = 1;\n',
  );
  git(repoDir, ['add', '-A']);
  git(repoDir, ['commit', '--quiet', '-m', 'plant anchor']);
  git(repoDir, ['push', '--quiet', 'origin', 'main']);
  originSha = git(repoDir, ['rev-parse', 'origin/main']).trim();

  // ローカルを stale にする: 作業ブランチでアンカーを消す（＝実際に vault/origin/invoice で起きていた形）
  git(repoDir, ['checkout', '--quiet', '-b', 'w1/some-work']);
  writeFileSync(path.join(repoDir, REL), 'export const client = 1;\n');
  git(repoDir, ['add', '-A']);
  git(repoDir, ['commit', '--quiet', '-m', 'local work without anchor']);
});

afterAll(() => {
  rmSync(fleetRoot, { recursive: true, force: true });
});

describe('gitRefSource（A-10 準拠の既定源）', () => {
  it('回帰(#37): ローカル作業ツリーにアンカーが無くても origin/main の事実で resolved・green', () => {
    const report = checkExemplars({
      files: [{ path: 'doc.md', content: DOC }],
      source: gitRefSource({ fleetRoot }),
    });
    expect(report.state).toBe('green');
    expect(report.findings[0]?.status).toBe('resolved');
    expect(report.authoritative).toBe(true);
  });

  it('対の証拠: 同じ入力を作業ツリーで読むと anchor-missing・red になる（これが4回踏まれた罠）', () => {
    const report = checkExemplars({
      files: [{ path: 'doc.md', content: DOC }],
      source: worktreeSource(fleetRoot),
    });
    expect(report.state).toBe('red');
    expect(report.findings[0]?.status).toBe('anchor-missing');
    // 参考値であることが出力に出ていなければ、読み手はまた stale を信じる
    expect(report.authoritative).toBe(false);
    expect(report.details.join('\n')).toContain('参考値');
  });

  it('A-10 の SHA 併記 MUST: repos に検査対象リポの commit SHA が載る', () => {
    const report = checkExemplars({
      files: [{ path: 'doc.md', content: DOC }],
      source: gitRefSource({ fleetRoot }),
    });
    expect(report.repos).toEqual([
      { repo: 'nene-fixture', sha: originSha, unavailableReason: null },
    ]);
  });

  it('fail-closed(G-6): git リポでない参照先は repo-unavailable → red ではなく unknown', () => {
    const report = checkExemplars({
      files: [{ path: 'doc.md', content: '[X:not-a-repo/src/a.ts#nene2-exemplar:x]\n' }],
      source: gitRefSource({ fleetRoot }),
    });
    expect(report.state).toBe('unknown');
    expect(report.unavailable).toHaveLength(1);
    expect(report.failures).toHaveLength(0);
    expect(report.repos[0]?.sha).toBeNull();
  });

  it('fail-closed(G-6): 検査不能が1件でも混ざれば全体 unknown（resolved があっても green にしない）', () => {
    const report = checkExemplars({
      files: [{ path: 'doc.md', content: `${DOC}[X:not-a-repo/src/a.ts#nene2-exemplar:x]\n` }],
      source: gitRefSource({ fleetRoot }),
    });
    expect(report.resolved).toBe(1);
    expect(report.state).toBe('unknown');
  });

  it('存在しない ref は解決不能 → unknown（空虚合格 MUST NOT）', () => {
    const report = checkExemplars({
      files: [{ path: 'doc.md', content: DOC }],
      source: gitRefSource({ fleetRoot, ref: 'origin/no-such-branch' }),
    });
    expect(report.state).toBe('unknown');
    expect(report.unavailable[0]?.detail).toContain('origin/no-such-branch');
  });

  it('origin/main に無いファイルは file-missing（検査不能とは別腕）', () => {
    const report = checkExemplars({
      files: [{ path: 'doc.md', content: '[X:nene-fixture/src/ghost.ts#nene2-exemplar:x]\n' }],
      source: gitRefSource({ fleetRoot }),
    });
    expect(report.state).toBe('red');
    expect(report.failures[0]?.status).toBe('file-missing');
  });

  it('G-6: --no-fetch は鮮度の自己申告なので authoritative:false → resolved でも green にしない', () => {
    const report = checkExemplars({
      files: [{ path: 'doc.md', content: DOC }],
      source: gitRefSource({ fleetRoot, fetch: false }),
    });
    // origin/main の事実としては解決している
    expect(report.findings[0]?.status).toBe('resolved');
    expect(report.resolved).toBe(1);
    // が、fetch していない ref の鮮度は保証できない = 正の証拠がない
    expect(report.authoritative).toBe(false);
    expect(report.state).toBe('unknown');
    expect(report.details.join('\n')).toContain('green は「検査が走り正の証拠を得た」場合のみ');
  });

  it('repo/path 形式でない単一セグメントは malformed', () => {
    const report = checkExemplars({
      files: [{ path: 'doc.md', content: '[X:client.ts#nene2-exemplar:x]\n' }],
      source: gitRefSource({ fleetRoot }),
    });
    expect(report.failures[0]?.status).toBe('malformed');
  });
});
