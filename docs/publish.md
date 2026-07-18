# Publish 手順 — nene2-tokens / nene2-standards / nene2-i18n

`nene2-js` の release flow と同型（[nene2-js docs/development/publish.md](https://github.com/hideyukiMORI/nene2-js/blob/main/docs/development/publish.md)）。
CI は [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)（OIDC）— 長命 `NPM_TOKEN` は使わない。
publish の実行は施主（hide）。担当リナは準備と検証まで。

## 対象

| パッケージ                      | 版                                 | 状態                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hideyukimori/nene2-tokens`    | ローカル **1.1.0** / npm **1.1.0** | 契約凍結済み（2026-07-14 hide 承認）。**1.0.0・1.0.1・1.1.0 は publish 済み**（1.1.0 = 2026-07-18・#85 束・写像表 v1 payout 分＋codemod ランナー同梱の minor〔npm view 実測〕）＝**未 publish の差分なし**。旧ローカル表記 1.0.2（`21ce902`）は束に feat #32 を含むため minor へ改番（semver 判断は fleet 委任 — 2026-07-18 pickup）                                 |
| `@hideyukimori/nene2-standards` | ローカル **2.0.0** / npm **1.2.0** | known-utility warn プレースホルダ等の暫定は README 明記のまま（規約の設計 — O-5/O-6）。**1.0.0・1.0.1・1.1.0・1.2.0 は publish 済み**（1.2.0 = 2026-07-18・#85 束・registries components-allowlist kind＋stylelintConfigFor 同梱〔npm view 実測〕）。**2.0.0 は未 publish**（#110 準備・下記「2.0.0 節」・BREAKING = P2 器 landed で per-repo 化＋tarball 同梱撤去） |
| `@hideyukimori/nene2-i18n`      | ローカル **0.1.0** / npm **0.1.0** | `private` 解除済み（#44 — 施主 hide 2026-07-16 裁定: 0.1.0 で publish）。**0.1.0 は publish 済み**（2026-07-16T05:46:12Z・`dist-tags latest=0.1.0`・`shasum 36d06bcd65854543c8af1ef971b36eccc1dcb3db`）＝ **未 publish の差分なし**。W0a 実体は catalog+parity（`/format` `/react` `/testing` は W0b — 規約 04 §0 の API 表が状態を明記）                            |

## publish 束の履歴と現在の待ち

> **現在の未 publish = `nene2-standards` 2.0.0 のみ**（#110・下記「2.0.0 節」）。
> #84/#85 束（standards 1.2.0＋tokens 1.1.0）は **2026-07-18 publish 済み**（npm view 実測で latest 一致）。
> 監査根拠: 未 publish 範囲は git tag / npm view の実測突き合わせ。数字・挙動は全て実測かテスト現物で裏取りし、未実装は未実装と明記する。

### `@hideyukimori/nene2-standards` 1.2.0（minor — feat を含む）✅ publish 済み（2026-07-18・#85 束）

- feat: registries に **components-allowlist kind** 新設（#77）・**stylelintConfigFor** — 台帳由来 secondary の合成（#78・arm 実効部）・**init --scan が components-allowlist を emit**＋T-3/initCheck 追随（#79）
- REG-2 実走台帳の同梱（#82）: vault 156 classes / invoice 381 classes / deal legacy-manifest 2 を `registries/fleet.jsonc` に登録。
  ※ 1.2.0 時点では `files` に `registries` を含み npm 同梱された（stylelintConfigFor は同梱中央 registries を読む）。**2.0.0 で per-repo 化＋同梱撤去（下記・BREAKING）**。
- fix: check:standards-doc の deferred 扱い分離（#73）・`<!-- nonnormative -->` 構造マーカー対応（#75）

### `@hideyukimori/nene2-standards` 2.0.0（**major — BREAKING**・#110 準備）

未 publish コミット（`39e3cb5`（#100）..`1f30dc0`（#108）・5件 — P2 registry 再設計の器）:

- **feat: lint-baseline (rule,file) grandfather 器**（A1 #100 schema／A2 #109 stylelint 合成が per-file で当該 rule を null 化・語彙内 file 欠落は loud error／A4 #104 init --scan が構造ルール違反を programmatic stylelint で実測して frozenCount を生成）。構造負債（selector-max-specificity 等）を shrink-only で grandfather する（invoice 169 / deal 12 の緑化器）。
- **🔴 BREAKING（B1 #106）: per-repo registries.jsonc read＋tarball 同梱撤去**。`stylelintConfigFor(repo, opts?)` は既定 `cwd/registries.jsonc` を読む（不在=loud error・空=base・別 repo 混入=loud error）。**`package.json` の `files` から `registries` を除去**＝一般ユーザ配布物に NeNe 台帳を載せない（監査 A-1/A-2 根治・`npm pack --dry-run` で非同梱を実測）。消費側は `<repo>/registries.jsonc` が必要（fleet-tooling cross-review で配備・G-7）。
- feat: init --scan は registries 不在=空で bootstrap 続行（bootstrap #108・--check は不在=中止維持）＝全 fresh arm の初回台帳生成の穴を塞ぐ。
- 検証: 統合 main で `npm run check` 緑（398 tests・AM-2 PASS）〔実測〕。

### `@hideyukimori/nene2-tokens` 1.1.0（minor — feat を含むため 1.0.2 から改番）✅ publish 済み（2026-07-18・#85 束）

publish 済みコミット（`4438e6a`..#85・5件）— 以下は release note の来歴記録:

- **feat: 語彙 codemod ランナー同梱**（jscodeshift・T-4 の実行物・#32）— tarball 実測で `dist/codemod.js`・`dist/codemod-transform.js`・CLI サブコマンド `codemod`/`codemod-plan` を確認。payout 実弾は fixture テストで固定（fixtures 自体は tarball 非同梱）。**写像表 v1 の payout 分（ランナー実行物）はこの束で初めて npm に載る**（v1.0.0/1.0.1 は写像表のみで実行物なし）
- fix（W1 ブロッカー束）: validate:themes の fill 誇称是正（#34）・**x- 送りの Tailwind v4 namespace 保存**（#35）・@import layer() 二重指定封じ（#43）・**拡張トークン検査の namespace 表導出**（#50 — 道具が自分の生成物を拒否していた W1 ブロッカーの解消）

release note 明記2点（hub 依頼・正直表記）:

1. **適用済みリポ re-run の idempotence（no-op）保証範囲**〔#90 で実測訂正〕: 保証されるのは (a) themegen `fill` の不動点（**テストで保証** — `themegen.test.ts`「fill is idempotent」）と (b) **契約 namespace の x-送り済みトークン**（`--spacing-x-*`・`--font-weight-x-*` 等 — contract 扱いで不変〔dist 実測〕）。**一般には no-op ではない**: (i) **未知 namespace の x-送り済みトークンは再走で silent 二重送り**（`--line-x-height-body → --line-x-x-height-body`・`--z-x-modal → --z-x-x-modal`〔dist 実測 2026-07-18〕— fallback が namespace を再発明するため。plan に通常 rename として載り誤りとは示されない） (ii) 字面衝突の再入 pair（`gap-x-*` 等）は `reentrantRenames` が plan で**開示**する（既知・#17）。**運用条項: re-run 時は plan を必ず確認し、reentrant または `-x-x-` を含む rename があれば撃たない**。(i) の根治は C part-1（fallback 除去＝loud reject 化・本 publish 後にマージ）。
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

- `fleet-baseline.json` の当該パッケージを実版数に更新する **別 PR**
  （`docs/fleet-baseline.test.ts` の期待値も同時に更新 — 未公開版を書かない誠実性ガードの解除・AM-12 の結合）。
  **2.0.0 の場合**: standards `^1.2.0` → `^2.0.0`（publish 成功＝npm latest 2.0.0 を実測してから。BREAKING なので caret でも 1.x は拾わない）。
  併せて **arm 各リポの `<repo>/registries.jsonc` 配備（レーンD）と standards devDep pin ^2.0.0** が per-repo 化の受入条件（D-invoice が実証1例目）。
