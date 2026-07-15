/**
 * check:exemplars の読み取り源（規約 02 A-10 — 準拠判定の正は origin/main ＋ CI・commit SHA 併記 MUST `[P]`）。
 *
 * A-10 の根拠事故は「stale なローカル作業ツリー grep で誤った準拠主張をした」こと（R3 記録の訂正1）。
 * 検査器が作業ツリーを読むと中央実行（fleet-tooling CI — 05 §5.2 #18）で同じ事故を再生産するため、
 * 既定は origin/main を git 経由で読む（#37）。作業ツリー読みは「その枝の事実」＝参考値であり、
 * `worktreeSource` として明示的に選んだ場合にのみ使える（`authoritative: false` で出力に明記される）。
 *
 * fail-closed（05 G-6）: fetch 不能・ref 解決不能 = 検査不能 → unknown。green とも red とも言わない。
 *
 * AM-12 hermeticity とは衝突しない: AM-12 の禁止は「リポ CI の per-PR での npm registry 照会」
 * （02:129・minutes.md:625）であり、本検査は fleet-tooling CI で走るクロスリポ検査。同 §5.2 #17 ratchet も
 * `merge-base(origin/main, HEAD)` を同じ場所で使っている。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/** リポの検査可否。`unavailable` は red ではなく unknown へ寄与する（G-6）。 */
export type RepoResolution =
  | { kind: 'ready'; sha: string }
  | { kind: 'unavailable'; reason: string };

export interface ExemplarSource {
  /** provenance 表示用のラベル。 */
  readonly label: string;
  /**
   * 「検査が走り正の証拠を得た」と言える源か（05 G-6）。false = 参考値であり verdict を出せない。
   * origin/main を**自ら fetch して**読んだ場合のみ true。
   */
  readonly authoritative: boolean;
  /** 検査対象リポ群の親ディレクトリ。 */
  readonly fleetRoot: string;
  /** リポの検査可否と commit SHA を確定する（A-10 の SHA 併記 MUST）。 */
  resolveRepo(repo: string): RepoResolution;
  /** repo 内の相対パスを読む。null = ファイル不存在。 */
  readFile(repo: string, relPath: string): string | null;
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function isGitRepo(dir: string): boolean {
  try {
    return (
      existsSync(dir) && statSync(dir).isDirectory() && git(dir, ['rev-parse', '--git-dir']) !== ''
    );
  } catch {
    return false;
  }
}

export interface GitRefSourceOptions {
  fleetRoot: string;
  /** 読み取る ref（既定 `origin/main` — A-10 の「準拠判定の正」）。 */
  ref?: string;
  /**
   * 検査前に `git fetch` するか（既定 true）。
   *
   * false にすると ref の鮮度は「呼び出し側の自己申告」になり、検査器は正の証拠を持たない。
   * よって `authoritative: false`（＝参考値・verdict なし）に落ちる — G-7「被検査者の自己申告を
   * 正としない」と同じ理由。`--worktree` と同じ扱いで一貫させている。
   */
  fetch?: boolean;
}

/**
 * origin/main（既定）を git 経由で読む A-10 準拠の読み取り源。
 * 作業ツリーには一切触れないので、ローカルがどのブランチ・どれだけ dirty でも結果が動かない。
 */
export function gitRefSource(options: GitRefSourceOptions): ExemplarSource {
  const fleetRoot = path.resolve(options.fleetRoot);
  const ref = options.ref ?? 'origin/main';
  const doFetch = options.fetch ?? true;
  const resolved = new Map<string, RepoResolution>();

  function resolveRepo(repo: string): RepoResolution {
    const cached = resolved.get(repo);
    if (cached) return cached;
    const result = resolveUncached(repo);
    resolved.set(repo, result);
    return result;
  }

  function resolveUncached(repo: string): RepoResolution {
    const dir = path.join(fleetRoot, repo);
    if (!isGitRepo(dir)) {
      return { kind: 'unavailable', reason: `git リポジトリが無い: ${path.join(fleetRoot, repo)}` };
    }
    if (doFetch) {
      try {
        git(dir, ['fetch', '--quiet', 'origin']);
      } catch (e) {
        // fetch できない = ref の鮮度を保証できない。stale を掴んだまま数字を出す方が有害（A-10 の事故そのもの）
        return {
          kind: 'unavailable',
          reason: `git fetch 失敗（${ref} の鮮度を保証できない）: ${errText(e)}`,
        };
      }
    }
    try {
      const sha = git(dir, ['rev-parse', `${ref}^{commit}`]);
      return { kind: 'ready', sha };
    } catch (e) {
      return { kind: 'unavailable', reason: `${ref} を解決できない: ${errText(e)}` };
    }
  }

  return {
    label: doFetch
      ? `${ref}（fetch 済み）`
      : `${ref}（fetch なし — 鮮度は呼び出し側の自己申告・参考値）`,
    // fetch していない ref の鮮度は保証できない。green は「検査が走り正の証拠を得た」場合のみ（G-6）
    authoritative: doFetch,
    fleetRoot,
    resolveRepo,
    readFile(repo, relPath) {
      const state = resolveRepo(repo);
      if (state.kind !== 'ready') return null;
      const dir = path.join(fleetRoot, repo);
      const spec = `${state.sha}:${relPath}`;
      try {
        // cat-file -e で存在を分離してから読む（不存在と git エラーを取り違えないため）
        git(dir, ['cat-file', '-e', spec]);
      } catch {
        return null;
      }
      return git(dir, ['show', spec]);
    },
  };
}

/**
 * ローカル作業ツリーを読む**参考値**の読み取り源（A-10: 「その枝の事実」）。
 * 準拠判定・批准前提の主張には使えない（`authoritative: false` が出力に出る）。
 * fixture 検査やローカルでの下書き確認のための逃げ道。
 */
export function worktreeSource(fleetRoot: string): ExemplarSource {
  const root = path.resolve(fleetRoot);
  return {
    label: 'ローカル作業ツリー（参考値 — A-10 により準拠判定には使えない）',
    authoritative: false,
    fleetRoot: root,
    resolveRepo(repo) {
      const dir = path.join(root, repo);
      // 参考値なので best-effort: git リポでなくても読めるなら読む（SHA は付けられないと明示）
      try {
        return { kind: 'ready', sha: isGitRepo(dir) ? git(dir, ['rev-parse', 'HEAD']) : 'n/a' };
      } catch {
        return { kind: 'ready', sha: 'n/a' };
      }
    },
    readFile(repo, relPath) {
      const abs = path.join(root, repo, relPath);
      try {
        if (!existsSync(abs) || !statSync(abs).isFile()) return null;
        return readFileSync(abs, 'utf8');
      } catch {
        return null;
      }
    },
  };
}

function errText(e: unknown): string {
  const err = e as { stderr?: string; message?: string };
  return (err.stderr ?? err.message ?? String(e)).toString().trim().split('\n')[0] ?? String(e);
}
