# Publish 手順 — nene2-tokens / nene2-standards / nene2-i18n

`nene2-js` の release flow と同型（[nene2-js docs/development/publish.md](https://github.com/hideyukiMORI/nene2-js/blob/main/docs/development/publish.md)）。
CI は [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)（OIDC）— 長命 `NPM_TOKEN` は使わない。
publish の実行は施主（hide）。担当リナは準備と検証まで。

## 対象

| パッケージ | 版 | 状態 |
| --- | --- | --- |
| `@hideyukimori/nene2-tokens` | 1.0.0 | 契約凍結済み（2026-07-14 hide 承認）・publish 待ち |
| `@hideyukimori/nene2-standards` | 1.0.0 | known-utility warn プレースホルダ等の暫定は README 明記のまま（規約の設計 — O-5/O-6）・publish 待ち |
| `@hideyukimori/nene2-i18n` | 0.1.0 | `private` 解除済み・**publish 待ち**（#44 — 施主 hide 2026-07-16 裁定: 0.1.0 で publish）。W0a 実体は catalog+parity（`/format` `/react` `/testing` は W0b — 規約 04 §0 の API 表が状態を明記） |

## 初回 publish（パッケージごとに1回・hide のローカル操作）

Trusted Publisher は **既存パッケージにしか設定できない**（npm の package settings 画面が
初回 publish 後にしか存在しない）ため、初回はローカルから account 2FA で publish する:

```bash
cd nene2-fleet-tooling
npm ci && npm run check   # AM-2 release gate 含む全緑を確認
npm publish --dry-run --workspace packages/nene2-tokens   # pack 内容の最終確認
npm publish --workspace packages/nene2-tokens             # 2FA: --otp=<code>
npm publish --dry-run --workspace packages/nene2-standards
npm publish --workspace packages/nene2-standards
```

確認: `npm view @hideyukimori/nene2-tokens version` / `npm view @hideyukimori/nene2-standards version`

注: ローカル publish でも provenance は生成されない（provenance は CI の OIDC 経由のみ）。
`publishConfig.provenance: true` はローカルでは警告になる場合があるが、その際は
`--provenance=false` を付けて初回だけ回避してよい（2回目以降は CI 経由で provenance 付き）。

## Trusted Publisher 設定（初回 publish 後・パッケージごとに npm 側で1回）

npm の各 package settings（`https://www.npmjs.com/package/@hideyukimori/nene2-tokens` →
Settings → Trusted Publisher）:

| Field             | Value                              |
| ----------------- | ---------------------------------- |
| Provider          | GitHub Actions                     |
| Repository        | `hideyukiMORI/nene2-fleet-tooling` |
| Workflow filename | `publish.yml`                      |

`nene2-standards` も同じ値で設定する（Workflow filename は共通 — パッケージ選択は
workflow_dispatch の input で行う）。

## 2回目以降（GitHub Actions）

1. `main` で `version` を bump する PR をマージ。
2. Actions → **Publish npm** → Run workflow（`package` を選択・まず `dry_run: true`）。
3. 本番: `dry_run: false`。成功時に git tag **`<package>-vX.Y.Z`** と GitHub Release を自動作成。

workflow は `npm run check`（**AM-2 release gate 含む** — 契約キー集合が凍結記録
`packages/nene2-tokens/contract-freeze.json` と一致しない限り publish 拒否）を通ってから publish する。

## publish 成功後にやること

- `fleet-baseline.json` の当該パッケージを `null` → 実版数（`^1.0.0`）に更新する **別 PR**
  （`docs/fleet-baseline.test.ts` の期待値も同時に更新 — 未公開版を書かない誠実性ガードの解除）。
