# 批准前提の red リスト（2026-07-16 実測 — AI-21・RAT-3(a)(b)）

規約 v1.0-draft の批准機械前提 (a) `check:standards-doc` green / (b) `check:exemplars` green
（README §6・会議 R5 RAT-3）の実測。**red が出るのが正**である — [X] アンカーの植栽と
タグ欠落 MUST の棚卸しは未完であり、是正（タグ付与 / SHOULD 格下げ / アンカー植栽 / rule-id 正準化）は
別 PR・別 wave（植栽は W1 同乗）。**red のまま批准 MUST NOT**（RAT-3）。

## この再生成について（2026-07-14 版を置き換える理由）

前版 `ratification-red-list-2026-07-14.md` は **A-10 に違反した方法で作られていた**ため置き換える。

1. **stale なローカル作業ツリーを測っていた**。当時の `check:exemplars` は `--root` 配下の
   作業ツリーを直接読む実装で、fleet 各リポがどのブランチに居ても、どれだけ origin/main から
   遅れていても、その作業ツリーの事実を「準拠状況」として記録していた（#37 / PR #38 で是正）。
   規約 02 **A-10**（MUST `[P]`）は「準拠状態の主張・監査・実測は origin/main ＋ CI の check 出力を正とし、
   記載には commit SHA を併記する。ローカルワークツリー grep は参考値」と定めている。
2. **commit SHA を併記していなかった**（A-10 の SHA 併記 MUST 未実装）。
3. **記録した規約6文書の sha256 が現物と全件ずれていた**（例: README.md `27aad92b16f83d72` → 現物 `4d9814348d79d1ed`）。
   前版の測定後に規約文書が更新されたため。

### 前版との数値差（差の出所を明示する — 数字だけ動かして黙らない）

| 項目 | 2026-07-14 版 | 本版 | 差の出所 |
|---|---|---|---|
| check:exemplars ユニーク [X] | 13 | **8** | 前版は malformed ショートハンド5件を参照として数えていた。規約側の是正（README §8 ④ でアンカー形式を `nene2-exemplar:` に統一）で解消 |
| check:exemplars resolved | 0 | **4** | **前版の 0 は測定誤り**。当時 origin/main には invoice / origin / vault / records の4本が既に植栽済みだったが、stale なローカル作業ツリーを読んだため見えなかった |
| 不存在 rule-id | 49（missing 47・malformed 2） | **15** | 配布 config 側にルールが追加され実際に解消した分（W0a stage3 以降の PR 群 ＋ **#43 で `nene2/no-double-layer-import` を実装した3件** — 規約が 03:192・468・747 でタグ参照していたのに config に無かった分） |
| [P] 列挙外タグ | 1 | **0** | 規約側で是正済み |
| MUST 総数 / タグ欠落 | 399 / 212 | **408 / 215** | 規約文書自体が加筆された（[X] / API の現状注記の追加等 — 04 §0 の API 表を実体へ寄せた施主裁定分を含む・xi-workspace `320d427`） |

**注意**: resolved 0 → 4 は「4本植えた」のではなく「**元から植わっていたものが見えていなかった**」である。
是正されたのは検査器であって、fleet の実態ではない。

> **本版内での再生成について（#47）**: 本ファイルは初出（fleet-tooling `06904b7` / xi-workspace `f0550ae` 時点）から一度再生成されている。
> 生成器が `check:exemplars` の節に誤った批准前提記号 `RAT-3(a)`（正しくは **(b)**）を吐いていたため（#47）、
> **生成器を直して生成物を作り直した**（手で .md だけ直すと、どのコマンドでも再現できない hybrid になる）。
> 再生成に伴い来歴が現在の HEAD へ更新され、初出時から次の3つが動いている:
> **不存在 rule-id 18 → 15**（#43 が `no-double-layer-import` を実装）／**MUST 総数 407 → 408・タグ欠落 214 → 215**
> （xi-workspace `320d427` の規約 patch で条文が加筆）。**[X] 側（8件中 resolved 4）は不変。**

## 実測の来歴（再現手順）

A-10 の SHA 併記 MUST を **3層すべて**に適用する（前版は (1) のみ・かつ現物とずれていた）。

- 実行日: **2026-07-16**（#47 — 生成器のラベル是正に伴う再生成。前回記録は xi-workspace `f0550ae` 時点）
- コマンド（`--root` 配下の作業ツリーがどの状態でも結果は変わらない — 既定で origin/main を fetch して読む）:
  ```
  nene2-check standards-doc --docs <規約dir>                          # exit 1 = red
  nene2-check exemplars     --docs <規約dir> --root /home/xi/docker   # exit 1 = red
  ```

### (1) 入力 — 規約文書の内容ハッシュ（sha256 先頭16桁）

| ファイル | sha256 |
|---|---|
| `README.md` | `fd8e7b6efbee4ae7` |
| `01-architecture.md` | `30c0048963dbb50f` |
| `02-data-flow.md` | `06ee30d7305d5952` |
| `03-styling-theming.md` | `53d47dd024e90580` |
| `04-i18n.md` | `a6bd9c97ba6952a9` |
| `05-enforcement-migration.md` | `69af15a6520eb5ad` |

### (2) 入力 — 規約文書の出所コミット

| リポ | commit |
|---|---|
| `xi-workspace`（`_work/`） | `311300b0b19fe163c6fe015a7267a914ab69c690` |

規約6文書は上記コミットの `origin/main` と**全件一致**を実測（作業ツリーとの差分なし）。
`04-i18n.md` を最後に更新したのは `492db43`（I18N-6/20/22 の現状注記）。
> **なぜ入力側にも commit を書くか**: 前版の測定時、規約文書は**未コミットの作業ツリー**でも測れてしまった。
> 実際に本版の生成中、`04-i18n.md` が未コミットのまま18行書き換わっている状態を検出して中断し、
> コミット後に測り直している。入力が未コミットだと sha256 は**どのコミットにも存在しない版**を指し、
> 誰も再現できない。これは A-10 の根拠事故と同型である（測定対象が正本か確かめない）。

### (3) 検査対象 — fleet 各リポの commit（A-10 の本体）

| リポ | commit |
|---|---|
| `nene-invoice` | `5f982ed68423819990afbacaaf1e627fb35461f7` |
| `nene-origin` | `0b41874732b9fa3d4aae07a45a1f9ea1c3998dfe` |
| `nene-payout` | `7db4cf4764383fd4caac4ea5345ad997d8248f16` |
| `nene-records` | `437c7e2ce7b5f501aad7a79592025fd19bca53f8` |
| `nene-vault` | `08b21bd97c702d73d04574333e7f10d19de43b3a` |

### (4) 検査器の版

| | |
|---|---|
| `nene2-fleet-tooling` | `29031b0381f132c193ea260dfc826995fed9744e` |
| `@hideyukimori/nene2-standards` | `1.0.1` |

判定単位・skip 規則は実装ヘッダコメントが正本
（`packages/nene2-standards/src/checks/standards-doc.ts` / `exemplars.ts` / `exemplar-source.ts`）。

> **行番号の記録について**: 本リストは規約文書内の出現箇所を `file:line` で記録している。
> AM-15 が `[X:file#anchor]` で行番号を禁じたのは「**コードは codemod でずれるから**」であり、
> 本リストは (1)(2) で**内容ハッシュと commit を固定した snapshot** なので、行番号は当該コミットにおいて一意に再現する。
> 固定していない状態で行番号を書くことが危険なのであって、固定すれば行番号は有効な座標である
> （実例: 本版の生成中、同じ検査を同日に2回回して `04-i18n.md` の parity-test 参照が :408 → :426 に動いた。
> 原因は入力文書の未コミット変更であり、commit を固定した本版では起きない）。

## サマリ（実測）

| 検査 | 判定 | red 内訳 |
|---|---|---|
| check:standards-doc | **red** | タグ欠落 MUST **215**／不存在 rule-id **15**／[P] 列挙外 **0** |
| check:exemplars | **red** | ユニーク [X] 8 件中 **4 失敗**（resolved 4・検査不能 0） |

- MUST 総数 **408**・機械強制カバレッジ率 **46.1%**（タグ付与率 47.3%）— SHOULD 目標 90%+／散文 MUST 上限 60 に対する**観測値**（G-5 補記 — 数値ゲート化 MUST NOT）。
- `check:exemplars` の読み取り源: **origin/main（fetch 済み）**（`authoritative: true`）。参考値（`--worktree` / `--no-fetch`）では green を出さない（G-6）。

### 未解決 [X] の是正レーン（4件 — すべて既に行き先が決まっている）

| 参照 | 状態 | 是正レーン |
|---|---|---|
| payout `use-dashboard.ts#union-page-state` | file-missing | **W1 payout 語彙スタックに同乗**（05 §6.2 [X] 注記 — `hooks/` → `model/` 移設。それまで本リストに載るのが正） |
| payout `locales.test.ts#parity-test` | anchor-missing | **W1 i18n パッケージ移行に同乗**（04 §I18N-20 現状注記 — `@hideyukimori/nene2-i18n` 未 publish・`./testing` サブパス不在で準拠手段が無い） |
| payout `locales.ts#locales-config` | anchor-missing | **W1 i18n パッケージ移行に同乗**（04 §I18N-6 現状注記 — 同上） |
| records `errors.ts#problem-map` | anchor-missing | **records の exemplar 移設 PR**（04 §9 — `map-problem-details.ts` → `shared/api/errors.ts`。**規約側の参照先差し替えを同乗 MUST**。現在 resolved の `map-problem-details.ts` を指す [X] が 02:624/745・04:462・05:307 の4箇所に残っており、移設だけ先行すると resolved が減る） |

> **`check:exemplars` が検査するのは「アンカーの実在」であって「現物が条文どおりか」ではない**
> （実装は `body.includes('[' + anchor + ']')` の単純部分一致 — `exemplars.ts:133`）。
> **アンカーは目印であって検出器ではない。** 「アンカーを植えれば exemplar と条文の乖離が機械検出される」は成り立たない
> （04 §I18N-6/20/22 の現状注記が同じ警告を規約側に置いている）。したがって本リストの resolved 4 件は
> 「ポインタが origin/main に実在する」ことのみを意味し、その現物が条文に準拠しているかは**未検査**である。

---

## check:standards-doc（RAT-1/RAT-2・批准前提 RAT-3(a) — 規約 05 G-4・§5.2 #19）

- 判定: **red**
- 走査ファイル: README.md / 01-architecture.md / 02-data-flow.md / 03-styling-theming.md / 04-i18n.md / 05-enforcement-migration.md
- MUST 総数: **408**（タグ付き 193・タグ欠落 **215**）
- 機械強制カバレッジ率（[E][S][T][G][C][X] / MUST 総数）: **46.1%**（タグ付与率 [P] 込み: 47.3%）
- SHOULD 目標（観測のみ — G-5 補記・ゲート化 MUST NOT）: 機械強制 90%+ / 散文 MUST 上限 60（実測 408 — 上限比 超過）

### タグ欠落 MUST（215 件 — SHOULD 格下げ棚卸しリスト・G-1）

| ファイル | 行 | 条文（先頭 120 字） |
|---|---|---|
| README.md | 7 | - **配布物不在期間の行動規定（W0a=07-21 完了まで）**: generator 前提の条文（§3-2 と §7 の gen:entity / gen:feature / gen:page）と移行 PR は **W0a 完了まで着 |
| README.md | 29 | - **基盤 2**: NENE2（スターター — W0.starter で規約準拠形に書き換え）/ nene2-js（`@hideyukimori/nene2-client` — **ライブラリにつきレイヤ・命名等の章は対象外**。tra |
| README.md | 33 | ## 3. 規約の憲法 — Top-10 MUST（1枚もの） |
| README.md | 125 | **(c) は別ファイルを立てず、red リストの節として同一生成器が吐く MUST。** 理由: (c) は**横断**（6リポへの素振り）であり、`check:exemplars` が既に `--root` で横断実行して A-10 の |
| README.md | 184 | E2E の具体パス（AI-14・dx）／canonical cascade header の綴り（AM-8(a)）／known-utility fast path の error/warn 最終形（O-5/O-6）／registries k |
| README.md | 186 | ### 9.3 会議未扱いの規約空白（どのラウンドでも議題化されず — 規範なし・各セッションでの発明 MUST NOT・必要になったら standards patch レーンか次期会議へ） |
| 01-architecture.md | 15 | RFC2119: MUST / MUST NOT / SHOULD / SHOULD NOT / MAY は RFC2119 の意味で用いる。本章に「なるべく」「適宜」「基本的に」という語は存在しない。 |
| 01-architecture.md | 23 | **規範:** 全製品の `frontend/src/` 直下は次の5ディレクトリ＋エントリファイル `main.tsx` のみで構成する（MUST — 第2節ツリーの `src/main.tsx` が唯一の直下ファイル。第2の直下ファイル |
| 01-architecture.md | 29 | \| `app/` \| エントリ合成・プロバイダ・ルータ定義。ビジネスロジック MUST NOT \| 持たない（セグメント直下） \| |
| 01-architecture.md | 50 | **規範:** import は次の表で許可された方向のみ（MUST）。表にない依存はすべて MUST NOT。 |
| 01-architecture.md | 68 | 明示的禁止依存（すべて MUST NOT）: |
| 01-architecture.md | 99 | **規範:** スライス内（pages / features / entities）のサブディレクトリ名は `ui / model / api / lib / config` の5語のみ（MUST）。`hooks/`・`components |
| 01-architecture.md | 255 | **規範:** 次の表に従う（各行 MUST）。表にないケース（新種のファイル）は第4節の決定木で置き場を決めた後、その置き場の行の規則を適用する。 |
| 01-architecture.md | 271 | \| 型・interface \| PascalCase・`I` プレフィックス MUST NOT \| `Payment` `AppError` \| `IPayment` `paymentType` \| |
| 01-architecture.md | 276 | \| メッセージキー \| 英語セマンティック・ドットパス `domain.area.intent`。日本語キー・連番 MUST NOT（R1⑦） \| `payment.list.empty` \| `msg001` `支払い.一覧` \ |
| 01-architecture.md | 287 | **規範:** 新規ファイルの配置は次の決定木を**上から順に**評価し、最初に該当した行に従う（MUST）。この決定木で決まらない配置は存在しない（決まらない場合は規約の欠陥として issue 化し、`shared/lib/` に仮置きし |
| 01-architecture.md | 356 | - **query 消費形（gen:page の出力）**: `loading \| error \| success` の3値固定。`'empty'` / `'idle'` 等の第4値の発明は MUST NOT — 空状態は succes |
| 01-architecture.md | 357 | - **フォーム・ミューテーション feature（gen:feature の出力）**: 未送信（送信前）状態を持つため3値では表現できない。canonical ユニオン語彙は **gen:feature テンプレートが正本**（W0 で |
| 01-architecture.md | 409 | - 帰結: shared/ui は Provider 不要でレンダー可能であり、その RTL render smoke テストが MUST（R2⑧ — 設計の配当）。 |
| 01-architecture.md | 434 | **規範:** feature / page 専用 UI を `shared/ui` に昇格する条件と手続きは次のとおり（MUST）: |
| 01-architecture.md | 483 | - 全ルート定義は `app/router.tsx` の1ファイルに置く（MUST — ルート表の分散 MUST NOT）。1 ルート ↔ 1 page スライス。 |
| 01-architecture.md | 485 | - named export（1-4）と `React.lazy` の橋渡しは次の1形に固定（MUST）: |
| 01-architecture.md | 499 | - URL パスは kebab-case（MUST）。スライス名の導出は次の2形に固定（MUST）: **パラメータ無しルート**はパスの最終セグメント＝スライス名（`/dashboard` ↔ `pages/dashboard/`）。** |
| 01-architecture.md | 500 | 【根拠: R1①の具体化（起草者）。旧稿の「パスとスライス名の一致 MUST」は自らの例示（record-detail ↔ /records/:recordId）と矛盾し、パラメータ付きルートのスライス名導出が非決定だったため、導出規則の形 |
| 01-architecture.md | 501 | - ルートガード（認証）は app 層（router.tsx / providers.tsx）で行い、page 内での redirect 分岐は MUST NOT。401 時は useSyncExternalStore の auth sto |
| 01-architecture.md | 503 | - pages の lazy 境界には **smoke render テスト SHOULD**（MUST に張れる強制タグがないため⑨メタ規約により SHOULD 止め — R2⑧決定。entity=遷移テスト MUST・feature=遷 |
| 01-architecture.md | 507 | **規範:** ルータ層での render-as-you-fetch（loader 等）は現行規約では**採用しない**。データ取得は container hook（5-1）に一元化する（MUST）。`useSuspenseQuery` 解 |
| 01-architecture.md | 525 | - 差異登録の理由は**外部制約由来のみ**（「規律が高いから」は不可）。無期限の差異登録 MUST NOT（waiver は `until` ≤90日・中央レジストリ管理 — R5）。【根拠: R1⑨⑩・R5 waiver 条項】 |
| 01-architecture.md | 529 | **規範:** 公認差異が変えてよいのは次の3箇所**のみ**（MUST）。レイヤ構造・セグメント語彙・命名・コンポーネント設計・ルーティング規約に差異は**及ばない**（MUST — D-1/D-2 リポも第1〜6節に全面準拠する）: |
| 01-architecture.md | 550 | **規範:** `<html>` を所有しない埋め込み widget 製品は、次の3点を**同一のマウントルート要素**に束ねて公認差異登録する（MUST）: |
| 01-architecture.md | 555 | concierge widget は**匿名 transport**（token store なし）で第2波スコープ（R3④A-8）。invoice の silent refresh は sessionStorage への単純置換 MUST |
| 01-architecture.md | 560 | - serve / suite / profile の手書き CSS 規律は**公認差異ではない**（例外の無期限登録 MUST NOT — 二段階移行 W1/W6）。【根拠: R1⑤⑩ DECIDED・[REJECTED]「規律が高いから |
| 01-architecture.md | 569 | \| U-1 \| E2E ディレクトリの具体パス（`frontend/e2e/` か `frontend/tests/e2e/`） \| 未確定（frontend 内・1箇所固定 MUST までは決定） \| W0・dx（AI-14） \ |
| 01-architecture.md | 570 | \| U-2 \| canonical cascade header（theme/index.css）のバイト列の綴り \| 未確定（構成要素と固定・バイト同値検査 MUST までは決定） \| W0・dx（AM-8(a)） \| |
| 01-architecture.md | 576 | \| U-8 \| フォーム・ミューテーション feature の canonical ユニオン語彙（未送信状態の表現・status 値の集合）と非フォーム feature の UI ファイル名（`ui/<Name>Form.tsx` 以外 |
| 02-data-flow.md | 41 | - **DF-2 (MUST)** 逆流の禁止: server state を client state（useState / Context / module store）へコピーして保持すること MUST NOT（§5 ST-2）。 |
| 02-data-flow.md | 47 | ### A-1 HTTP 境界は createNene2Transport ただ1つ (MUST) |
| 02-data-flow.md | 49 | 生 `fetch()` / `XMLHttpRequest` / axios / ky 等の HTTP クライアント導入は MUST NOT。 |
| 02-data-flow.md | 65 | ### A-2 adapter は `frontend/src/shared/api/client.ts` の1ファイルのみ (MUST) |
| 02-data-flow.md | 71 | - 「独自メソッドの新設 MUST NOT」は **`apiClient` の公開メソッド表面**への規範であり、`createNene2Transport` へ渡す**生成オプション**（`onUnauthorized` 等 — tran |
| 02-data-flow.md | 123 | ### A-3 基盤パッケージの版は fleet-baseline.json が正本 (MUST) |
| 02-data-flow.md | 127 | - 規約文書・散文への版番号直書き MUST NOT（コピペドリフト）【会議R3④A-3・REJECTED 表】。本章にも版番号は書かない。 |
| 02-data-flow.md | 128 | - check スクリプトの各リポコピー MUST NOT（`nene2-standards` から実行）。 |
| 02-data-flow.md | 129 | - per-PR CI での npm registry 照会 MUST NOT（hermeticity — 鮮度は中央 rollup のみが算出）【会議R4 AM-12】。 |
| 02-data-flow.md | 136 | ### A-4 / A-5 「依存はあるが未使用」「生成したが未接続」を落とす (MUST) |
| 02-data-flow.md | 161 | ### A-9 導入手順は結果非依存形式 (MUST / 複製禁止は SHOULD) |
| 02-data-flow.md | 163 | - 導入・移行手順の正本は `nene2-js/docs-site/howto/migrate-product-client.md` を**ポインタ参照** MUST。手順: install → `client.ts` を exemplar |
| 02-data-flow.md | 164 | - 手順書の複製はドリフト源につき **SHOULD NOT**（R5 タグ監査で MUST から格下げ確定 — ドリフト検出器が未実装のため）【会議R5 議題(6)】。 |
| 02-data-flow.md | 175 | ### AU-1 token store は `createSessionTokenStore` の1形 (MUST) |
| 02-data-flow.md | 180 | - X-Authorization ミラー・401 での token 自動クリアは transport 内蔵機能であり、**自前ミラー・自前 401 処理の再実装 MUST NOT**（移行手順で削除する — §2 A-9）【会議R3④A- |
| 02-data-flow.md | 203 | 差異登録の理由は**外部制約由来のみ**（「規律が高いから」は不可）・無期限登録 MUST NOT【会議R1⑨】。 |
| 02-data-flow.md | 211 | - recover 関数から token store への直書き MUST NOT（着床は transport の単独責務）【会議R5 議題(4)】。 |
| 02-data-flow.md | 215 | ### AU-4 認証状態（client state 側）は useSyncExternalStore module store (MUST) |
| 02-data-flow.md | 220 | store 本体と hook は**同一の `model.ts` 内**に置く（vault exemplar の現物形 — store を別ファイル（`store-instance.ts` 等）へ分離すること MUST NOT。①章の en |
| 02-data-flow.md | 240 | - **transport 側**: `onUnauthorized` 等の hook（transport 既載【会議R4 記録の訂正3】）を渡せるのは、A-2 の帰結として **`client.ts` の `createNene2Tran |
| 02-data-flow.md | 249 | ### TY-1 パイプラインの固定 (MUST) |
| 02-data-flow.md | 312 | ### ST-1 server state は TanStack Query v5 ただ1つ (MUST) |
| 02-data-flow.md | 317 | ### ST-2 server state の useState コピー MUST NOT |
| 02-data-flow.md | 413 | ### ST-6 QueryClient は app 層の1箇所 (MUST) |
| 02-data-flow.md | 421 | ### CS-1 外部 client state ライブラリ導入 MUST NOT |
| 02-data-flow.md | 425 | ### CS-2 アプリグローバル状態は useSyncExternalStore の module store (MUST) |
| 02-data-flow.md | 448 | ### CS-3 Context の使用限界 (MUST NOT) |
| 02-data-flow.md | 450 | Context は**低頻度・DI 的な値**（QueryClient・I18nProvider・テーマコントローラ等の注入）に限定する。高頻度更新の値を単一の巨大 Context に入れること MUST NOT【会議R1③。根拠: Con |
| 02-data-flow.md | 464 | ### FM-1 RHF + zodResolver ただ1つ (MUST) |
| 02-data-flow.md | 468 | ### FM-2 zod schema は model セグメント・`z.infer` が型の単一ソース (MUST) |
| 02-data-flow.md | 515 | ### FM-5 submit は「values → mapper → mutation」 (MUST) |
| 02-data-flow.md | 525 | canonical form は payout `use-dashboard.ts` 型（実読確認済み）。**status 語彙は次の3値に固定**し、第4ステータス（`'empty'` / `'idle'` 等）の発明は MUST NOT |
| 02-data-flow.md | 550 | - **UI-2 (MUST)** `error` 状態には `retry: () => void` を必ず同梱する（View がリカバリ手段を発明しない）【会議R1②】。 |
| 02-data-flow.md | 585 | ### UI-5 AsyncBoundary 系は「消費部品」 (MUST NOT の向き) |
| 02-data-flow.md | 587 | AsyncBoundary / AsyncStates / ErrorState / EmptyState 系の共有部品は**ユニオン型を消費する View 部品**として使う。バウンダリを状態の出所にする実装（部品内部で fetch・部品 |
| 02-data-flow.md | 589 | ### UI-6 非 Suspense 既定・useSuspenseQuery MUST NOT |
| 02-data-flow.md | 595 | UI-1 の3値ユニオンは **query 読み取り側**の規範であり、mutation（FM-5 の submit）の非同期状態には適用しない — submit 用の第4ステータスをユニオンへ足すことも、submit 状態の独自 stat |
| 02-data-flow.md | 616 | ### ER-1 transport / nene2-client はユーザ提示文字列を一切持たない (MUST) |
| 02-data-flow.md | 620 | ### ER-2 AppError → ユーザ文言は `shared/api/errors.ts` の写像1表のみ (MUST) |
| 02-data-flow.md | 666 | ### ER-3 サーバ由来 title / detail の UI 直接表示 MUST NOT |
| 02-data-flow.md | 678 | ### ER-4 `window.alert` / `window.confirm` MUST NOT |
| 02-data-flow.md | 682 | ### ER-5 401 の標準フロー (MUST 経路・実装は exemplar) |
| 02-data-flow.md | 699 | \| records cookie+CSRF \| 公認差異（外部制約: トークンを JS に持たせない設計） \| AU-2。override 実行可能登録 \| 無期限登録 MUST NOT の適用除外ではない — レジストリで管理【会 |
| 02-data-flow.md | 731 | \| CS-3 \| 高頻度巨大 Context 禁止 \| MUST NOT \| （タグ未確定 — RAT-1 棚卸し対象。現行はレビュー） \| R1③ \| |
| 02-data-flow.md | 741 | \| UI-5 \| バウンダリを状態の出所にしない \| MUST NOT \| （タグ未確定 — RAT-1 棚卸し対象） \| R1② \| |
| 02-data-flow.md | 767 | 10. query hook の返り値型注釈 `UseQueryResult<UiModel, AppError>` の明示を MUST 化（§5 ST-3）。 |
| 02-data-flow.md | 769 | 12. container hook の所属レイヤを features 固定（pages の container hook MUST NOT — §8 UI-1）。 |
| 03-styling-theming.md | 13 | 2. 全 MUST / MUST NOT に強制タグを付す。タグの書けない MUST は SHOULD に格下げしてある【根拠: R1⑨メタ規約】。 |
| 03-styling-theming.md | 32 | ### ST-01 唯一の方式（MUST） |
| 03-styling-theming.md | 63 | ### ST-02 禁止方式の列挙（MUST NOT） |
| 03-styling-theming.md | 79 | ### ST-03 インライン style（MUST NOT ＋ 唯一の例外） |
| 03-styling-theming.md | 85 | - 注入できるカスタムプロパティは**登録台帳（allowlist）列挙**で縛る（数の上限方式は REJECTED）【根拠: R1⑤】。台帳は **TH-08 のランタイム・トークン注入と同一の1台帳**（`registries/*.js |
| 03-styling-theming.md | 104 | - 照合は **selector 完全一致の列挙**（`.data-table` 系の前方一致は MUST NOT — `.data-table-foo-custom` の発明で所属を僭称できる）【根拠: AM-10】。照合単位は「ルール（ |
| 03-styling-theming.md | 106 | - 独立の「共有 CSS 500行上限 MUST」は**存在しない**（R5 で削除）。500 は init --scan の**助言的閾値**（warning・群昇格レビューのトリガー）である【根拠: AM-25'】。 |
| 03-styling-theming.md | 128 | ### ST-05 ディレクトリ構造（MUST） |
| 03-styling-theming.md | 154 | ### ST-06 index.css — canonical cascade header（MUST） |
| 03-styling-theming.md | 260 | ### ST-08 base.css — `@layer base` の唯一の家（element-only 閉文法・MUST） |
| 03-styling-theming.md | 316 | ### TK-01 3層の NeNe における対応（MUST） |
| 03-styling-theming.md | 354 | ### TK-03 命名の禁止事項（MUST NOT） |
| 03-styling-theming.md | 364 | ### TK-04 値の閉文法（MUST） |
| 03-styling-theming.md | 436 | ### TH-02 active.css（MUST） |
| 03-styling-theming.md | 463 | ### TH-03 テーマファイルの文法（MUST） |
| 03-styling-theming.md | 541 | ### TH-04 配線（MUST / MUST NOT）— R2 の主戦場の決着 |
| 03-styling-theming.md | 543 | - 配線は **「`@theme` 直値 ＋ テーマスコープ要素での `[data-theme]` 同名上書き」** MUST【根拠: R2⑥(A)決定 — 6ペーパー独立のミニ再現（tailwindcss 4.x `compile()`  |
| 03-styling-theming.md | 546 | - index.css の `theme(static)` は ST-06 のとおり MUST。 |
| 03-styling-theming.md | 559 | ### TH-05 テーマスコープ要素と局所スコープ（MUST / 登録制） |
| 03-styling-theming.md | 562 | - 埋め込み widget 製品（corpus / concierge — `<html>` を所有しない）はマウントルート要素を**公認差異登録 MUST**【根拠: R2⑥(A)】。 |
| 03-styling-theming.md | 572 | ### TH-06 局所スコープの検査と fill（MUST） |
| 03-styling-theming.md | 578 | ### TH-07 validate:themes と受け入れゲート（MUST） |
| 03-styling-theming.md | 593 | - **注入先は派生トークンの宣言要素と同一要素 MUST**（TK-05 の破れの法則を JS 注入にも同一文で適用 — 機序が1つなら条文も1つ）。 |
| 03-styling-theming.md | 599 | ### DM-01 `dark:` variant の禁止（MUST NOT） |
| 03-styling-theming.md | 611 | ### DM-02 実装（MUST） |
| 03-styling-theming.md | 617 | ### DM-03 FOUC 対策（MUST） |
| 03-styling-theming.md | 713 | ## 7. 強制レイヤ総覧（この章の MUST を誰が守らせるか） |
| 03-styling-theming.md | 722 | \| `check:tw-oracle`（**per-PR CI ブロッカー**） \| silent no-op の検出 \| 候補抽出は `@tailwindcss/oxide` Scanner MUST・判定は `candidates |
| 03-styling-theming.md | 737 | 差異登録の理由は**外部制約由来のみ**（「規律が高いから」は不可）・無期限登録 MUST NOT【根拠: R1⑤⑨】。 |
| 03-styling-theming.md | 754 | 6. 拡張トークンのテーマ間宣言一致の静的検査を validate:themes に載せるかは W0 実装課題（現状の強制は oracle の active テーマ検査のみ。強制タグが張れないため TK-06 は SHOULD 止め — 載 |
| 04-i18n.md | 5 | - RFC 2119: MUST / MUST NOT / SHOULD / SHOULD NOT / MAY は RFC 2119 の意味で用いる。曖昧語は使わない。 |
| 04-i18n.md | 34 | `i18next` / `react-i18next` / `react-intl`・`@formatjs/*` / `@lingui/*` / `@inlang/paraglide-js` / `intl-messageformat` そ |
| 04-i18n.md | 45 | i18n ランタイム（translate / plural / format / parity ヘルパ / React 統合）は `@hideyukimori/nene2-i18n` ただ 1 つから import する（MUST）。sem |
| 04-i18n.md | 64 | - React コンポーネント / フック内では `useTranslation()` が返す `t` **のみ**を使う（MUST）。形は `t(key)` / `t(key, params)` — `params` は `{{place |
| 04-i18n.md | 81 | nene2-i18n 採用後、製品リポ内に `translate` / plural 選択 / フォーマッタ / Provider の**独自実装を残置・新設してはならない**（MUST NOT）。既存の自作ランタイム（例: payout  |
| 04-i18n.md | 83 | - ランタイムは 100 行以内に保つ（SHOULD — R5 批准準備で MUST から格下げ。意図の実体は「ICU パーサ導入 MUST NOT」が既に担保）。 |
| 04-i18n.md | 84 | - ICU MessageFormat 文法のパーサ・エバリュエータの実装 MUST NOT [R1⑦]。カタログ値の中に ICU 構文（`{count, plural, …}`）を書くことも MUST NOT（§5）。 |
| 04-i18n.md | 92 | i18n に関して製品リポが持ってよいファイルは次の**有限列挙のみ**（MUST）。列挙外のファイルが `shared/i18n/` に存在すれば conformance red（fail-closed — AM-11）。 |
| 04-i18n.md | 106 | - slice barrel `index.ts` の公開面は次の**列挙のみ**（MUST — 追加 export は境界契約の無断拡張）: |
| 04-i18n.md | 117 | - ロケールごとの遅延ロード・名前空間分割 MUST NOT（SaaS 単体規模で過剰 — リサーチ §2。カタログは静的 import の 1 ファイル/ロケール）。 |
| 04-i18n.md | 126 | - 形式は TypeScript（`.ts`）。JSON カタログ MUST NOT — 例外は vault（バックエンドと JSON 共有・ADR 0005・`DotPaths` 型生成）で、**公認差異として実行可能登録済み**（`.. |
| 04-i18n.md | 127 | - キーはトップレベルのフラットな文字列キー（`'common.actions.save'`）。**ネストしたオブジェクト構造 MUST NOT**（`{ common: { actions: … } }` は不可 — 14 製品の現物多数 |
| 04-i18n.md | 150 | - `DEFAULT_LOCALE = 'ja'` MUST（権威＝フォールバック先。変更 MUST NOT）。 |
| 04-i18n.md | 152 | - **初期ロケール解決と永続化は package の責務**であり、`locales.ts`（その他製品コード）に `resolveLocale` を実装すること MUST NOT — 保存値の読み取りが I18N-24 の「製品側からの |
| 04-i18n.md | 153 | - **ハイフンを含むロケールタグ**（records の pt-BR / zh-Hans — §0）: `SUPPORTED_LOCALES` の値と catalogs マップのキーは **BCP 47 タグ文字列そのまま**（`'pt- |
| 04-i18n.md | 174 | > **本節の exemplar 3件は現物が条文に未準拠であり、準拠は W1 の i18n パッケージ移行に同乗させる。それまで `check:exemplars` の red リスト（RAT-3(a)(b)・AI-21 — 当該リストは |
| 04-i18n.md | 202 | - `SUPPORTED_LOCALES` への掲載は **parity 検査（I18N-20/21）100% 通過が条件**（MUST）。 |
| 04-i18n.md | 203 | - 通過しないロケールは**カタログファイルごと削除する**（MUST）。「キーだけ揃ったスタブ」「一部訳出」の恒久化 MUST NOT。 |
| 04-i18n.md | 218 | - 権威カタログは ja **のみ**。en を権威とする実装 MUST NOT。裁定根拠: 権威カタログ＝施主が正誤判定できる唯一のカタログ（en 権威では日本語訳の質を機械も施主もゲートできない）。en 支持の提出は R1 で 0 [R |
| 04-i18n.md | 247 | - 英語セマンティック・ドットパス **`domain.area.intent`**。全キーは次の正規表現に適合する（MUST）: |
| 04-i18n.md | 256 | - MUST NOT: 日本語キー（`'保存': …`）・連番キー（`msg1`, `label2`）・値をキーにする source-as-keys（Lingui 方式 — ドリフトの温床 [R1⑦・リサーチ §2]）・kebab-case |
| 04-i18n.md | 257 | - **vault の既存キーの扱い**（起草時実測: 384 キー中 256 が snake_case または `_meta.*` — 66.7%）: vaultJsonCatalog 公認差異（I18N-5 — 登録範囲は JSON 形 |
| 04-i18n.md | 273 | - プレースホルダは `{{lowerCamelCase}}` のみ。`{param}`（一重括弧）・`%s`・`${…}` MUST NOT。parity ヘルパが値文字列を走査し、一重括弧プレースホルダ・不正なパラメータ名で fail  |
| 04-i18n.md | 274 | - 同一キーのプレースホルダ集合は**全ロケールで一致** MUST（`{{name}}` が ja にあって en にない、は parity fail）。 |
| 04-i18n.md | 290 | - 複数形が要るメッセージは **CLDR カテゴリ接尾辞つきのキー族**で書く（MUST）: `<base>.other`（全ロケール必須）＋当該ロケールの CLDR カテゴリが要求する分だけ `.one` / `.few` / `.ma |
| 04-i18n.md | 319 | - 通貨・日付・数値・日時のユーザ提示文字列は `@hideyukimori/nene2-i18n/format` の関数**のみ**で生成する（MUST）。 |
| 04-i18n.md | 349 | 次の**列挙**に該当する文字列は必ず `t(MessageKey)`（または plural/format）経由とする（MUST）: |
| 04-i18n.md | 359 | 適用範囲は **`src/**` 全域**（除外の有限列挙は I18N-16）。features/pages 限定の適用 MUST NOT — 限定 lint の穴が field の `aria-label="閉じる"` 直書き 5 箇所（ |
| 04-i18n.md | 362 | - **機械強制の実効範囲の明記**（誠実性 — AM-19 の故障様式）: 本 MUST を機械強制するのは**日本語文字列の検出（I18N-16）**と**スターター/新規リポ限定の言語非依存 lint（I18N-19 — SHOULD |
| 04-i18n.md | 388 | - **検出プローブ（正例・負例）同梱 MUST**（AM-16 運営則: lint の昇格には検出プローブ添付・自己テストをパッケージテストに同梱）。プローブ 6 本 [AI-19]: |
| 04-i18n.md | 399 | - **lint 除外（ignore）の有限列挙**（この列挙以外の除外 MUST NOT — リポ側追加は gate-integrity FAIL [AM-11(iii)]）: `**/*.test.*` / `**/*.stories. |
| 04-i18n.md | 411 | - shared/ui コンポーネントへの表示文字列（aria-label 含む）内蔵 MUST NOT。ユーザ知覚文字列は required prop（例 `closeLabel: string`・デフォルト値 MUST NOT）で受け、 |
| 04-i18n.md | 432 | - スターターは UI 文字列の `t()` 化＋ja/en カタログ同梱を W0 完了条件に含める（MUST）。現物: スターターは英語ハードコード（`TagList.tsx` ほか）— JP 正規表現では構造的に検知不能 [AM-19] |
| 04-i18n.md | 433 | - **スターター・新規リポ限定**で、言語非依存のユーザ知覚文字列 literal 禁止 lint を有効化する（SHOULD — 既存リポへは偽陽性コスト未実測につき MUST を張らない: ⑨メタ規約の自己適用 [AM-19]）。 |
| 04-i18n.md | 439 | 検出は 4 層で行う。どれか 1 層に頼る実装 MUST NOT（各層が別の故障様式を塞ぐ）。 |
| 04-i18n.md | 443 | `locales.test.ts` は次の 1 呼び出しを含む（MUST — `gen` が吐く定型）: |
| 04-i18n.md | 465 | - **全ロケール対**で同一値のキーの比率を検査し、`maxIdenticalRatio`（v1 規定値 **20%**）超過で fail（MUST）。権威対限定 MUST NOT（「en の値を de/fr にコピー」経路に盲目 [R5 |
| 04-i18n.md | 470 | ### I18N-22: 沈黙フォールバック MUST NOT — DEV は可視化・本番のみ権威へ — [R1⑦] |
| 04-i18n.md | 472 | - DEV ビルド: 現在ロケールのカタログにキーが解決できない場合、`∅` ＋キー名を**そのまま描画**し（`∅invoice.list.empty`）、`console.error` を 1 キーにつき 1 回発火する（MUST）。 |
| 04-i18n.md | 473 | - 本番ビルド: 権威カタログ（ja）へフォールバックする（MUST — ユーザに `∅` を見せない唯一の場所）。 |
| 04-i18n.md | 524 | - アプリのルートに `@hideyukimori/nene2-i18n/react` の `I18nProvider` を 1 つ置く（MUST）。 |
| 04-i18n.md | 525 | - Provider は **scope 要素**に `lang` と `dir` を同期する（内蔵機能 — 手書き同期 MUST NOT）。既定 scope は `document.documentElement`（変更 MUST NOT |
| 04-i18n.md | 526 | - **widget 製品**（corpus / concierge — `<html>` を所有しない）は、⑥のテーマスコープと**同一の要素**を公認差異登録し、lang/dir をそこに設定する（MUST）。現物の実害: corpus |
| 04-i18n.md | 544 | - 現在ロケールはアプリグローバル状態（auth / theme / **locale** / toast — R1③の列挙）であり、nene2-i18n/react の `localeStore`（`useSyncExternalStor |
| 04-i18n.md | 545 | - 永続化は package が行う（v1 仕様: `localStorage` キー `nene2-locale` — ⑥章 DM-03 のテーマ保存キー `nene2-theme` と同一の命名規則。製品側からの直接読み書き MUST  |
| 04-i18n.md | 546 | - **初期ロケール解決も package の責務**（v1 仕様）: `I18nProvider` / `localeStore` が `保存値（nene2-locale）→ navigator.languages（SUPPORTED_L |
| 04-i18n.md | 550 | - CSS 論理プロパティ（`margin-inline-start` 等）による RTL 耐性は SHOULD（MUST に張れる強制タグがないため — [R1⑦]）。`dir` は I18N-23 が scope 要素に設定する。 |
| 04-i18n.md | 557 | - コンポーネント/フックのテストは `renderWithI18n(ui, { locale: 'ja' })`（generator が吐く）でロケールを **ja に固定**する（MUST）。ロケール未固定の文字列 expect MUS |
| 04-i18n.md | 558 | - 期待値は **ja カタログ値の直書き可**（MAY）— ja が権威カタログである以上、直書き期待値がカタログの実質検査になる [R3⑧裁定]。テストコードを `t()` 経由に強制すること MUST NOT（R3 REJECTED） |
| 04-i18n.md | 581 | 移行 DoD ベクトルに i18n キーを含める（styling 単独 DoD MUST NOT — [R3⑩]）。キー名の正本は W0 の conformance skeleton（dx 管轄）。v1 提案: |
| 04-i18n.md | 596 | - 1 PR = 1 リポ × 1 軸（P-3）。i18n 是正と transport 置換・token rename の同一 PR 混載 MUST NOT。 |
| 04-i18n.md | 597 | - vault の **key-grammar baseline**（I18N-10 — 256 キーの rename はバックエンド composer locales と同時変更のクロススタック）は vault の work order  |
| 04-i18n.md | 606 | 差異登録の理由は**外部制約由来のみ**・無期限登録 MUST NOT [R1⑨]。 |
| 05-enforcement-migration.md | 14 | - **G-1 (MUST)** 全ての MUST / MUST NOT には強制タグを付す: |
| 05-enforcement-migration.md | 16 | **タグの書けない MUST は SHOULD に格下げ**し「強制手段の追加」を issue 化する（会議R1⑨決定）。 |
| 05-enforcement-migration.md | 20 | - **G-5 (MUST)** 数値ゲートの新設 MUST NOT（カバレッジ%・箇所数上限）。縛りは常に**列挙**で行う。列挙エントリに付随する上限データ（`maxLines` 等）は可（会議R2⑧・R3⑩・R5 AM-25' 決定） |
| 05-enforcement-migration.md | 21 | - **G-5 補記（SHOULD 目標 — ゲートではない）**: 機械強制カバレッジ率 **90%+**・散文 MUST 総数 **上限60**・規約文書 300行以内は SHOULD 目標として**観測する**（G-4 の check |
| 05-enforcement-migration.md | 22 | - **G-6 (MUST)** 検査器は fail-closed: 検査が実行できない・対象が見つからない状態は green ではなく **unknown**。green は「検査が走り正の証拠を得た」場合のみ（会議R4 AM-11決定） |
| 05-enforcement-migration.md | 23 | - **G-7 (MUST)** 検査器への入力のうち被検査者（製品リポ）が書けるものを正としない。台帳・baseline・waiver・hash の正本は fleet-tooling 側（会議R5 運営則2決定）。 |
| 05-enforcement-migration.md | 56 | - **D-1 (MUST)** 製品16リポのモノレポ統合 MUST NOT（会議R1⑨決定）。fleet-tooling は devDep ツール群であり非該当（会議R4 AM-24決定）。 |
| 05-enforcement-migration.md | 59 | - **D-4 (MUST)** NENE2 スターターの規約準拠化（theme 一式・transport `client.ts`・gen 3種・playwright smoke・i18n カタログ）は規約制定と同時 = W0.starte |
| 05-enforcement-migration.md | 60 | - **D-5 (MUST NOT)** Biome への全面移行は GritQL での zones 等再現性 PoC 前 MUST NOT（会議R1⑨決定 — ESLint 11リポ資産が正）。 |
| 05-enforcement-migration.md | 83 | 根拠: 製品側 config は合成形 MUST（会議R1⑨決定）。ファイル名・置き場を固定するのは決定性のため（パス無指定だと LLM は「動く場所」に置く — 会議R3④A-2 の concierge 前例）。 |
| 05-enforcement-migration.md | 120 | 根拠: 合成形 MUST・差異は override 実行可能登録（会議R1⑨決定）。緩和検出は gate-integrity（会議R4 AM-11(iii)決定）。 |
| 05-enforcement-migration.md | 126 | **合成安全性（W0a 実装への MUST — 2026-07-14 レビュー反映）**: ESLint flat config は同一ルールをオプション付きで再指定すると**後勝ちで全置換**される（オプションはマージされない — ESL |
| 05-enforcement-migration.md | 128 | - 配布実装は、オプションを持つルール（`no-restricted-imports` / `no-restricted-syntax` / `no-restricted-globals` 等）について、**合成後に「(ルール, 適用ファイ |
| 05-enforcement-migration.md | 129 | - 適用除外は **ignores / 互いに素なファイル分割で表現 MUST**。後置きオブジェクトでの `'ルール名': 'off'` による除外 MUST NOT（同一ルールの他 selector 群まで消える — §2.2.5 参照 |
| 05-enforcement-migration.md | 131 | - 配布 config は参照する全サードパーティ plugin（import 系 resolver・react・better-tailwindcss・eslint-comments・jsx-a11y・testing-library）の登録 |
| 05-enforcement-migration.md | 211 | 根拠: 会議R1①決定（FSD 5層・5セグメント・集約バレル MUST NOT・import 形固定）。出典: https://github.com/javierbrea/eslint-plugin-boundaries （代替手段の存在 |
| 05-enforcement-migration.md | 695 | - 7既決工程の相対順序 `type-check → eslint → stylelint → format:check → test → knip → build` は MUST（会議R2⑧決定・現状5リポ5通りの実測が根拠）。oracl |
| 05-enforcement-migration.md | 714 | vitest 環境の機械決定（会議R2⑧決定 — グローバル jsdom MUST NOT・origin 是正対象）: |
| 05-enforcement-migration.md | 726 | - RTL＋MSW＋`frontend/tests/{factories, msw, render, setup}`＋`@tests` エイリアスは **NENE2 スターター同梱 MUST**（会議R2⑧決定 — exemplar はフリ |
| 05-enforcement-migration.md | 727 | - `@tests/render` = `renderWithI18n` / `renderHookWithProviders`（QueryClientProvider＋I18nProvider のラッパ・`{ locale }` オプショ |
| 05-enforcement-migration.md | 729 | - `@tests` エイリアスの解決は共有 vitest config＋tsconfig base の1組で定義（製品側での再定義 MUST NOT）。ディレクトリ内の実体・綴りは W0.starter で確定（G-4: 生成物が正本。起 |
| 05-enforcement-migration.md | 762 | - **O-1 (MUST)** 候補抽出は `@tailwindcss/oxide` Scanner。自作 regex MUST NOT（dx 実測: regex は 593/8,030 しか拾えない = fail-open）。 |
| 05-enforcement-migration.md | 763 | - **O-2 (MUST)** 判定の正本 API は `candidatesToCss`（候補単位で CSS or null）。**出力 CSS への substring/regex 照合 MUST NOT**（偽陽性実証済み）。`__ |
| 05-enforcement-migration.md | 764 | - **O-3 (MUST)** 入力はアプリ実 entry（loadStylesheet 込み）。AM-8(a) の canonical cascade header 検査と entry パスを共有。 |
| 05-enforcement-migration.md | 765 | - **O-4 (MUST)** block 対象 = silent 集合 ∩ className 位置（JSX className／登録 variant map の値）∩ **色系文法**。scanner sources から `shar |
| 05-enforcement-migration.md | 766 | - **O-5 (MUST)** extractor は ESLint fast path と同一モジュール。**severity の食い違いは仕様であり常に oracle が正** — fast path を error に引き上げる「修 |
| 05-enforcement-migration.md | 767 | - **O-6 (MUST)** severity はファイル単位: legacy manifest 掲載 = off・それ以外 = error（flat config が manifest から機械生成）。リポ単位の有効化は当該リポの語彙 |
| 05-enforcement-migration.md | 776 | - **GEN-2 (MUST)** generator template の変更は fleet-tooling PR のみ（テンプレは versioned 実行可能物の一部）。 |
| 05-enforcement-migration.md | 974 | - `src/pages/<name>/ui/<Name>Page.tsx` ＋ `index.ts` を生成し、router 登録は **lazy import MUST**（会議R1①決定）: |
| 05-enforcement-migration.md | 992 | \| `themegen extract` \| 既存 CSS からトークン抽出。**extract→map（契約写像表適用）→generate の順序固定**・未知キーは error で reject（silent drop MUST N |
| 05-enforcement-migration.md | 999 | - **T-2 (MUST)** validate:themes の FAIL メッセージは修復コマンド（`npx nene2-tokens fill` 等）を含む。修復手段のないエラーは LLM に手書き補完＝非決定をさせる（会議R4 A |
| 05-enforcement-migration.md | 1003 | - **T-3 (MUST)** 許可リスト・legacy manifest の初期値は `init --scan` の走査出力から生成（人間の記憶力で列挙値を決めない — 会議R4 AM-10決定・invoice 209クラスが事故現物） |
| 05-enforcement-migration.md | 1004 | - **T-4 (MUST)** 語彙 codemod は jscodeshift・nene2-tokens に versioned 同梱。使い捨てスクリプト化 MUST NOT（写像ドリフト = リポごとに違う契約へ移行する最悪の非決定  |
| 05-enforcement-migration.md | 1028 | - **CF-2 (MUST)** キー状態は判別ユニオン: `green / red / unknown / frozen(baseline残 n件) / waived(until, reason-ref)`。boolean MUST N |
| 05-enforcement-migration.md | 1029 | - **CF-3 (MUST)** DoD ベクトルは styling / i18n / a11y / api の全ゲートを含む — styling 単独 DoD は名目完了を量産する（会議R3⑩M-3決定）。 |
| 05-enforcement-migration.md | 1030 | - **CF-4 (MUST)** 自己申告メタデータ収載: `{standardsVersion, tokensVersion, i18nVersion, clientVersion, contractVersion, manifestS |
| 05-enforcement-migration.md | 1076 | - 実行場所は `_work/tools/`（配布チャネルの外）。リポ CI は hermetic を保つ（per-PR npm registry 照会 MUST NOT — 会議R4 AM-12決定・6者完全一致）。 |
| 05-enforcement-migration.md | 1078 | - 集約は明示の全順序の worst-of: `red > unknown > frozen > waived > stale-green > green`・網羅 switch・default 節 MUST NOT・内訳数併記（`green |
| 05-enforcement-migration.md | 1089 | - **REG-2 (MUST)** 追加経路は fleet-tooling リポの PR のみ。製品リポ側追記は gate-integrity FAIL（会議R5 AM-25'決定）。 |
| 05-enforcement-migration.md | 1090 | - **REG-3 (MUST)** 2クラス政策: **負債台帳**（legacy-manifest / lint-baseline）= 縮小単調（追加・変更 FAIL・削除のみ可）／**構造レジストリ**（それ以外）= 中央 PR＋re |
| 05-enforcement-migration.md | 1091 | - **REG-4 (MUST)** 要件は kind で分かれる（掛かり先の分離 — 2026-07-14 レビュー反映: 一文で全登録制に掛けると §8.1 の deal waiver（施主判断待ち＝内部理由）が自ら反例になり登録不能） |
| 05-enforcement-migration.md | 1164 | \| **W3** \| 二重解消: **profile / clear / contact**（wave 内順序は「安全網の濃さ×ブロッカー不在」で自由 — 非規範）＋contact 三分割（(a)契約トークン→themes/ (b)許可 |
| 05-enforcement-migration.md | 1197 | 1. 契約 v1 の破壊変更は semver major＋codemod 同梱 MUST（＋AM-2 の3点セット・data-migration 成果物）。 |
| 05-enforcement-migration.md | 1224 | - **構造ゲートの未移行軸**: 非FSD リポ（clear/corpus/concierge）の depcruise（unknown-layer・セグメント語彙）・check:required-files（entity 必須ファイル）は |
| 05-enforcement-migration.md | 1225 | - **waiver は段階導入の器ではない**: 移行途中の恒常 red を waiver（`until` ≤90日 — REG-4(b)）で逃がす運用 MUST NOT — 期限で縛る waiver を移行負債に使うと ≤90日制約と衝 |
| 05-enforcement-migration.md | 1235 | \| D-a \| 相対 import は**同一スライス内のみ**・スライス跨ぎ相対 MUST NOT（第1部 1-4 と同一規範。lint は `../../*` 禁止で近似・精密化は W0a） \| 会議は import 形の一意化を |
| 05-enforcement-migration.md | 1238 | \| D-d \| authorized-divergence（恒久差異）と waiver（≤90日）の2階建て \| R1⑨「無期限の差異登録 MUST NOT」と「公認差異は蒸し返さない」の整合解釈: 恒久差異は reason-ref＋ |
| 05-enforcement-migration.md | 1239 | \| D-e \| default export 方針は**第1部 1-4 に従う**（named export のみ MUST・default export MUST NOT。lazy 消費の橋渡しは第1部 6-2 の1形 — 本書 §6 |
| 05-enforcement-migration.md | 1253 | - **既知のタグ欠落 MUST**（D-1 モノレポ統合 MUST NOT・D-4 W0.starter 同時・GEN-2 テンプレ変更経路 等）: `check:standards-doc` の**初回 red リスト（AI-21・RA |
| 05-enforcement-migration.md | 1255 | - gate-integrity の `calculateConfigForFile()` 方式: dx が**実測未実施と明示** — W0a で実測後に MUST タグ（「タグの前に計測」）。 |

### 不存在 rule-id（15 件 — RAT-2 実在照合 FAIL）

| ファイル | 行 | タグ | 照合キー | 状態 |
|---|---|---|---|---|
| README.md | 42 | `[E:@typescript-eslint/switch-exhaustiveness-check（未配布——配布 config 未設定の空隙。型網羅は同条の T タグで担保・追加は W0b standards patch）]` | `@typescript-eslint/switch-exhaustiveness-check` | missing |
| 01-architecture.md | 130 | `[E:import-x/no-default-export（未配布——プラグインには存在するが配布 config で未有効化。W0b 追加候補・実装追随まで red のまま）]` | `import-x/no-default-export` | missing |
| 01-architecture.md | 256 | `[E:unicorn/filename-case（未配布——eslint-plugin-unicorn は配布 config 未導入。ファイル名規約は現状 [G]` | `unicorn/filename-case` | missing |
| 01-architecture.md | 455 | `[E:AM-13(iii)]` | `AM-13` | missing |
| 01-architecture.md | 524 | `[E:overrides]` | `overrides` | missing |
| 02-data-flow.md | 63 | `[E:例外パスは client.ts の1つ]` | `例外パスは client.ts の1つ` | missing |
| 02-data-flow.md | 177 | `[E:client.ts 以外からの nene2-client import 禁止に包含]` | `client.ts 以外からの nene2-client import 禁止に包含` | missing |
| 02-data-flow.md | 184 | `[E:overrides]` | `overrides` | missing |
| 02-data-flow.md | 551 | `[E:@typescript-eslint/switch-exhaustiveness-check（未配布——配布 config 未設定の空隙・型網羅は隣接の T タグで担保。追加は W0b standards patch）]` | `@typescript-eslint/switch-exhaustiveness-check` | missing |
| 02-data-flow.md | 711 | `[E:部分検出＋レビュー]` | `部分検出＋レビュー` | missing |
| 02-data-flow.md | 720 | `[E:overrides]` | `overrides` | missing |
| 02-data-flow.md | 721 | `[E:recoverAuth 例外パス]` | `recoverAuth 例外パス` | missing |
| 02-data-flow.md | 739 | `[E:@typescript-eslint/switch-exhaustiveness-check（未配布——配布 config 未設定の空隙）]` | `@typescript-eslint/switch-exhaustiveness-check` | missing |
| 04-i18n.md | 347 | `[E:I18N-19 言語非依存 lint（未配布——スターター/新規リポ限定・SHOULD 水準・既存リポは偽陽性コスト未実測につき未展開。AM-19）]` | `I18N-19 言語非依存 lint` | missing |
| 04-i18n.md | 551 | `[E:jsx-a11y strict preset]` | `jsx-a11y strict preset` | missing |

### [P] 列挙外タグ（0 件 — G-3）

なし

補足: rule-id 照合 ok 91 件（うち prefix 補完解決 19 件）・構文プレースホルダのスキップ 7 件。[X:file#anchor] は 8 参照を check:exemplars へ委譲（G-2）。
---

## check:exemplars（AM-15・批准前提 RAT-3(b) — 規約 05 G-2・§5.2 #18）

- 判定: **red**
- fleet ルート: /home/xi/docker
- 読み取り源: **origin/main（fetch 済み）**
- ユニーク [X] 参照: **8**（resolved 4 / 失敗 **4** / 検査不能 0・placeholder スキップ 3）

### 検査対象リポの来歴（A-10 — commit SHA 併記 MUST `[P]`）

| repo | commit SHA | 検査可否 |
|---|---|---|
| nene-invoice | 5f982ed68423819990afbacaaf1e627fb35461f7 | ok |
| nene-origin | 0b41874732b9fa3d4aae07a45a1f9ea1c3998dfe | ok |
| nene-payout | 7db4cf4764383fd4caac4ea5345ad997d8248f16 | ok |
| nene-records | 437c7e2ce7b5f501aad7a79592025fd19bca53f8 | ok |
| nene-vault | 08b21bd97c702d73d04574333e7f10d19de43b3a | ok |

### 未解決 [X]（4 件）

| 参照 | 状態 | 詳細 | 出現箇所 |
|---|---|---|---|
| `[X:nene-payout/frontend/src/features/view-dashboard/model/use-dashboard.ts#nene2-exemplar:union-page-state]` | file-missing | 参照先ファイルが存在しない: nene-payout/frontend/src/features/view-dashboard/model/use-dashboard.ts（origin/main（fetch 済み）） | 05-enforcement-migration.md:914 |
| `[X:nene-payout/frontend/src/shared/i18n/locales.test.ts#nene2-exemplar:parity-test]` | anchor-missing | アンカーコメント `[nene2-exemplar:parity-test]` が nene-payout/frontend/src/shared/i18n/locales.test.ts に未植栽（origin/main（fetch 済み）） | 04-i18n.md:441 |
| `[X:nene-payout/frontend/src/shared/i18n/locales.ts#nene2-exemplar:locales-config]` | anchor-missing | アンカーコメント `[nene2-exemplar:locales-config]` が nene-payout/frontend/src/shared/i18n/locales.ts に未植栽（origin/main（fetch 済み）） | 04-i18n.md:148 |
| `[X:nene-records/frontend/src/shared/api/errors.ts#nene2-exemplar:problem-map]` | anchor-missing | アンカーコメント `[nene2-exemplar:problem-map]` が nene-records/frontend/src/shared/api/errors.ts に未植栽（origin/main（fetch 済み）） | 04-i18n.md:496 |

### 解決済み [X]（4 件）

- `[X:nene-invoice/frontend/src/shared/ui/theme/active.css#nene2-exemplar:active-theme-pointer]`
- `[X:nene-origin/frontend/src/shared/api/client.ts#nene2-exemplar:api-client]`
- `[X:nene-records/frontend/src/shared/i18n/map-problem-details.ts#nene2-exemplar:problem-map]`
- `[X:nene-vault/frontend/src/entities/auth/model.ts#nene2-exemplar:auth-store]`
