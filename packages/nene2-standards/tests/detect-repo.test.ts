/**
 * detectRepo（fleet-tooling#29）— clear 実測: frontend/package.json の name（`nene-clear-admin`）
 * ではなく git remote 名（`nene-clear`）を repo 検出の正本にする（registries/fleet.jsonc・
 * 台帳全体が git 名でキーするため）。git remote が引けない場合は package.json → dirname に
 * フォールバックする（従来挙動を維持）。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { detectRepo } from '../src/checks/detect-repo.js';

const dirsToClean: string[] = [];

function makeTmpDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'nene2-detect-repo-'));
  dirsToClean.push(dir);
  return dir;
}

function git(cwd: string, args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

afterEach(() => {
  while (dirsToClean.length > 0) {
    const dir = dirsToClean.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('detectRepo（fleet-tooling#29 — git remote 名を package.json name より優先）', () => {
  it('package.json の name と git remote 名が食い違う場合、git remote 名を返す（clear 実測形）', () => {
    const repoRoot = makeTmpDir();
    git(repoRoot, ['init', '-q']);
    git(repoRoot, ['remote', 'add', 'origin', 'https://github.com/hideyukiMORI/nene-clear.git']);
    const frontend = path.join(repoRoot, 'frontend');
    mkdirSync(frontend);
    writeFileSync(
      path.join(frontend, 'package.json'),
      JSON.stringify({ name: 'nene-clear-admin' }),
    );

    expect(detectRepo(frontend)).toBe('nene-clear');
  });

  it('SSH 形式の remote URL でも repo 名を取り出す', () => {
    const repoRoot = makeTmpDir();
    git(repoRoot, ['init', '-q']);
    git(repoRoot, ['remote', 'add', 'origin', 'git@github.com:hideyukiMORI/nene-clear.git']);

    expect(detectRepo(repoRoot)).toBe('nene-clear');
  });

  it('git remote が引けない場合は package.json の name（scope 除去）へフォールバックする', () => {
    const dir = makeTmpDir();
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: '@scope/some-pkg' }));

    expect(detectRepo(dir)).toBe('some-pkg');
  });

  it('git remote も package.json も無い場合は cwd のディレクトリ名へフォールバックする', () => {
    const dir = makeTmpDir();

    expect(detectRepo(dir)).toBe(path.basename(dir));
  });
});
