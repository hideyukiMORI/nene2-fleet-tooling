/**
 * repo 名の自動検出（fleet-tooling#29 — clear 実測: detectRepo が frontend/package.json の
 * name から `nene-clear-admin` を返すが、registries/fleet.jsonc・実運用のリポ台帳は git 名
 * `nene-clear` でキーする）。
 *
 * 優先順位:
 *   1. `git config --get remote.origin.url`（台帳の正本と一致する git 名 — フリート全体で
 *      `repo` フィールドはこの形で登録されている。SSH/HTTPS どちらの remote URL 形式も対応）
 *   2. package.json の name（scope 除去）— git remote が引けない場合のフォールバック
 *      （非 git チェックアウト・remote 未設定等）
 *   3. cwd のディレクトリ名 — 最終フォールバック
 *
 * `--repo` 明示指定があれば本関数は使われない（cli.ts）。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** `git remote.origin.url` からリポ名を取り出す（末尾セグメント・`.git` サフィックス除去）。 */
function repoNameFromRemoteUrl(url: string): string | null {
  const trimmed = url.trim().replace(/\/+$/, '');
  const match = /\/([^/]+?)(?:\.git)?$/.exec(trimmed);
  return match?.[1] || null;
}

/** cwd（または祖先）が属する git リポジトリの origin remote 名。git 不使用/非リポジトリは null。 */
function gitRemoteRepoName(cwd: string): string | null {
  try {
    const url = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return repoNameFromRemoteUrl(url);
  } catch {
    return null;
  }
}

function repoNameFromPackageJson(cwd: string): string | null {
  try {
    const pkg = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')) as {
      name?: string;
    };
    if (pkg.name) return pkg.name.replace(/^@[^/]+\//, '');
  } catch {
    // fall through
  }
  return null;
}

/** repo 自動検出（fleet.jsonc・台帳全体が使う git 名を正本とする — #29）。 */
export function detectRepo(cwd: string): string {
  return gitRemoteRepoName(cwd) ?? repoNameFromPackageJson(cwd) ?? path.basename(cwd);
}
