# Publish 手順 — nene2-tokens / nene2-standards / nene2-i18n / nene2-ui

`nene2-js` の release flow と同型（[nene2-js docs/development/publish.md](https://github.com/hideyukiMORI/nene2-js/blob/main/docs/development/publish.md)）。
CI は [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)（OIDC）— 長命 `NPM_TOKEN` は使わない。
publish の実行は施主（hide）。担当リナは準備と検証まで。

> **版の記載場所**（#152・hub 裁定 2026-07-30）: **README に版を書かない**。
> 正本は `npm view @hideyukimori/<pkg> version`（公開版）と `fleet-baseline.json`（floor）。
> publish 後に README を追随させる手順は**不要**（手書き台帳を持たない方針を選んだ＝#152 提案 (ii)）。

## 対象

| パッケージ                      | 何を配るか                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@hideyukimori/nene2-tokens`    | Core Token Contract v1（color 28＋shadow 4）・`validate:themes`・themegen・codemod 写像表。契約凍結済み（2026-07-14 hide 承認）で、契約キー集合の変更は stop-the-line ADR のみ |
| `@hideyukimori/nene2-standards` | ESLint / Stylelint 配布 config・`nene2-check`（conformance・fail-closed）・registries                                                                                          |
| `@hideyukimori/nene2-i18n`      | 型付き i18n（ja 権威カタログ・parity・`./format` / `./react` / `./testing` subpath）。`private` 解除済み（#44・2026-07-16 hide 裁定）                                          |
| `@hideyukimori/nene2-ui`        | フリート共有 React UI キット（token 駆動の部品）。**初回 publish 未実施**                                                                                                      |

### 🔴 この表に版を書かない（#313）

**版の列は 2026-08-23 に落とした。** 3パッケージとも「**未 publish**」と書かれている版が、
**実際には全部 publish 済み**だったため（`tokens 1.2.0` / `standards 2.1.0`（実測は既に 2.2.0）/
`i18n 0.3.0`）。しかも文書自身が

> ※各 table 行・版節の「publish 済み」訂正は各パッケージの次 bump PR で（established パターン）

と**訂正の先送りを手順として明記**しており、それが腐敗の機構だった。**publish 手順書に
「まだ出ていない」と書いてあるものが既に出ている**のは、いちばん危ない腐り方。

これは #55 / #152 で README から手書きの版表を落としたのと**同じ形**（_手書きの版表がある限り再発する_）。
⇒ **表そのものを持たない。**

**版の取り方**:

| 知りたいこと                  | コマンド                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 公開されている最新版          | `npm view @hideyukimori/<pkg> version`                                                                                            |
| このツリーのローカル版        | `node -p "require('./packages/<pkg>/package.json').version"`                                                                      |
| フリートの floor              | `fleet-baseline.json`                                                                                                             |
| **未 publish の差分があるか** | 上2つを見比べる。同値でも**タグ以降にコミットがあれば未リリースの変更がある**: `git log <pkg>-v<version>..HEAD -- packages/<pkg>` |

**npm 上に実在する版**〔2026-08-23 実測・`npm view <pkg> versions`〕:

```
nene2-standards  1.0.0 1.0.1 1.1.0 1.2.0 2.0.0 2.0.1 2.1.0 2.1.1 2.2.0
nene2-tokens     1.0.0 1.0.1 1.1.0 1.2.0
nene2-i18n       0.1.0 0.2.0 0.3.0
nene2-ui         （未公開）
```

🔴 **この一覧も測定時点つきの参考**であって、正本はコマンドの方。**引用するときは日付ごと引くこと。**

**以下の版ごとの節は残す** — あれは「何を出したか」の記録で、過去形なので腐らない。
🔴 ただし**節の見出しに現在の状態（`✅ publish 済み` / 準備中）を書くと、そこが腐る**。
状態は上のコマンドで引くこと。

## publish 束の履歴と現在の待ち

> 🔴 **「現在の未 publish は◯◯」をここに書かない**（#313）。この行はかつて `nene2-i18n 0.3.0` を未 publish と書いていたが、実測では publish 済みだった。**取り方は上表**。
> `nene2-i18n` 0.2.0（#129・`./testing`）は **publish 済み**（npm view 実測 latest=0.2.0）。
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

この版に入ったコミット（`39e3cb5`（#100）..`1f30dc0`（#108）・5件 — P2 registry 再設計の器）:

- **feat: lint-baseline (rule,file) grandfather 器**（A1 #100 schema／A2 #109 stylelint 合成が per-file で当該 rule を null 化・語彙内 file 欠落は loud error／A4 #104 init --scan が構造ルール違反を programmatic stylelint で実測して frozenCount を生成）。構造負債（selector-max-specificity 等）を shrink-only で grandfather する（invoice 169 / deal 12 の緑化器）。
- **🔴 BREAKING（B1 #106）: per-repo registries.jsonc read＋tarball 同梱撤去**。`stylelintConfigFor(repo, opts?)` は既定 `cwd/registries.jsonc` を読む（不在=loud error・空=base・別 repo 混入=loud error）。**`package.json` の `files` から `registries` を除去**＝一般ユーザ配布物に NeNe 台帳を載せない（監査 A-1/A-2 根治・`npm pack --dry-run` で非同梱を実測）。消費側は `<repo>/registries.jsonc` が必要（fleet-tooling cross-review で配備・G-7）。
- feat: init --scan は registries 不在=空で bootstrap 続行（bootstrap #108・--check は不在=中止維持）＝全 fresh arm の初回台帳生成の穴を塞ぐ。
- 検証: 統合 main で `npm run check` 緑（398 tests・AM-2 PASS）〔実測〕。

### `@hideyukimori/nene2-standards` 2.0.1（**patch — バグ修正のみ**）✅ publish 済み（2026-07-21・#121 prep）

この版に入ったコミット（`95eedb0`（#117）・1件 — pilot 発見の欠陥修正）:

- **fix: `nene2/layer-components-allowlist` が @layer components 内の @keyframes フレーム（from/to/percentage）を class 誤検知して reject するのを修正**（#116）。兄弟ルール（noUnlayeredCss 等）と一貫した keyframe スキップを追加。init-scan も keyframe を class 収集しないため、罰する側だけが keyframe を見る非対称＝生成 baseline で緑到達不能を潰す。回帰テスト3件同梱（keyframes-allowlist.test.ts）。
- 発見経緯: **D-invoice pilot（実証1例目）**。invoice の index.css の `@keyframes csv-spin{to{}}` が唯一の偽陽性で赤だった。修正版 standards を pack→invoice clone install→`stylelint 'src/**/*.css'` で rc=0（緑・168 構造違反は registries.jsonc で grandfather・新規未登録クラスは赤）をエンドツーエンド実測。
- API 変更なし（patch）。BREAKING の per-repo registries（2.0.0）はそのまま。**D-invoice 本体 PR の緑化前提**。
- 検証: 統合 main で `npm run check` 緑（401 tests・AM-2 PASS）〔実測〕。`npm pack --dry-run` で version 2.0.1・registries 非同梱を確認〔実測〕。

### `@hideyukimori/nene2-standards` 2.1.0（**minor — 機能追加**・#123）

この版に入ったコミット（`c046eac`（#122）・1件 — lint-baseline count-ratchet）:

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

1. **適用済みリポ re-run の idempotence（no-op）保証範囲**〔#90 で実測訂正〕: 保証されるのは (a) themegen `fill` の不動点（**テストで保証** — `themegen.test.ts`「fill is idempotent」）と (b) **契約 namespace の x-送り済みトークン**（`--spacing-x-*`・`--font-weight-x-*` 等 — contract 扱いで不変〔dist 実測〕）。**一般には no-op ではない**: (i) **未知 namespace の x-送り済みトークンは loud reject**（`--line-x-height-body` / `--z-x-modal` とも `kind:'reject'`〔dist 実測 **2026-07-30**〕）。🔴 **2026-07-18 版のこの記述（「silent 二重送り」）は現行実装では誤り**——C part-1 の fallback 除去（#92）が landed し、`tailwindNamespaceOf` は未知 namespace で `null` を返すため step 7 の reject へ落ちる。**silent に壊れるのではなく、撃つ前に止まる**。 (ii) 字面衝突の再入 pair（`gap-x-*` 等）は `reentrantRenames` が plan で**開示**する（既知・#17）。加えて x- 送りの結果が拡張トークン名として不正になる場合も **reject**（#134/#88 — 「自分の検査器が拒否する名前を出さない」）。**運用条項: re-run 時は plan を必ず確認し、reentrant を含む rename があれば撃たない**（`-x-x-` は現行実装では生成されない＝reject 側に落ちる）。
2. **dead/unknown-namespace token（`--line-x-height-body` 等）の挙動**: 写像側は未知名を **reject（fail-closed・null → 呼び出し側 error・写像を発明しない）**が実装・テスト済み。**生成側の loud reject（(i)reject＝`tailwindNamespaceOf` regex fallback 除去）も実装済み**〔#92 受入確認 2026-07-30 実測〕: `tailwindNamespaceOf` に fallback は無く（未知は `null`）、#92 が挙げた6トークン（`--line-height-body` / `--z-dropdown` / `--z-modal` / `--z-toast` / `--border-width-default` / `--border-width-emphasis`）はすべて **reject**。※2026-07-18 時点の「未実装」記述をここで訂正した（実装状況を誇称しない原則は、**遅れて実装された事実を書き漏らさない**ことも含む）。

### `@hideyukimori/nene2-tokens` 1.2.0（**minor — C part-2 束**・#127）

この版に入ったコミット（C part-1 #93〔`6c6cc36`〕/ C part-2 impl #126 / FIELD_TABLE＋版 #127）:

- **feat: C part-1（#92/#93）＝未知 namespace の x-送り fallback 除去→loud reject**（1.1.0 publish 後にマージ済み・本 1.2.0 で初めて npm に載る）。
- **feat: C part-2 impl（#125/#126）＝`LEGACY_PREFIX_HINTS`（hint 付き reject 表・step 5.5）**。fallback 非経由の silent 受理（`--font-size-*` が font-family に食われる #17 型）を止める。font-size は activeFrom W3（既定 W1 は現行 x-送り維持）・z/border-width は plain var 誘導。
- **feat: FIELD_TABLE 正本化（#127）**＝nene-field W1 語彙表（(B) x-送り 20 行）。安全弁1 で origin#24 型衝突を排除（(A) 8 件は field 側 (C)-style 5＋本表 (B) 3 へ再分類）。
- **🔴 §4-4 版乖離吸収**: published 1.1.0 は「未知 namespace を silent x-送り＝`gap-x-stack` 衝突あり」で、main の 1.1.0（C part-1 で reject）と**同一版番号で別挙動**だった（C part-1 が 1.1.0 publish 後マージのため）。**1.2.0 が正本**——published=silent x-送り／1.2.0=reject の別を版で確定する（origin W1 #300 の栓を抜く合流点）。
- 検証: 統合 main で `npm run check` 緑（415 tests・AM-2 PASS）〔実測〕。CODEMOD_MAP_VERSION 1.2.0＝package version と一致。
- 後続: 本 publish 後に origin/field 同時解禁（origin=#300 の栓解除・field=FIELD_TABLE pin＋(C)-style 手前処理→W1 再開）。

### `@hideyukimori/nene2-i18n` 0.2.0（**minor — `./testing` subpath**・#129）

この版に入ったコミット（#129・ティア1）:

- **feat: `./testing` subpath export（`expectCatalogParity`）**（#76 の批准前提(b) 最小解除）。規約 04 §0 API 表の正本 import 経路 `@hideyukimori/nene2-i18n/testing` の実体。payout の [X] exemplar アンカー3本（I18N-6/20/22）が要る `expectCatalogParity` を、この subpath から解決可能にする。`.`（ルート）からの export はそのまま維持（非破壊）。
- スコープ外（分離）: `renderWithI18n` は `/react`（I18nProvider）依存＝**0.3.0 W0b レーン**（「無いものを配らない」— I18N-22 の沈黙 fallback を再生産しないため react は設計してから）。payout B-2 は B-2a（本 0.2.0）/ B-2b（format 0.3.0）分割。
- 検証: 統合 main で `npm run check` 緑（28 files / 418 tests・AM-2 PASS）〔実測〕。`npm pack --dry-run` で version 0.2.0・`dist/testing.{js,d.ts}` 同梱。`import { expectCatalogParity } from '@hideyukimori/nene2-i18n/testing'` が実解決（node exports 解決 OK）〔実測〕。
- 後続: 本 publish 後、payout 側で [X] アンカー3本植栽＋`check:exemplars --ref origin/main`（fetch あり・A-10 正）で green を取り直す（payout レーン同時）。

### `@hideyukimori/nene2-i18n` 0.3.0（**minor — runtime 昇格レーン W0b**・#137）

この版に入ったコミット（#137 ＝ 1本の `/react` PR・vault C4b 実測の runtime 昇格ブロッカー3点＋`/react`）:

- **feat: `createTranslator(catalog, options?)` に第2引数**（§6-①）。`onMissing`（`'throw'` 既定 / `'key-echo'` 可視 fallback I18N-22 / 関数）・`interpolation`（`'single'` 既定 `{name}` / `'double'` `{{name}}`）・`catalogShape`（`'flat'` 既定・完全一致 / `'nested'` dot-path）。**既定引数は 0.2.0 と byte 同一挙動＝既存テスト不変・回帰0**。コア `t()` は分岐を持たず 3 strategy を注入（コアは薄く）。nested の key 型は `string` に緩め（`LooseTranslator`・DotPaths 型は 0.3.x 別 issue・hub 裁定）。
- **feat: `/react` subpath 新設**（§6-②）＝`I18nProvider` + `useTranslation`。`useSyncExternalStore` で locale 購読（vault auth-store 同型）・scope 要素（既定 `<div lang>`・`as` 差替）に lang（AM-18）・provider 外/未知 locale は throw（fail-closed I18N-22）。JSX 不使用（createElement）・react は **optional peerDependency**。
- **feat: `renderWithI18n`**（§6-③）＝I18nProvider で包む RTL テストヘルパ。production `/react` を RTL に密結合させないため実体は `render.ts`・`/testing` から re-export（RTL/react-dom は optional peer）。
- **chore: exports に `./react` 追加・version 0.2.0→0.3.0**（§6-④）。`npm pack --dry-run` で version 0.3.0・`dist/{react,render}.{js,d.ts}` 同梱・`import ... from '@hideyukimori/nene2-i18n/react'` が node 解決〔実測〕。
- 検証: 統合 main で `npm run check` 緑（AM-2 PASS）〔実測〕。**publish はしない**（施主 seam・④は version bump のみ）。
- 意義: **vault が自前 translate.ts / i18n-context.tsx を `createTranslator(..., {catalogShape:'nested', interpolation:'double', onMissing:'key-echo'})` ＋ `I18nProvider` で置換可能に**（C4b クローズの土台）。

publish 手順は「2回目以降（GitHub Actions）」（下記）。dry_run → 本番とも**施主実行**。成功後に fleet-baseline.json の null → 実版数の**別 PR**（下記「publish 成功後にやること」）。

### `@hideyukimori/nene2-ui` 0.1.0（**初回**・#294）

nene-payout の `shared/ui` から10部品を昇格（新規設計ゼロ）＋ `cx()` 是正。
Button / Input / Select / Spinner / Text / PageHeader / FormField / EmptyState / ErrorState / DetailList。

### `@hideyukimori/nene2-ui` 0.2.0（**minor — 部品 10→28本**・#315）

W0.5〜W0.7（#298 / #300 / #302 / #304 / #306 / #308 / #311 / #312）。

この版に入った部品:

| 群           | 追加                                          |
| ------------ | --------------------------------------------- |
| `primitives` | `Textarea` `Checkbox` `Radio` `Switch` `Icon` |
| `layout`     | `Stack` `Grid` `Box` `Section` `Card`         |
| `states`     | `LoadingState`                                |
| `overlay`    | `Modal` `ConfirmDialog`                       |
| `feedback`   | `Badge` `InlineAlert` `ToastProvider`         |
| `data`       | `DataTable` `Pagination`                      |

API の追加（後方互換）: `FormField` の `hint` / `labelAdornment` / `required` / `requiredMarker`、
`useToast`、`CONTROL_CLASS` / `FOCUS_CLASS` / `DISABLED_CLASS`、型 `Space` / `Responsive`。

🔴 **破壊的変更は無いが、既存部品の見た目が変わる箇所が2つある**（どちらも v0.1 に
**無かった**状態表現の追加であって、呼び出し側の指定を上書きするものではない）:

- `Button` / `Input` / `Select` に **disabled と focus-visible の表示が付く**
  （v0.1 は両方とも1つも持っていなかった。画面側が39箇所で自前に補っていた）
- `FormField` が **`aria-describedby` を自分で張る**
  （v0.1 は呼び出し側の責務と doc コメントで宣言し、フリートは守っていなかった）

🔴 **この版で `@source` の欠陥を潰してある**（#316）。0.1.0 の README のとおりに入れると
**Tailwind がキットのクラスを1つも生成しない**（v4 の自動検出は `node_modules` を走査しない）。
ビルドも型検査もテストも緑のまま無装飾になる。**npm の版は不変なので、publish 後に README を
直しても 0.2.0 に固定した艦は壊れた手順を読み続ける** ⇒ **0.2.0 に同梱するのが唯一の機会だった。**
キットは番兵クラス（`SOURCE_PROBE_CLASS`）も同梱し、consumer 側で1行で検知できるようにしてある。

🔴 **`fleet-baseline.json` への登録は publish の後**。floor は消費側が従う下限なので、
**公開されていない版を floor に書くと全艦が達成不能になる**。

## 初回 publish（パッケージごとに1回・hide のローカル操作）

> 🔴 **`@hideyukimori/nene2-ui` の初回 publish が残っている**〔2026-08-23 実測: `npm view` が 404〕。
> 基盤3パッケージ（tokens / standards = 2026-07-14・i18n = 2026-07-16）は初回 publish 済みで、
> 以後の版上げは「2回目以降（GitHub Actions）」の手順。**本節は nene2-ui でもう一度使う。**
>
> ⚠️ 状態を断定する行はここに置かない。**残る初回があるかは `npm view @hideyukimori/<pkg> version` で引く**
> （この行はかつて「残る初回はない」と書いており、nene2-ui が加わった時点で偽になった）。

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
