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

### `@hideyukimori/nene2-ui` 0.17.0（**minor — feat**・vault W1b の待ち分）

**載せ替える前に読むもの: 「各艦でやること」の節（下）。** 中身はすべて**任意 prop**で、**既定は 0.16.1 までの描画と同じ**。
何も渡さない呼び出し側は1文字も変わらない。

| Issue | 入るもの | 既定 |
| --- | --- | --- |
| #390 | `className` を `Badge` / `FormField` / `DataTable` / `Pagination` の4部品に（root に着地） | 渡さなければ無し |
| #422 | `Badge` の `tone` に **`success` / `warn` / `info`**（3 → 6値）。パレットに `success` / `info` 系6色を追加（コントラスト実測つき） | `neutral`＝不変 |
| #421 | `Pagination` に `size`（両 Button へ）/ `stackOnMobile`（`max-sm:` のみ）/ `statusPlacement`（`start` / `center` / `end`） | md・横並び・center＝不変 |
| #424 | `DetailList` に `layout: 'stack' \| 'columns'`。`columns` は **md 未満で自動的に1列**（利用側は書かない） | `stack`＝不変 |

🔴 **`Modal` / `ConfirmDialog` / `ToastProvider` は `className` を受けない（意図）。** オーバーレイ／プロバイダで、
外から任意クラスを載せると `<dialog>` の margin / top-layer の前提が崩れる——0.16.1（#417）がその実例。

### `@hideyukimori/nene2-ui` 0.16.1（**patch — fix**・#417）

**載せ替える前に読むもの: 無し。** 変わるのは1点で、**Tailwind preflight の艦で dialog が中央に来る**ようになる。

| 変わるもの | 0.16.0 まで | 0.16.1 |
| --- | --- | --- |
| `Modal` の dialog の位置（desktop） | **左上 (0,0)** に張り付く（vault の本番・1280px で実測） | 中央 |

🔴 **機構**: UA の `dialog { margin: auto }` を Tailwind v4 の preflight（`* { margin: 0 }`・author origin）が消す。
キットの dialog は margin を自分で言っておらず、`sheetOnMobile` の `max-sm:mt-auto max-sm:mb-0` は
**その margin:auto が在る前提**で書かれていた。⇒ dialog のクラス列に **`m-auto`** を足した。
`max-sm:` 側は変えていない（狭い画面では `max-sm:mb-0` が勝つ）。

⚠️ **jsdom は `showModal` を実装しない**ので、位置そのものはテストで固定できない。固定したのは
「dialog が `m-auto` を自分で持つ」「sheet でも `m-auto` が残り、素の `m-0` 系を持たない」の2本。
**中央に戻ったかは vault の live レーン**（nene-vault #441）**で 0.16.1 を当てて測る。** それまで「直った」と書かない。

⚠️ **0.16.0 で `Modal` を載せた艦は上げること**（`^0.16.0` は 0.16.1 を含む。`npm update @hideyukimori/nene2-ui`）。
上流が出るまでの橋渡し（vault の base 層の `dialog { margin: auto }` 1行）は **0.16.1 適用時に消す**（hub 裁定 08-25）。

### `@hideyukimori/nene2-ui` 0.16.0（**minor — feat**・#392）

**載せ替える前に読むもの: 無し。描画は変わらない。**
`Modal` に**任意 prop を4つ**足しただけで、**4つとも既定は 0.15.0 までの描画と同じ**。
何も渡さない呼び出し側は1文字も変わらない。

| prop | 既定 | 渡すと |
| --- | --- | --- |
| `header` ＋ `closeLabel` | 描かない | **題（`<h2>`）と閉じる制御**を描き、dialog は `aria-labelledby` でその見出しから名前を得る |
| `size` | 幅の制約なし | `sm` / `md` / `lg` の幅上限（`--container-x-slot-modal-*`） |
| `sheetOnMobile` | 通常の dialog | 狭い画面でだけ下端のシートになる（全クラスが `max-sm:` 接頭辞つき） |
| `scrollable` | 本文はそのまま | 本文を入れ物で包んでスクロールさせる |

🔴 **`closeLabel` は `header` を渡したときだけ必須**（判別ユニオン）。**既定の英語文字列を配らない**ため——
キットが訳語を持つと、艦の UI に英語が出荷される（I18N-2）。**必須 prop を増やしてはいない。**

⚠️ **高さ上限はキットが持たない。** `showModal()` した dialog は **UA スタイルが既にビューポートで頭打ち**にする。
キット側でもう1つ上限を作ると `80vh` のようなリテラルがテーマに住むことになり、
**「スロットの既定はスケール参照のみ」という規則に反する**（実際、入れた時点で `readme.test.ts` が赤にした）。
⇒ **足りないのはスクロールのほうだけ。** UA の上限そのものは jsdom で検証できないので**live レーン**（#392）。

🔴 **`aria-modal` を名乗って Esc も focus trap も無い実装の是正**が動機（vault の本番で再現）。
この `Modal` は native `<dialog>` ＋ `showModal()` なので、**focus trap と Esc はブラウザが持つ**。

### `@hideyukimori/nene2-i18n` 0.3.2（**patch — fix**・#419）

**載せ替える前に読むもの: 無し。** `catalogShape: 'nested'` を使う艦（実測では vault のみ・JSON カタログの公認差異）にだけ効く。
flat（既定）は1行も触っていない。

| 変わるもの | 0.3.1 まで | 0.3.2 |
| --- | --- | --- |
| nested lookup で**キー自体にドットを含む**ノード（`audit.actions["document.voided"]`） | 到達できず onMissing（vault の監査ログで **Action 列が生キー表示**・vault #453） | 引ける |

🔴 **機構**: 旧実装は `key.split('.')` を1セグメントずつ辿るだけで、キーにドットを含むノードには原理的に届かなかった。
監査ログの action キーは**バックエンドのイベント名＝データ**なので改名させず（hub 裁定 08-25）、
lookup 側が**各ノードで残りを最長から順に1つのキーとして試し、行き止まりなら後戻り**する形にした。
ドット付きキーと分割経路の両方が在るときは**最長一致（リテラル）が勝つ**。葉だけでなく**中間ノードのドット**も辿れる。
ドットを含まないキーは候補が1つしか無いので、従来と同じ経路を同じ順で辿る＝**挙動不変**。

⚠️ **flat との違いは変えていない。** flat は今までどおり完全一致のみ（探索しない）。nested を使うかどうかは艦の選択のまま。

### `@hideyukimori/nene2-i18n` 0.3.1（**patch**・#402）

🔴 **0.3.0 の publish（2026-07-21）以降、版を上げないまま1コミットが入っていた**（#402 で実測）。
**34日ぶん。** 中身は1件:

| | 出所 |
| --- | --- |
| `exports` に `./package.json` を追加 | #182 |

（`conformance` の provenance が常に null になる欠陥の是正で、4パッケージ横断で `./package.json` を
公開面に足したもの。消費側が版を読めるようにするため。）

🔴 **patch にした理由。** `exports` の追加は公開面の変更なので minor に見えるが、
**`0.4.0` は `#171`（`./format` subpath 供給計画 — I18N-14 v1 の5関数）に予約済み**で、
**先に別の中身で 0.4.0 を消費すると、条文・issue・板の「0.4.0 = `./format`」という参照が全部ずれる。**
⇒ **番号は、それを指している文書の側にも属している。** 追加が `./package.json` の1本だけであり、
**既存の import 経路を1つも変えない**ことから patch を採る。

### `@hideyukimori/nene2-standards` 2.3.0（**minor — feat を含む**・#402）

🔴 **2.2.0 の publish（2026-07-29）以降、版を上げないまま10コミットが入っていた**（#402 で実測）。
**26日ぶん。** `npm view` と `package.json` は 2.2.0 で一致していたので、版だけを見る確認はこの形を通す。

| | 出所 |
| --- | --- |
| **feat: `reportOnly` — ゲート導入段の降格を配布側で持つ**（生成器同梱） | #189 |
| **feat: `init --remeasure` — 既存 cap の引き下げ専用モード** | #176 |
| fix: HTML 埋め込み `<style>` の不可視領域で green を返さない | #164 |
| fix: 非 Tailwind 艦の Tailwind 依存ルールを「緩和」と報告しない | #163 |
| fix: 制定した本人を罰しない — provider / テーマモジュールの誤検知 | #118 / #130 |
| fix: root entry が optional peer の stylelint を静的に巻き込む | #189 |
| fix: `gate-integrity` の red 文言が実装の約束を超えていた | #184 |
| fix: `gate-integrity` の crashed が落ちた側を示さない | #193 |
| fix: conformance の provenance が常に null | #182 |
| `nene2-ui` 追加に伴う追随 | #294 |

触れた出荷物: `src/checks/*`（`cli` / `gate-integrity` / `init-scan` / `run` / `scan-coverage` /
`tailwind-presence`）・`src/configs/*`（`report-only` / `restrictions`）・`src/index.ts`・`src/selectors.ts`。

🔴 **`#163` と `#164` は #402 の起票時点で OPEN のまま**だった。**修正は 2026-07-30 にマージ済み・未 publish**
という状態が26日続いており、**艦が 2.2.0 を入れている限りその2件の欠陥は残っていた**。
⚠️ **issue が open な理由が「未 publish だから」か「issue の射程が commit より広いから」かは測っていない。**

### `@hideyukimori/nene2-tokens` 1.3.0（**minor — feat を含む**・#402）

🔴 **1.2.0 の publish（2026-07-21）以降、版を上げないまま4コミットが入っていた**（#402 で実測）。
**`npm view` と `package.json` は 1.2.0 で一致していた**ので、版だけを見る確認はこの形を通す。
**34日ぶん**の変更がここで出る。

| | 出所 |
| --- | --- |
| **feat: 取り残される `var(--old)` 参照を開示する** | #132 |
| fix: 複合キーを拡張トークンと認識し、自分の生成物を壊さない | #134 / #88 |
| fix: `exports` に `./package.json` を追加 | #182 |
| test: 置換境界の不変条件を固定（#135 は再現せず） | #135 |

触れた出荷物: `src/cli.ts` / `src/codemod.ts` / `src/codemod-map.ts` / `src/contract.ts` / `src/index.ts`。

⚠️ **契約（`COLOR_KEYS` / `SHADOW_KEYS`）は変えていない。** AM-2 release gate は凍結記録と一致したままで、
publish 経路でも `check:am2-gate` が fail-closed で見張る。

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

### `@hideyukimori/nene2-ui` 0.15.0（**描画は変わらない**・#380 / #386）

🔴 **この版は2件を含む。** 規約どおりなら `#380` と `#386` は別々の版になるはずだったが、
**どちらも版の更新を落としてマージした**ため、まとめて 0.15.0 を振っている（`#396`）。
⚠️ **`0.16.0` を振って「0.15.0 は欠番」とはしていない。** 欠番は「マージしたが publish しなかった」
という実際に起きたことを表す記号であって、取りこぼしの隠蔽に使う記号ではない。

**載せ替える前に読むもの: 無し。描画は 1px も変わらない。**

| 入ったもの | 出所 | 艦がすること |
| --- | --- | --- |
| **影のスロット3本**（`--shadow-x-slot-button-primary` / `-card-raised` / `-toast`） | `#386` | **既定は載せ替え前の描画の写し**なので、何もしなくてよい。影を変えたい艦だけ設定する |
| **影のスケールが1段 → 3段**（`--shadow-md` / `--shadow-lg` を新設） | `#386` | 何もしなくてよい（**どこからも参照されていない**）。スロットの行き先として選べる |
| **`themes/slot-pairs.json`**（新しい配布物・`exports` に追加） | `#380` | **テーマ検査を持つ艦は読める**。サイズ対スロットの片側上書きを検知するための対の一覧 |

⚠️ **`--text-x-slot-button-{,sm-}size` は「両方を上書きするか、両方とも既定のままにする」こと。**
**md だけを上書きすると `sm` が周囲の本文サイズを継承して `md` より大きくなる**（`#380`）。
`slot-pairs.json` の `overrideTogether: true` がこの対を指している。

⚠️ **能力が1つ減っている**: 影がスロット経由になったため、`Card` / `Toast` の影は
`shadow-<color>` ユーティリティで色を差し替えられない（`--tw-shadow-color` を経由しない）。
**現状これを使っている艦は無い**〔実測〕が、記録しておく。

---

### `@hideyukimori/nene2-ui` 0.14.0（🔴 **見た目が変わる**・PR 3本 = #364 / #366 / #368）

vault の実ブラウザ突合から出た5件（hub 経由 #397 / #398 / #399）に対応した版。

## 🔴 載せ替える前に、これだけ読めば足りる

**0.11.0 → 0.14.0 で描画が変わるのは下表のとおり。** 版ごとに散らすと全部読まないと気づけないので先頭にまとめる。

🔴 **ここで点数を名乗らない**（#378）。PR 1本が見た目の変化を2つ生むことがあり（#364 = warn 色 ＋ 妥当性の塗り）、
**PR 本数と変化の点数は一致しない**。数を先に書くと、**版が増えた瞬間に本文だけが古くなる**——
実際 0.14.0 の行が足された後も本文は「3点」のままだった。**正本は下の表**であって、その要約ではない。

| 変わるもの                               | 版     | 影響                                                                                               |
| ---------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| **警告が error 色 → warn 色**            | 0.12.0 | `InlineAlert tone="warn"` を使っている画面。**これまで警告が赤で描かれていた**                     |
| **コントロールが妥当性を塗るようになる** | 0.12.0 | `aria-invalid` が立つフィールド。**これまで無塗装**だったので、**新たに枠と背景が付く**            |
| **`Button` が `inline-flex` になる**     | 0.13.0 | **文章の途中に置いたボタン**（周囲のベースラインに乗らなくなる）。ボタン列・ツールバーでは見えない |
| **タッチ端末でコントロールが最低 44px**  | 0.14.0 | **スマホ・タブレットのみ**。デスクトップは不変                                                     |

⚠️ **0.12.0 と 0.13.0 は npm 欠番**（3本を連続でマージし、publish は 0.14.0 で1回）。**publish の失敗ではない**。

---

#### 0.12.0 — warn 状態と、妥当性の塗り（#364）

🔴 **キットは妥当性を一切塗っていなかった。** `CONTROL_CLASS` は `FOCUS + DISABLED` だけで、**`aria-invalid` を立てて announce しながら、不正なフィールドが正常なフィールドとまったく同じ見た目**だった。**9艦中7艦は自分で塗っている**ので、キットへの載せ替えは**製品が既に持っていた合図を静かに取り去っていた**。

vault は「保管期間10年未満」に琥珀の枠を出していた。**8年は `min=7` を満たすので正当な値** ⇒ `aria-invalid` を立てると正当な値を不正と announce し、立てないと合図が出ない。⇒ **`error` とは別の `warn` 状態**（`data-warn` で塗り、文言は `aria-describedby` で読ませる）。

🔑 **vault のテストは `aria-invalid="true"` を主張していたので緑のままだった。テストは塗りではなく「塗りの代理」を検査していた。代理と本体が同じ部品に居るあいだは等価だが、本体が上流へ移った瞬間に別物になる。** ⚠️ **`.callout-*` の #337 と同じ形で、同じリポで2件目。実装を上流へ移す作業は、この形の回帰を構造的に作る。**

**パレットに `warn` / `warn-soft` / `on-warn` / `danger-soft` を追加。** これらは新規ではなく**凍結済み Core Token Contract v1 の28色に既に在り**、このテーマが **8色しか定義していなかった**だけ（AM-2 ゲートは PASS のまま）。**radius と同じ根本原因**（payout からの verbatim 昇格で、payout に warn が無い）。

値は8艦の `--color-warn` の中央値。**`on-warn` はコントラストを計算して選んだ**——この warn の上で white は 3.48:1、`text-primary` は **4.47:1（4.5 に 0.03 届かない）**、採った濃い琥珀は 4.97:1。

同時に `InlineAlert` に `id` / `className`、`--color-x-slot-field-error-fg` → `--color-x-slot-field-required-marker` へ改名（実体が必須マーカーだった・消費者ゼロのうちに）。

#### 0.13.0 — Button のスロットを対称に、中身を自分で並べる（#366）

**padding は size ごとに2組あるのに font は1本**だった。vault は md=13px / sm=12px を出荷していたのに、キットでは両方が同じ大きさになる。⇒ `--text-x-slot-button-sm-size`（既定 `inherit` なので描画は動かない）。

🔴 **BASE に `display` が無かった。** `<button>` の UA 既定は `inline-block`（**Tailwind preflight は display を触らない**・実測）⇒ アイコンと文字がベースライン揃えになる。**`SVG_BOUND` で svg の寸法は面倒を見ているのに、並べ方だけ呼び出し側に残っている**非対称を消した。

⚠️ **flex コンテナは子の匿名テキストの前後の空白を落とす**ので `<Button><Icon /> Save</Button>` のスペースが消える ⇒ gap を `3xs`（≒スペース1つ分）にして、**display の変更が間隔の変更を兼ねない**ようにした。

#### 0.14.0 — タッチ端末での高さ下限（#368）

`sm` ボタンは本文14px に対して**約31px**。WCAG 2.5.8（AA）の 24px は満たすが、**2.5.5（AAA）と Apple HIG の 44px には届かない**。

🔴 **値は 44px。艦の先例は 48px が2艦**（profile / deal・Material の値）だが、**44 は規格を満たす最小値**であり、**48 を焼き込むとキットが大きさを押し付ける**ことになる。**48 が欲しい艦はスロットを上げる。**

🔴 **`CONTROL_CLASS` には入れていない。** `Checkbox` の `<input>` は16px 四方なので、そこに `min-height` を当てると **44×16 の縦長になるだけで対象は大きくならない**。**タップされるのはラベル。** ⇒ **要素が対象そのものである場所にだけ**当てた。

⚠️ **`min-height` は箱を高くするが中身は動かさない**ので `items-center` が要る。**Button が 0.13.0 で flex になったのは別の理由だったが、結果的にこの前提条件だった。**

---

### `@hideyukimori/nene2-ui` 0.11.0（🔴 **破壊的変更を含む**・#353 / #354 / #355）

🔴 **`Checkbox` / `Radio` の `className` が `<label>`（root）へ着地するようになった。** 箱そのものへ当てたい場合は `inputClassName`。

⚠️ **艦の使用実態を範囲つきで実測して 0件**を確認してから入れた（vault 3 / field 2 / records 5 の計10箇所・`className` 付きは 0）。**開始タグと同じ行しか見ない grep では複数行 JSX を跨げない**ので、タグの終端まで追う形で数えている。

**⚠️ 0.9.0 と 0.10.0 は npm に無い。** 3本を連続でマージし、**publish は 0.11.0 で1回**にまとめたため。**publish の失敗ではない**（0.5.0 と同じ形）。

| 版         | Issue | 中身                                 | npm         |
| ---------- | ----- | ------------------------------------ | ----------- |
| 0.9.0      | #353  | 色・字重・型段をすべてスロット経由へ | 🔴 **欠番** |
| 0.10.0     | #354  | `className` が root に着地           | 🔴 **欠番** |
| **0.11.0** | #355  | `Button` が中の svg に上界           | 🟢          |

---

#### 0.9.0 — スロットの被覆が歯抜けだった（#353）

**vault が実ブラウザで突合して発見**（Playwright + Chromium・計算済みスタイルを要素単位・2026-08-23）: **一致73 / 差あり21**、**差はすべてキット部品に閉じていた**（自艦の markup は全項目一致）。

実測すると歯抜けは3件ではなく、**README の「Every design value a component uses comes from a slot」が28部品中26で偽**だった:

```
パレット直接参照       59箇所 / 20ファイル
font-medium 直書き      4箇所
色スロットを持つ部品    FormField と InlineAlert の2つだけ
```

🔴 **パレットは 🔒 ロック**（艦の口は themegen によるファイルごとの差し替え）⇒ **`text-text-primary` を直接書いた部品には、艦が変える口が一切無かった。**

**原因は検査**: 到達検査の正規表現が `p|px|py|…|rounded` **しか列挙していなかった**（`text-` も `bg-` も `font-` も無い）。⇒ **色と字重は最初から検査対象外。**

🔑 **列挙で書いた検査は、列挙に無いものを緑にする。** ⇒ **検査の色の半分は列挙をやめ、パレットをテーマから読む形にした。**

**入ったもの**: 色スロット48本・字重4本・サイズ2本。**既定の見た目は不変**（すべて同じパレット項目への間接参照）。

🔴 `--text-x-slot-button-size` / `--text-x-slot-choice-size` の既定は**段ではなく `inherit`**。この2つは元々 font-size を持っていないので、段を選ぶと全艦の描画が動く。⚠️ Tailwind preflight が `button` に `font: inherit` を当てている（`preflight.css:244` 実測）ので、**preflight 前提で no-op**。

⚠️ **型スケールに 13px が無い**（vault の本番 Button は本文14px に対して13px）。型スケールは Tailwind クラスの実測から作ったので、**段が無い値は原理的に見えない**——radius で `border-radius` 直書きを数え落としたのと同じ形。**記録のみ・未対応。**

#### 0.10.0 — `className` の着地先（#354）

**欠落ではなく不整合。** 全部品で `className` は root へ着地するのに、**`Checkbox` / `Radio` だけ root が `<label>` なのに `<input>` へ行っていた** ⇒ 受け取られ、適用され、**呼び出し側が望みようのない場所へ落ちていた**。レイアウト（`self-start`・幅・margin）は root にしか効かないので、**div で包むしかなかった**。

🔑 **波2 で一度答えた症状の、原因の側。** あのとき「`cursor-pointer` がラベル側で届かない」に対しキットが `cursor-pointer` と `gap` を持つ形で解いたのは正しかったが、**`className` の到達先そのものは残っていた**。**報告された症状を直すことと、報告が指している原因を直すことは別。**

#### 0.11.0 — `Button` の中の svg（#355）

width/height 属性も CSS 寸法も無い `<svg>` は**置換要素の既定 300×150** まで広がる。vault のアップロードボタンが**縦230pxの矩形**になったのがこれ。

🔴 **`max-*` であって `size-*` ではない。** 任意バリアント `[&_svg]:` は**子孫セレクタ**へ落ちるので `Icon` の素のクラス（`h-5 w-5`）より**詳細度が高い** ⇒ `size-*` を当てると **`<Icon size="sm">` がボタン側の寸法で描かれる**。`max-*` は別プロパティなので衝突しない。

**README に載せ替えの注意も追加**: **`<div>` → `<Stack>` は無害ではない**（ブロックフロー → flex で inline 級の子の幅と高さが変わる）。vault は1回の載せ替えで3件踏んでおり、うち2件は flexbox の仕様どおり。**どれも diff には出ない。**

---

### `@hideyukimori/nene2-ui` 0.8.0（**minor — radius スケールを1段から9段＋pill へ**・#348）

**既存の見た目は変わらない**（`--radius-x-md` の値は据え置き・スロット8本の指し先も不変）。**増えるのは選択肢だけ。**

施主が実機で発見（2026-08-23）:

> **角丸の数値が違うように見えるよ／うーん、角丸はもっと小さいよね？これ、もっと小さくしたいというニーズは絶対にあるよ**
> **角丸は 2px が絶対必要って言われると思う。あと、ピル型の指定も必要だよね？**

🔴 **radius は1段しか無かった。** スロット8本（button / control / badge / switch / alert / toast /
modal / card）が全部 `--radius-x-md` を指していたので、**規則どおりに使うと全部 8px にしかならなかった。**
構造検査は全部通っていた——スロットは在り、既定はスケール参照で、部品はスケールに手を伸ばしていない。
**選択を表現できない層の上で、すべての構造検査が緑だった。**

原因（vault が特定）: キットのテーマは **payout からの verbatim 昇格**で、**payout はフリートで唯一
radius が1種類しかない艦**。⇒ **違反が最も少ない艦から昇格したら、選択肢を持たない実装だった。**

🔑 **部品の実装は1艦から昇格してよい。選択肢の集合はフリートの分布からしか決まらない。**

**入ったもの**: `--radius-x-none` `2xs`(2px) `xs`(4px) `sm`(6px) `md`(0.5rem・据え置き)
`lg`(10px) `xl`(12px) `2xl`(16px) `3xl`(24px) ＋ `--radius-x-pill`(9999px)。
10艦の `border-radius` 宣言と `--radius-*` 定義 **266件**の実測から。**完全一致 69.9% / ≤2px 97.7%**。

**判定に軸を1本足した**（vault 提案）: 平均誤差だけだと **`2px`→`0`** が「2px のズレ」として通るが、
records は **0px の9テーマと 2–3px の3テーマを別の製品テーマとして出荷**しているので、
それは丸めではなく**意図して引かれた区別の削除**になる。⇒ **「設計値どうしが同じ段へ潰れないか」**を
候補比較に加えた。

**副次**: 同じ穴が `--font-weight-x-slot-field-label: 500` にもあった（Tailwind が9段の
font-weight スケールを持つのにリテラル）。既存のスロット検査が**知っている名前空間だけを見ていた**ため
素通りしていた。参照へ是正（値は同一）＋検査の射程を拡大。

---

### `@hideyukimori/nene2-ui` 0.7.0（**minor — コントロールの文字サイズを2段に**・#344）

🔴 **既存の見た目が変わる**（0.6.0 は**デスクトップの入力欄も 16px** にしていた）。

施主が実機で発見（2026-08-23）:

> **InputField のフォントサイズと padding が違う気がする。**

0.6.0 は `--text-x-slot-control-size: max(var(--text-x-md), var(--text-x-ios-floor))`。
🔴 **`max()` は「今どう指されているか」を問えない**ので、**本文 14px の艦でもデスクトップの入力欄が
16px** になり、周囲より大きく見えていた。

⇒ **スロットを2本に割り、条件は部品が持つ**:

```
--text-x-slot-control-size: var(--text-x-md)               通常。艦が自由に上書き
--text-x-slot-control-touch-size: var(--text-x-ios-floor)  タッチ端末のフロア
```

部品: `text-x-slot-control-size pointer-coarse:text-x-slot-control-touch-size`

🔑 **幅ではなくポインタで分ける。** iOS のズームは**タッチ端末の挙動**なので、
**横向きの iPad のような「広いタッチ端末」も拾う**必要がある。

🔴 **艦側では解けなかった**（vault が両方の壁に実際にぶつかって確認）——
`themes/*.css` は `@media` 禁止（AM-9 token-only）／`base.css` は custom property 禁止
（ST-08 element-only）で、**意図的に排他かつ網羅**。かつ**キットは `@layer utilities` で当てるので
`@layer base` は詳細度に関係なく負ける**。⇒ **キットが表現するしかない。**

⚠️ **引き換えに、フロアがスロットになった＝艦が下げられる。** ⇒ README に
**「このスロットは端末の制約であって意匠ではない」**と明記し、**キットの既定が `--text-x-ios-floor`
を指していることをテストで固定**した。

### `@hideyukimori/nene2-ui` 0.6.0（**minor — alert の色・型スケール・Button の高さ**・#338）

vault の波2（PR #391）からの上流3件 ＋ #389 の残り。**全部自艦で再測して確認済み。**

- 🔴 **`Button` の `secondary` だけ 2px 高かった。** 高さは padding 由来で、**border を持つのが
  `secondary` だけ**だったため。⇒ **BASE に `border border-transparent`**。
  vault は**モーダルのフッター7箇所で primary と secondary を横に並べている** ⇒ 段差が出ていた
- 🔴 **`InlineAlert` の `warn` と `danger` が文字列まで完全に同一だった。** `role` は分かれていたが、
  vault の一文が核: **「role の違いは聞こえる人には届くが、見ている人には届かない」**。
  ⇒ **`--color-x-slot-alert-{info,warn,danger}-{bg,fg,border}` を9本追加**。
  **既定は現状のまま**なので、上書きしない艦には何も起きない
- 🔴 **README の規則とキットのテーマが食い違っていた**（**自分の README に反する4件目**）。
  vault が README どおりに検査を実装したところ、**キット本体の `--text-x-slot-field-label-size:
0.75rem` と `--brightness-x-slot-hover: 95%` が落ちた**。
  ⇒ **型スケールを新設**（`--text-x-2xs` … `--text-x-xl` ＋ `--text-x-ios-floor`）し、
  **text スロットをスケール参照へ**。**`brightness` / `opacity` は例外**と README に明記
  （**段を持てる種類の値ではない**）
- **`FormField` の hint / error にスロット**（#389 の残り。サイズと色）

🔴 **`--text-x-ios-floor: 16px` は意匠の段ではない。** iOS Safari の挙動という**物理的な制約**なので
スケール層に置き、スロットから参照する（「スロットはスケール参照だけ」を保ったまま扱うため）。

### `@hideyukimori/nene2-ui` 0.5.0（**minor — 選択系のラベル側とページ送りの2モデル**・#336）

> 🔴 **この版は npm に出ていない。** `main` にはマージされたが publish されないまま 0.6.0 が出た
> （**0.6.0 がこの内容を含む**）。`npm view` に 0.5.0 は無く、タグも無い〔2026-08-23 実測:
> npm の版は 0.2.0 / 0.3.0 / 0.4.0 / 0.6.0〕。
> **版が飛ぶこと自体は問題ない**（上位が含んでいる）。**飛んだことを書かないと、探した人が
> 実態の側を異常だと読む。**

**vault が Tailwind クラスと CSS の両方で測った結果**に基づく（片方だけ見て4回過小を出した反省から、両形式で取ってもらったもの）。

- 🔴 **`Checkbox` / `Radio` のラベル側**にキットが届いていなかった。`className` は `<input>` へ
  渡るので、**`cursor-pointer` と間隔は props でも `className` でも設定できない**。
  ⇒ **キットが持つ**。あわせて入力の寸法（`--spacing-x-slot-choice-box`・既定 1rem = 16px）と
  アクセント色（`--color-x-slot-choice-accent`）をスロットへ。
  **`Radio` にも同じ穴があった**（vault は両者で同じラベル style を共有している）
- 🔴 **`Pagination` が offset ベースを受けられなかった。** vault の3画面とも offset を持ち、
  **page 番号は誰も持っていない**。⇒ `canPrev` / `canNext` / `onPrev` / `onNext` でも使える形に。
  `page` / `pageCount` の側は残す（判別可能な union）

🔑 **`status` を呼び出し側が組み立てる形は変えない。** vault の文言は「**21–40件を表示（全384件）**」＝
**件の範囲**で、**page 番号からは復元できない**（端数ページで崩れる）。
⇒ **page へ寄せると3画面の文言が壊れる。**

**線引きは既存の基準の適用**: `cursor-pointer` と間隔は**意匠でも構造の選択肢でもなく部品の構成要素**（キットが持つ）／ページ送りの2モデルは**有限の選択肢**（props で受けてよい）。

### `@hideyukimori/nene2-ui` 0.4.0（**minor — hover/active ＋ 構造の選択肢**・#332）

🔴 **既存部品の見た目が変わる**（0.3.0 まで**ポインタに何も反応しなかった**）。

- **`hover` / `active`**（`--brightness-x-slot-hover` 95% / `--brightness-x-slot-press` 90%）。
  🔴 **v0.1 の disabled / focus と同じ穴の3つ目**。艦は7艦が持っており、**うち4艦は CSS 側**に
  書いているので Tailwind クラスだけ数えると 0 に見えていた。
  **variant ごとの hover 色は持たない** ── 塗りが3種あるので色を持つとトークンが3倍になる。
  `brightness` なら1本で全部に効き、**白い secondary でも暗くなる**（艦の `brightness-105` は
  白では効かない）。`disabled:` では打ち消す（**押せないものが押した反応を返さない**）
- **`className` を7部品に追加**（`Text` / `Spinner` / `PageHeader` / `EmptyState` /
  `ErrorState` / `LoadingState` / `DetailList`）。🔴 **README の設計原則2「className は合成する」に
  反していた**（受け取りすらしなかった）。艦の `EmptyState` は6艦とも受ける
- **構造の選択肢**: `EmptyState` の `align`（**既定 center** ── 実測で6艦中5艦が中央揃え）／
  `Button` の `size`（`md` / `sm`）と `ghost` variant（vault が持つ）／`InlineAlert` の `warn`

🔑 **原則3 との線引き**: 禁じているのは**意匠値**を props で受けること。
**その prop に「新しい値」を書けるなら意匠（禁止）、有限の選択肢から選ぶだけなら構造（可）。**
`align="start"` はテーマでは供給できず、値でもない。

### `@hideyukimori/nene2-ui` 0.3.0（**minor — 意匠値を2層トークンへ**・#328）

🔴 **既存部品の見た目が変わる**（ラベルの既定値を意図的に変えている・下記）。

**テーマを2層にした**:

| 層             |                                                                          | 艦                    |
| -------------- | ------------------------------------------------------------------------ | --------------------- |
| ① **スケール** | `--spacing-x-3xs` … `--spacing-x-2xl`（9段）・radius・色                 | 🔒 **上書きしない**   |
| ② **スロット** | `--spacing-x-slot-<部品>-<役割>` ほか **35本**。既定は全部スケールを指す | 🟢 **上書きしてよい** |

**部品はスロットしか参照しない。** ⇒ 艦は**割り当てを変えられるが、段を発明できない**
（`--spacing-x-slot-card-pad: var(--spacing-x-lg)` は書けるが `1.375rem` は書けない）。
スロットは**部品ごと**に切ってある（施主裁定 2026-08-23 — **共有は後から寄せられるが、
分けるのは後からだと全艦に影響する**）。

- `FormField` のラベル: `--color-x-slot-field-label` / `--text-x-slot-field-label-size` /
  `--font-weight-x-slot-field-label`。**既定値も変えた** — 0.2.0 は本文サイズ・`text-primary`
  （部品への直書き）、0.3.0 は **0.75rem・`text-muted`・500**。
  理由: 0.2.0 の値は**設計判断ではなく初期実装の残り**で、0.3.0 の値は `nene-vault` の
  `.field-label`（同艦の意匠再生成 #361 で確定）に合わせた。**設計を経た値を既定に置いた。**
- `Input` / `Select` / `Textarea`: `--text-x-slot-control-size`（既定 `max(1rem, 16px)`）。
  **iOS Safari は 16px 未満の入力にフォーカスするとページごと拡大する**
- README に**両方**書いた（🟢 スロットは上書きしてよい／🔒 スケールは上書きしない）。
  **片方だけだと次の艦が反対側で迷う**

🔴 **色とサイズに同じ suffix を使わないこと。** Tailwind は `text-<name>` を `--color-*` から
先に解決するので、`--color-x-slot-field-label` と `--text-x-slot-field-label` を両方定義すると
**サイズが到達不能になる**（コンパイルは通る）。`-size` を付けている理由。テストで固定した。

🔴 **スロットは Tailwind の名前空間の中に置くこと**（`--spacing-x-slot-…`）。
名前空間の外（`--x-slot-…`）に置くと**ユーティリティが1つも生成されない**〔実測〕。

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

> **この節は、npm にまだ存在しないパッケージを出すときに使う。**
>
> ⚠️ **どれが未公開かをここに書かない。** この行はかつて「残る初回はない」と書いており
> `nene2-ui` が加わった時点で偽になり、次に「`nene2-ui` の初回が残っている」と書き直したら
> **その日のうちに publish されてまた偽になった**（2026-08-23・同じ節を1日に2回腐らせた）。
> **取り方**: `npm view @hideyukimori/<pkg> version` が 404 なら未公開。
> ただし ⇒ **404 は認証切れでも出る**（下記②）ので、**先に `npm whoami` を通してから**判定する。

Trusted Publisher は **既存パッケージにしか設定できない**（npm の package settings 画面が
初回 publish 後にしか存在しない）ため、初回はローカルから account 2FA で publish した:

```bash
cd nene2-fleet-tooling
npm whoami                # 🔴 まず認証を確認する（理由は下記②）
npm ci && npm run check   # AM-2 release gate 含む全緑を確認
npm publish --dry-run --workspace packages/<pkg> --provenance=false   # pack 内容の最終確認
npm publish --workspace packages/<pkg> --provenance=false             # 2FA: --otp=<code>
```

確認: `npm view @hideyukimori/<pkg> version`
⚠️ 新規スコープ付きパッケージは**packument（`npm view` が読む方）の反映に少し遅れる**ことがある。
`+ @hideyukimori/<pkg>@<version>` が出ていれば publish は成功しており、
`curl -s https://registry.npmjs.org/@hideyukimori%2F<pkg>/<version>` で即座に確認できる
（`dist.shasum` が publish 出力と一致するかを見る）。

### 🔴 初回で必ず踏む2つ（2026-08-23・`nene2-ui` 0.2.0 で実際に踏んだ）

**① `--provenance=false` はコマンドに入れる。脚注にしない。**

ローカル publish では provenance を生成できない（OIDC 経由のみ）。4パッケージとも
`publishConfig.provenance: true` を持っているので、**初回ローカル publish では必ず**こうなる:

```
npm error code EUSAGE
npm error Automatic provenance generation not supported for provider: null
```

**警告ではなくエラーで、publish は中止される。** 2回目以降は CI（`publish.yml`）経由なので
provenance 付きで出る。

> この回避策は 2026-08-23 まで**脚注にだけ**書かれており、しかも「**警告になる場合がある**」と
> 実体より弱く書かれていた。⇒ **手順書のとおりに打つと必ず失敗する**状態だった。
> 前の3パッケージの初回でも同じ所で止まったはずで、**脚注に書いて本文を直さなかったぶんが
> 今日まで残っていた。**

**② `404 Not Found` が出たら、パッケージ名でも registry でもなく認証を疑う。**

```
npm error 404 Not Found - PUT https://registry.npmjs.org/@hideyukimori%2f<pkg>
```

実際の原因は**認証切れ**だった（`npm whoami` が **E401**。`.npmrc` に `_authToken` は在るが
通っていない）。⇒ **`npm login` で解決する。**

🔑 **npm はスコープ付きパッケージで、権限不足を 404 に隠す** ——「無い」ではなく
「あなたが誰か分からないので教えない」。**エラーメッセージの名乗り（Not Found）が
実体（Unauthorized）とずれている**ので、字面を信じると registry やパッケージ名を疑って時間を使う。
**打つ前に `npm whoami` を通すのが最短。**

## Trusted Publisher 設定（初回 publish 後・パッケージごとに npm 側で1回）

npm の各 package settings（`https://www.npmjs.com/package/@hideyukimori/nene2-tokens` →
Settings → Trusted Publisher）:

| Field                | Value                                              |
| -------------------- | -------------------------------------------------- |
| Publisher            | GitHub Actions                                     |
| Organization or user | `hideyukiMORI`                                     |
| Repository           | `nene2-fleet-tooling`                              |
| Workflow filename    | `publish.yml`                                      |
| **Environment name** | 🔴 **空欄**                                        |
| **Allowed actions**  | 🔴 **`npm publish`（＋ `npm stage publish`）だけ** |

全パッケージで同じ値（Workflow filename は共通 — パッケージ選択は `workflow_dispatch` の input で行う）。

### 🔴 npm の UI にあって、この表に無かった3項目（2026-08-23・`nene2-ui` の設定で実際に詰まった）

**① `Allowed actions` は必須。**「At least one action must be selected」で先へ進めないので、
**知らないと設定が完了しない。**

選ぶのは **publish に相当するものだけ**。`publish.yml` が npm に対して行うのは実測でこれだけ:

```
npm publish --dry-run --workspace packages/<pkg>
npm publish --workspace packages/<pkg>
```

`dist-tag` / `deprecate` / `owner` / `unpublish` は**一切使っていない**ので渡さない。
（2026-08-23 の `nene2-ui` では `npm publish` ＋ `npm stage publish` で設定した。）

**② `Environment name` は空欄。**

`publish.yml` は GitHub Actions の environment を**使っていない**（`environment:` の記述なし）。
ここに名前を入れると**ワークフロー側にも同名の environment 設定が必要**になり、無いと publish が弾かれる。

**③ パッケージ設定の `Publishing access` は「最も制限の強い」方を選ぶ。**

Trusted Publisher とは別に、パッケージ設定に publishing access の選択がある:

| 選択肢                                                               |               |
| -------------------------------------------------------------------- | ------------- |
| **Require two-factor authentication and disallow bypass 2fa tokens** | 🟢 **こちら** |
| Require 2FA **or** a granular access token with bypass 2fa enabled   | ❌            |

**OIDC で打つので bypass トークンの経路が要らない。** このリポの方針も
「**長命 `NPM_TOKEN` は使わない**」。npm 自身の注記も
「trusted publishers ＋ 最も制限の強いトークン設定」を推している。

🔴 **ローカル publish も引き続きできる** — 初回 publish のときのブラウザ認証がまさに 2FA なので、
この設定にしても「初回はローカルから」の手順は通る。

> 🔑 **この3項目は、npm の UI が後から増やしたもの。** 手順書が実物に追いつかず、
> **設定しようとした人がその場で止まる**形になっていた。2026-08-23 だけで同じ形が3件出ている
> （`--provenance=false` が脚注にしかなかった／`404` の実体が認証切れだった／これ）。

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
