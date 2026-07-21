# Publish 手順 — nene2-tokens / nene2-standards / nene2-i18n

`nene2-js` の release flow と同型（[nene2-js docs/development/publish.md](https://github.com/hideyukiMORI/nene2-js/blob/main/docs/development/publish.md)）。
CI は [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)（OIDC）— 長命 `NPM_TOKEN` は使わない。
publish の実行は施主（hide）。担当リナは準備と検証まで。

## 対象

| パッケージ                      | 版                                 | 状態                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hideyukimori/nene2-tokens`    | ローカル **1.2.0** / npm **1.1.0** | 契約凍結済み（2026-07-14 hide 承認）。**1.0.0・1.0.1・1.1.0 は publish 済み**（1.1.0 = 2026-07-18・#85 束〔npm view 実測〕）。**1.2.0 は未 publish**（#127 準備・下記「1.2.0 節」・minor = C part-2 束: LEGACY_PREFIX_HINTS＋FIELD_TABLE＋§4-4 版乖離吸収） |
| `@hideyukimori/nene2-standards` | ローカル **2.1.0** / npm **2.0.1** | known-utility warn プレースホルダ等の暫定は README 明記のまま（規約の設計 — O-5/O-6）。**1.0.0・1.0.1・1.1.0・1.2.0・2.0.0・2.0.1 は publish 済み**（2.0.1 = 2026-07-21・patch #116 keyframe 偽陽性修正〔npm view 実測 latest=2.0.1〕）。**2.1.0 は未 publish**（#123 準備・下記「2.1.0 節」・minor = #119 lint-baseline count-ratchet を arm へ届ける） |
| `@hideyukimori/nene2-i18n`      | ローカル **0.3.0** / npm **0.2.0** | `private` 解除済み（#44 — 施主 hide 2026-07-16 裁定）。**0.1.0・0.2.0 は publish 済み**（0.2.0 = `./testing` subpath・#129／npm view 実測 latest=0.2.0）。**0.3.0 は未 publish**（#137 準備・下記「0.3.0 節」・minor = runtime translator options＋`/react`（I18nProvider）＋`renderWithI18n`）。W0b runtime 昇格レーン（`/format` は別供給・I18N-13） |

## publish 束の履歴と現在の待ち

> **現在の未 publish = `nene2-i18n` 0.3.0（#137・minor・下記「0.3.0 節」）**。`nene2-i18n` 0.2.0（#129・`./testing`）は **publish 済み**（npm view 実測 latest=0.2.0）。
> standards **2.1.0**（#123・count-ratchet）＋ tokens **1.2.0**（#127・C part-2＋FIELD_TABLE）は **2026-07-21 publish 済み**（npm view 実測 latest=2.1.0 shasum 4921c61d / latest=1.2.0 shasum 8ba2e691）。※各 table 行・版節の「publish 済み」訂正は各パッケージの次 bump PR で（established パターン）。
> standards **2.0.1** は **2026-07-21 publish 済み**（patch #116 keyframe 修正／npm view 実測 latest=2.0.1・shasum e6ce6b0e）。
> standards **2.0.0** は **2026-07-21 publish 済み**（BREAKING・per-repo registries／npm view 実測 latest=2.0.0・shasum 20e4f3e0）。
> #84/#85 束（standards 1.2.0＋tokens 1.1.0）は **2026-07-18 publish 済み**（npm view 実測で latest 一致）。
> 監査根拠: 未 publish 範囲は git tag / npm view の実測突き合わせ。数字・挙動は全て実測かテスト現物で裏取りし、未実装は未実装と明記する。

### `@hideyukimori/nene2-standards` 1.2.0（minor — feat を含む）✅ publish 済み（2026-07-18・#85 束）

- feat: registries に **components-allowlist kind** 新設（#77）・**stylelintConfigFor** — 台帳由来 secondary の合成（#78・arm 実効部）・**init --scan が components-allowlist を emit**＋T-3/initCheck 追随（#79）
- REG-2 実走台帳の同梱（#82）: vault 156 classes / invoice 381 classes / deal legacy-manifest 2 を `registries/fleet.jsonc` に登録。
  ※ 1.2.0 時点では `files` に `registries` を含み npm 同梱された（stylelintConfigFor は同梱中央 registries を読む）。**2.0.0 で per-repo 化＋同梱撤去（下記・BREAKING）**。
- fix: check:standards-doc の deferred 扱い分離（#73）・`<!-- nonnormative -->` 構造マーカー対応（#75）

### `@hideyukimori/nene2-standards` 2.0.0（**major — BREAKING**）✅ publish 済み（2026-07-21・#111 prep）

未 publish コミット（`39e3cb5`（#100）..`1f30dc0`（#108）・5件 — P2 registry 再設計の器）:

- **feat: lint-baseline (rule,file) grandfather 器**（A1 #100 schema／A2 #109 stylelint 合成が per-file で当該 rule を null 化・語彙内 file 欠落は loud error／A4 #104 init --scan が構造ルール違反を programmatic stylelint で実測して frozenCount を生成）。構造負債（selector-max-specificity 等）を shrink-only で grandfather する（invoice 169 / deal 12 の緑化器）。
- **🔴 BREAKING（B1 #106）: per-repo registries.jsonc read＋tarball 同梱撤去**。`stylelintConfigFor(repo, opts?)` は既定 `cwd/registries.jsonc` を読む（不在=loud error・空=base・別 repo 混入=loud error）。**`package.json` の `files` から `registries` を除去**＝一般ユーザ配布物に NeNe 台帳を載せない（監査 A-1/A-2 根治・`npm pack --dry-run` で非同梱を実測）。消費側は `<repo>/registries.jsonc` が必要（fleet-tooling cross-review で配備・G-7）。
- feat: init --scan は registries 不在=空で bootstrap 続行（bootstrap #108・--check は不在=中止維持）＝全 fresh arm の初回台帳生成の穴を塞ぐ。
- 検証: 統合 main で `npm run check` 緑（398 tests・AM-2 PASS）〔実測〕。

### `@hideyukimori/nene2-standards` 2.0.1（**patch — バグ修正のみ**）✅ publish 済み（2026-07-21・#121 prep）

未 publish コミット（`95eedb0`（#117）・1件 — pilot 発見の欠陥修正）:

- **fix: `nene2/layer-components-allowlist` が @layer components 内の @keyframes フレーム（from/to/percentage）を class 誤検知して reject するのを修正**（#116）。兄弟ルール（noUnlayeredCss 等）と一貫した keyframe スキップを追加。init-scan も keyframe を class 収集しないため、罰する側だけが keyframe を見る非対称＝生成 baseline で緑到達不能を潰す。回帰テスト3件同梱（keyframes-allowlist.test.ts）。
- 発見経緯: **D-invoice pilot（実証1例目）**。invoice の index.css の `@keyframes csv-spin{to{}}` が唯一の偽陽性で赤だった。修正版 standards を pack→invoice clone install→`stylelint 'src/**/*.css'` で rc=0（緑・168 構造違反は registries.jsonc で grandfather・新規未登録クラスは赤）をエンドツーエンド実測。
- API 変更なし（patch）。BREAKING の per-repo registries（2.0.0）はそのまま。**D-invoice 本体 PR の緑化前提**。
- 検証: 統合 main で `npm run check` 緑（401 tests・AM-2 PASS）〔実測〕。`npm pack --dry-run` で version 2.0.1・registries 非同梱を確認〔実測〕。

### `@hideyukimori/nene2-standards` 2.1.0（**minor — 機能追加**・#123 準備）

未 publish コミット（`c046eac`（#122）・1件 — lint-baseline count-ratchet）:

- **feat: `init --check` に lint-baseline count-ratchet を配線**（#119）。baselined な (rule,file) の `frozenCount` ceiling を実強制（AM-14 縮小単調検査器の実装本体）。`InitCheckReport` に `lintBaselineRegressions`（実測 live > frozenCount＝**FAIL**）＋`lintBaselineShrinkable`（live < frozenCount＝縮小歓迎の advisory・非 FAIL）を追加。CLI `init --check` の exit を「未分類 + 回帰 > 0 で FAIL」へ拡張。
- なぜ minor: report field 追加＋新 FAIL 条件＝機能追加。既存 arm は `init --check` 未配線ゆえ非破壊（semver 正直・hub 裁定 2026-07-21）。
- 意義: **判例20 の穴（同一 baselined (rule,file) 内の count 回帰が stylelint gate では機械検出されない一辺）を閉じる**。D-invoice/D-deal pilot（Q-D4）で実測周知した穴の恒久策。
- **arm 実強制の前提**: publish 後、invoice/deal 等が新版 pin＋check に `nene2-check init --check` を配線（arm-side flip・(a) 採用）して初めて CI 強制される。「配線（本 publish）」と「実強制（arm flip）」は別段（横展開ガードは実強制 landed まで解除しない）。
- 検証: 統合 main で `npm run check` 緑（405 tests・AM-2 PASS）〔実測〕。`npm pack --dry-run` で version 2.1.0・registries 非同梱を確認〔実測〕。

### `@hideyukimori/nene2-tokens` 1.1.0（minor — feat を含むため 1.0.2 から改番）✅ publish 済み（2026-07-18・#85 束）

publish 済みコミット（`4438e6a`..#85・5件）— 以下は release note の来歴記録:

- **feat: 語彙 codemod ランナー同梱**（jscodeshift・T-4 の実行物・#32）— tarball 実測で `dist/codemod.js`・`dist/codemod-transform.js`・CLI サブコマンド `codemod`/`codemod-plan` を確認。payout 実弾は fixture テストで固定（fixtures 自体は tarball 非同梱）。**写像表 v1 の payout 分（ランナー実行物）はこの束で初めて npm に載る**（v1.0.0/1.0.1 は写像表のみで実行物なし）
- fix（W1 ブロッカー束）: validate:themes の fill 誇称是正（#34）・**x- 送りの Tailwind v4 namespace 保存**（#35）・@import layer() 二重指定封じ（#43）・**拡張トークン検査の namespace 表導出**（#50 — 道具が自分の生成物を拒否していた W1 ブロッカーの解消）

release note 明記2点（hub 依頼・正直表記）:

1. **適用済みリポ re-run の idempotence（no-op）保証範囲**〔#90 で実測訂正〕: 保証されるのは (a) themegen `fill` の不動点（**テストで保証** — `themegen.test.ts`「fill is idempotent」）と (b) **契約 namespace の x-送り済みトークン**（`--spacing-x-*`・`--font-weight-x-*` 等 — contract 扱いで不変〔dist 実測〕）。**一般には no-op ではない**: (i) **未知 namespace の x-送り済みトークンは再走で silent 二重送り**（`--line-x-height-body → --line-x-x-height-body`・`--z-x-modal → --z-x-x-modal`〔dist 実測 2026-07-18〕— fallback が namespace を再発明するため。plan に通常 rename として載り誤りとは示されない） (ii) 字面衝突の再入 pair（`gap-x-*` 等）は `reentrantRenames` が plan で**開示**する（既知・#17）。**運用条項: re-run 時は plan を必ず確認し、reentrant または `-x-x-` を含む rename があれば撃たない**。(i) の根治は C part-1（fallback 除去＝loud reject 化・本 publish 後にマージ）。
2. **dead/unknown-namespace token（`--line-x-height-body` 等）の挙動**: 写像側は未知名を **reject（fail-closed・null → 呼び出し側 error・写像を発明しない）**が実装・テスト済み。**生成側の loud reject（(i)reject＝`tailwindNamespaceOf` regex fallback 除去）は C part-1 で未実装** — 本束に入っているのは #50 の導出までで、(i)reject は C 完了後（原理: loud reject・実装状況を誇称しない）。

### `@hideyukimori/nene2-tokens` 1.2.0（**minor — C part-2 束**・#127 準備）

未 publish コミット（C part-1 #93〔`6c6cc36`〕/ C part-2 impl #126 / FIELD_TABLE＋版 #127）:

- **feat: C part-1（#92/#93）＝未知 namespace の x-送り fallback 除去→loud reject**（1.1.0 publish 後にマージ済み・本 1.2.0 で初めて npm に載る）。
- **feat: C part-2 impl（#125/#126）＝`LEGACY_PREFIX_HINTS`（hint 付き reject 表・step 5.5）**。fallback 非経由の silent 受理（`--font-size-*` が font-family に食われる #17 型）を止める。font-size は activeFrom W3（既定 W1 は現行 x-送り維持）・z/border-width は plain var 誘導。
- **feat: FIELD_TABLE 正本化（#127）**＝nene-field W1 語彙表（(B) x-送り 20 行）。安全弁1 で origin#24 型衝突を排除（(A) 8 件は field 側 (C)-style 5＋本表 (B) 3 へ再分類）。
- **🔴 §4-4 版乖離吸収**: published 1.1.0 は「未知 namespace を silent x-送り＝`gap-x-stack` 衝突あり」で、main の 1.1.0（C part-1 で reject）と**同一版番号で別挙動**だった（C part-1 が 1.1.0 publish 後マージのため）。**1.2.0 が正本**——published=silent x-送り／1.2.0=reject の別を版で確定する（origin W1 #300 の栓を抜く合流点）。
- 検証: 統合 main で `npm run check` 緑（415 tests・AM-2 PASS）〔実測〕。CODEMOD_MAP_VERSION 1.2.0＝package version と一致。
- 後続: 本 publish 後に origin/field 同時解禁（origin=#300 の栓解除・field=FIELD_TABLE pin＋(C)-style 手前処理→W1 再開）。

### `@hideyukimori/nene2-i18n` 0.2.0（**minor — `./testing` subpath**・#129 準備）

未 publish コミット（#129・ティア1）:

- **feat: `./testing` subpath export（`expectCatalogParity`）**（#76 の批准前提(b) 最小解除）。規約 04 §0 API 表の正本 import 経路 `@hideyukimori/nene2-i18n/testing` の実体。payout の [X] exemplar アンカー3本（I18N-6/20/22）が要る `expectCatalogParity` を、この subpath から解決可能にする。`.`（ルート）からの export はそのまま維持（非破壊）。
- スコープ外（分離）: `renderWithI18n` は `/react`（I18nProvider）依存＝**0.3.0 W0b レーン**（「無いものを配らない」— I18N-22 の沈黙 fallback を再生産しないため react は設計してから）。payout B-2 は B-2a（本 0.2.0）/ B-2b（format 0.3.0）分割。
- 検証: 統合 main で `npm run check` 緑（28 files / 418 tests・AM-2 PASS）〔実測〕。`npm pack --dry-run` で version 0.2.0・`dist/testing.{js,d.ts}` 同梱。`import { expectCatalogParity } from '@hideyukimori/nene2-i18n/testing'` が実解決（node exports 解決 OK）〔実測〕。
- 後続: 本 publish 後、payout 側で [X] アンカー3本植栽＋`check:exemplars --ref origin/main`（fetch あり・A-10 正）で green を取り直す（payout レーン同時）。

### `@hideyukimori/nene2-i18n` 0.3.0（**minor — runtime 昇格レーン W0b**・#137 準備）

未 publish コミット（#137 ＝ 1本の `/react` PR・vault C4b 実測の runtime 昇格ブロッカー3点＋`/react`）:

- **feat: `createTranslator(catalog, options?)` に第2引数**（§6-①）。`onMissing`（`'throw'` 既定 / `'key-echo'` 可視 fallback I18N-22 / 関数）・`interpolation`（`'single'` 既定 `{name}` / `'double'` `{{name}}`）・`catalogShape`（`'flat'` 既定・完全一致 / `'nested'` dot-path）。**既定引数は 0.2.0 と byte 同一挙動＝既存テスト不変・回帰0**。コア `t()` は分岐を持たず 3 strategy を注入（コアは薄く）。nested の key 型は `string` に緩め（`LooseTranslator`・DotPaths 型は 0.3.x 別 issue・hub 裁定）。
- **feat: `/react` subpath 新設**（§6-②）＝`I18nProvider` + `useTranslation`。`useSyncExternalStore` で locale 購読（vault auth-store 同型）・scope 要素（既定 `<div lang>`・`as` 差替）に lang（AM-18）・provider 外/未知 locale は throw（fail-closed I18N-22）。JSX 不使用（createElement）・react は **optional peerDependency**。
- **feat: `renderWithI18n`**（§6-③）＝I18nProvider で包む RTL テストヘルパ。production `/react` を RTL に密結合させないため実体は `render.ts`・`/testing` から re-export（RTL/react-dom は optional peer）。
- **chore: exports に `./react` 追加・version 0.2.0→0.3.0**（§6-④）。`npm pack --dry-run` で version 0.3.0・`dist/{react,render}.{js,d.ts}` 同梱・`import ... from '@hideyukimori/nene2-i18n/react'` が node 解決〔実測〕。
- 検証: 統合 main で `npm run check` 緑（AM-2 PASS）〔実測〕。**publish はしない**（施主 seam・④は version bump のみ）。
- 意義: **vault が自前 translate.ts / i18n-context.tsx を `createTranslator(..., {catalogShape:'nested', interpolation:'double', onMissing:'key-echo'})` ＋ `I18nProvider` で置換可能に**（C4b クローズの土台）。

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
