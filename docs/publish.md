# Publish 手順 — nene2-tokens / nene2-standards / nene2-i18n

`nene2-js` の release flow と同型（[nene2-js docs/development/publish.md](https://github.com/hideyukiMORI/nene2-js/blob/main/docs/development/publish.md)）。
CI は [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)（OIDC）— 長命 `NPM_TOKEN` は使わない。
publish の実行は施主（hide）。担当リナは準備と検証まで。

## 対象

| パッケージ | 版 | 状態 |
| --- | --- | --- |
| `@hideyukimori/nene2-tokens` | ローカル **1.1.0** / npm **1.0.1** | 契約凍結済み（2026-07-14 hide 承認）。**1.0.0・1.0.1 は publish 済み**（2026-07-14T14:24:27Z / 18:51:15Z・1.0.1 = tag `nene2-tokens-v1.0.1` = `4438e6a` #27）。**1.1.0 は未 publish**（#84 準備・下記「publish 待ち束」）。旧ローカル表記 1.0.2（`21ce902`）は束に feat #32 を含むため minor へ改番（semver 判断は fleet 委任 — 2026-07-18 pickup） |
| `@hideyukimori/nene2-standards` | ローカル **1.2.0** / npm **1.1.0** | known-utility warn プレースホルダ等の暫定は README 明記のまま（規約の設計 — O-5/O-6）。**1.0.0・1.0.1・1.1.0 は publish 済み**（1.1.0 = 2026-07-17・`ddce2e2` #67・A1 hooks→model codemod 同梱で minor bump・`shasum 080230a1a7db87e74d5e6619117b79d4574baa1d`・新 bin `nene2-a1-hooks-to-model`）。**1.2.0 は未 publish**（#84 準備・下記「publish 待ち束」） |
| `@hideyukimori/nene2-i18n` | ローカル **0.1.0** / npm **0.1.0** | `private` 解除済み（#44 — 施主 hide 2026-07-16 裁定: 0.1.0 で publish）。**0.1.0 は publish 済み**（2026-07-16T05:46:12Z・`dist-tags latest=0.1.0`・`shasum 36d06bcd65854543c8af1ef971b36eccc1dcb3db`）＝ **未 publish の差分なし**。W0a 実体は catalog+parity（`/format` `/react` `/testing` は W0b — 規約 04 §0 の API 表が状態を明記） |

## publish 待ち束（2026-07-18 準備・#84 — 施主上程は2パッケージ1回）

> 監査根拠: 未 publish 範囲は git tag / npm view の実測突き合わせ（tokens: `nene2-tokens-v1.0.1`=`4438e6a` → main・standards: npm 1.1.0=`ddce2e2` → main）。数字・挙動は全て実測かテスト現物で裏取りし、未実装は未実装と明記する。

### `@hideyukimori/nene2-standards` 1.2.0（minor — feat を含む）

未 publish コミット（`ddce2e2`..main・6件）:

- feat: registries に **components-allowlist kind** 新設（#77）・**stylelintConfigFor** — 台帳由来 secondary の合成（#78・arm 実効部）・**init --scan が components-allowlist を emit**＋T-3/initCheck 追随（#79）
- REG-2 実走台帳の同梱（#82）: vault 156 classes / invoice 381 classes / deal legacy-manifest 2 を `registries/fleet.jsonc` に登録済み。**`files` に `registries` を含むため npm 同梱される**（= arm の前提。stylelintConfigFor は同梱中央 registries しか読まない）
- fix: check:standards-doc の deferred 扱い分離（#73）・`<!-- nonnormative -->` 構造マーカー対応（#75）

### `@hideyukimori/nene2-tokens` 1.1.0（minor — feat を含むため 1.0.2 から改番）

未 publish コミット（`4438e6a`..main・5件）:

- **feat: 語彙 codemod ランナー同梱**（jscodeshift・T-4 の実行物・#32）— tarball 実測で `dist/codemod.js`・`dist/codemod-transform.js`・CLI サブコマンド `codemod`/`codemod-plan` を確認。payout 実弾は fixture テストで固定（fixtures 自体は tarball 非同梱）。**写像表 v1 の payout 分（ランナー実行物）はこの束で初めて npm に載る**（v1.0.0/1.0.1 は写像表のみで実行物なし）
- fix（W1 ブロッカー束）: validate:themes の fill 誇称是正（#34）・**x- 送りの Tailwind v4 namespace 保存**（#35）・@import layer() 二重指定封じ（#43）・**拡張トークン検査の namespace 表導出**（#50 — 道具が自分の生成物を拒否していた W1 ブロッカーの解消）

release note 明記2点（hub 依頼・正直表記）:

1. **適用済みリポ re-run の idempotence（no-op）保証範囲**: themegen `fill` は不動点（fixed point）を**テストで保証**（`themegen.test.ts`「fill is idempotent」）。codemod は写像キーが旧名のみ＝適用済みコードに再走しても書き換え対象が残らない設計（衝突検出 #27）。**フリート実リポでの re-run 実測はまだ無い** — 保証はテスト・設計由来の範囲。
2. **dead/unknown-namespace token（`--line-x-height-body` 等）の挙動**: 写像側は未知名を **reject（fail-closed・null → 呼び出し側 error・写像を発明しない）**が実装・テスト済み。**生成側の loud reject（(i)reject＝`tailwindNamespaceOf` regex fallback 除去）は C part-1 で未実装** — 本束に入っているのは #50 の導出までで、(i)reject は C 完了後（原理: loud reject・実装状況を誇称しない）。

publish 手順は「2回目以降（GitHub Actions）」（下記）。dry_run → 本番とも**施主実行**。成功後に fleet-baseline.json の null → 実版数の**別 PR**（下記「publish 成功後にやること」）。

## 初回 publish（パッケージごとに1回・hide のローカル操作）

> ✅ **基盤3パッケージとも初回 publish 済み＝残る初回はない**（tokens / standards = 2026-07-14・i18n = 2026-07-16）。
> 以後の版上げは全て「2回目以降（GitHub Actions）」の手順。本節は**来歴の記録**として残す。

Trusted Publisher は **既存パッケージにしか設定できない**（npm の package settings 画面が
初回 publish 後にしか存在しない）ため、初回はローカルから account 2FA で publish した:

```bash
cd nene2-fleet-tooling
npm ci && npm run check   # AM-2 release gate 含む全緑を確認
npm publish --dry-run --workspace packages/<pkg>   # pack 内容の最終確認
npm publish --workspace packages/<pkg>             # 2FA: --otp=<code>
```

確認: `npm view @hideyukimori/<pkg> version`

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

`nene2-standards` と `nene2-i18n` も同じ値で設定する（Workflow filename は共通 — パッケージ選択は
workflow_dispatch の input で行う）。**3パッケージとも初回 publish 済み＝npm 側の settings 画面は既に存在する。**

## 2回目以降（GitHub Actions）

1. `main` で `version` を bump する PR をマージ。
2. Actions → **Publish npm** → Run workflow（`package` を選択・まず `dry_run: true`）。
3. 本番: `dry_run: false`。成功時に git tag **`<package>-vX.Y.Z`** と GitHub Release を自動作成。

workflow は `npm run check`（**AM-2 release gate 含む** — 契約キー集合が凍結記録
`packages/nene2-tokens/contract-freeze.json` と一致しない限り publish 拒否）を通ってから publish する。

## publish 成功後にやること

- `fleet-baseline.json` の当該パッケージを `null` → 実版数（`^1.0.0`）に更新する **別 PR**
  （`docs/fleet-baseline.test.ts` の期待値も同時に更新 — 未公開版を書かない誠実性ガードの解除）。
