#!/usr/bin/env node
/**
 * lock 同期ゲート（#296）— `npm run check` の先頭で走る。
 *
 * 何を防ぐか: `package.json` と `package-lock.json` の食い違いを、CI へ着くより前に落とす。
 *
 * 🔴 なぜ必要か（2026-08-23・PR #295 で実踏）:
 * `packages/nene2-ui` を足した PR の CI が `npm ci` で赤になったが、その直前に
 * `npm run check` は全7項目 PASS していた。node_modules に既にワークスペースが
 * 張られている環境では lock の欠落が見えず、check の各項目はどれも lock を読まない。
 * ⇒ **ワークスペースを1本足すと必ず「ローカル緑・CI 赤」になる**構造だった。
 *
 * 🔴 なぜ `--offline` か:
 * check は手元で回すループ（Stop hook パイロットの対象でもある）なので、ここへ
 * ネットワーク依存の検査を混ぜると回線都合の赤が「無視してよい赤」として定着する。
 * この既決は .github/workflows/check.yml が `npm run audit` を check に入れない理由として
 * 明文で書いている。同じ理由でネットワークを断つ。実測 1.0 秒（#296）。
 *
 * 🔴 なぜ `--dry-run` か: node_modules を書き換えないため。手元のループを壊さない。
 *
 * 失敗コードが2種類あるのは `--offline` の副作用で、どちらも「lock が package.json を
 * 覆っていない」ことを指す。素の npm の文言だけだと2つ目が回線障害に見えるので、
 * ここで意味を言い直している（それをしないと「無視してよい赤」に化ける）。
 */
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const r = spawnSync(npm, ['ci', '--dry-run', '--ignore-scripts', '--offline'], {
  encoding: 'utf8',
});

if (r.error) {
  console.error('check:lock: npm の起動に失敗 — fail-closed で赤にする');
  console.error(String(r.error));
  process.exit(1);
}

if (r.status === 0) {
  console.log('check:lock: package.json と package-lock.json は同期している');
  process.exit(0);
}

const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;

// EUSAGE   = lock にエントリが無い（ワークスペースの追加漏れなど）
// ENOTCACHED = 宣言された依存が lock 経由でキャッシュに解決できない
//              （--offline なので取りに行かない。新規依存を足して lock を更新していない形）
const cause = out.includes('ENOTCACHED')
  ? 'package.json が宣言している依存を lock が覆っていない（--offline なので取得は試みていない。回線の問題ではない）'
  : 'package.json と package-lock.json が同期していない';

console.error(out.trimEnd());
console.error('');
console.error(`🔴 check:lock: ${cause}`);
console.error('');
console.error('   直し方: npm install --package-lock-only --ignore-scripts');
console.error('   🔴 npm audit fix は使わない（版を勝手に上げ下げする）。');
console.error('   🔴 直したら lock の差分を全量で読む（版の上げ下げが混ざっていないこと）。');
process.exit(1);
