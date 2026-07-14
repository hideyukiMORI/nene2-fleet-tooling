# seam 仕様 v1 — `recoverAuth`（リカバリ関数＋transport 内 replay ループ）

- 地位: **interface 仕様の正本**（W0a 成果物 — 会議R4 AM-20「interface 仕様は W0a」）。
  **実装は nene2-js 管轄（W2b）** — 本書は仕様の正本化のみを行い、実装コードを含まない。
- 決定の出典: 会議R4 AM-20（seam 仕様の確定と前倒し）・R5 議題(4)（6者 transport.ts 実読での
  v0.2 確定・S1〜S7）・02 §11 / AU-3（invoice 経過措置 — registries `transition:
  invoice-recover-auth-seam`）。本書は**決定の転記**であり、新規裁定を含まない
  （起草判断は §6 に全件列挙）。
- 版: additive 拡張につき破壊変更なしで出せる（版番号は nene2-js 管轄）。
- seam ADR due = W1（07-28）・invoice transport 移行（W2b）は demo ゲート付き。

## 1. interface 定義（正本）

config キーは **`recoverAuth` 1個のみ**（経路除外 config は存在しない — R5 議題(4) REJECTED:
「作られていたら規約違反の発明」）。context は**既存 `AuthFailureContext` を再利用**する
（新規 context 型の発明 MUST NOT — 現物の正本は nene2-js `src/transport.ts`）。

```ts
/**
 * recoverAuth — 認証リカバリ seam（会議R4 AM-20・R5 議題(4)決定）。
 *
 * 返り値:
 * - `string`  = 新しい access token（着床は transport の単独責務 — recover の store 直書き MUST NOT）
 * - `null`    = リカバリ不能（transport は現行の失敗パス: token clear → onUnauthorized）
 * - throw     = `null` と同値（fail-closed）。呼び出し元へは**元の 401 Nene2ClientError** —
 *               recover の例外でエラーの出所をすり替えない
 */
export type RecoverAuth = (context: AuthFailureContext) => Promise<string | null>;

/**
 * 既存 AuthFailureContext の再利用（nene2-js 現物が正本 — ここは仕様が要求する最小面のみ）。
 * 新フィールドの追加は nene2-js の semver 管轄・削除は本 seam の破壊変更。
 */
export interface AuthFailureContext {
  /** 失敗したリクエストの情報（メソッド・パス等 — 現物の形に従う） */
  readonly request: { readonly method: string; readonly path: string };
  /** 401 を受けたときにリクエストへ添付されていた token（未添付なら null） */
  readonly attachedToken: string | null;
}

/** createNene2Transport のオプション拡張（additive — 既存キーの変更なし） */
export interface RecoverAuthTransportOptions {
  /** 唯一の設定キー。経路除外・リトライ回数等の追加 config キーは存在しない */
  readonly recoverAuth?: RecoverAuth;
}
```

## 2. 意味論（MUST 群 — R5 議題(4) の確定転記）

| # | 規範 | 根拠 |
|---|---|---|
| S-1 | **起動条件**: 401 かつ token 添付リクエストのみ。403・`alsoOkStatuses` に 401 が含まれる呼び出しは recover 非通過（現行挙動 transport.ts:225 early return／:240-241 をそのまま写す） | R5(4)・arch/tokens/dx 一致 |
| S-2 | **clear 前に recover**: token clear の**前に** `recoverAuth` を await。非 null なら store 更新（transport が実施）→ replay。null / throw なら現行順序（clear → onUnauthorized） | AM-20 |
| S-3 | **replay は send() 先頭からの再入 MUST・requestInit 再利用 MUST NOT** — 再入すれば新 token 再読（:192）・ヘッダ再構築・fresh timeout signal 鋳造（:213）が1つの機序で揃う。再利用は旧 token ヘッダの再送＝replay の意味が消える | R5(4)・tokens/react S6/dx/arch S2 |
| S-4 | **replay-once**: 同一リクエストの replay は1回のみ。single-flight と replay-once は **transport 側責務**（adapter 側に置くこと MUST NOT） | AM-20・R5 K-8a |
| S-5 | **caller signal**: replay 前に元 caller signal の aborted 検査 MUST。元 caller signal × 新造 timeout の再マージとして仕様化（abort の意思は replay に及ぶ・消費済み signal の再利用不可） | R5(4)・arch S3 |
| S-6 | **token 世代ガード MUST**: 401 受信時に store token ≠ このリクエストに添付した token なら recover を起動せず**現 store token で即 replay**。single-flight の正確な不変条件は「**同一の失敗 token につき recover 1回**」であって「同時に1つ」ではない（無いと正常な新 token を2周目の recover が捨てる） | R5(4)・arch S4 |
| S-7 | **recover throw = null と同値**（fail-closed）。呼び出し元へは元の 401 Nene2ClientError | R5(4)・react S3/tokens/dx |
| S-8 | **recover の store 直書き MUST NOT** — token の着床は transport の単独責務（二重書きは世代ガードを壊す） | R5(4)・arch/react S4 |
| S-9 | **single-flight Promise は settle 後に必ず破棄**（失敗 Promise のキャッシュは全後続を永久失敗させる） | R5(4)・react S5/tokens |
| S-10 | **成功パスの hook 抑制 MUST**: recover 成功＋replay 成功時に clearToken / onUnauthorized 発火 MUST NOT（silent refresh のたびにログイン UI が点滅する）。失敗時のみ現行順序（clear → hook） | R5(4)・arch S1 |
| S-11 | **recover 内の fetch は transport 非経由**（自己再帰禁止）。invoice の `/auth/refresh`・`/auth/logout` 除外は単一クライアント構造由来 — 自己再帰禁止＋token 無し 401 非発火で既にカバーされ、**経路除外 config は死んだ設定キー**になるため作らない | R5(4)・react 1-3 譲れない |
| S-12 | **BodyInit 不変条件**: 公開メソッドが構築する body は**再送可能でなければならない**。現物の閉集合 = `{undefined, string, Blob, FormData}`（jsonBody :299-304／postBytes・postCsv :339-353／upload :379-389 — 6者独立実読の構造的定理）。stream 系を受ける公開メソッドの追加は **recovery 仕様の破壊変更（semver major）**。内部 `body?: BodyInit`（:176）に ReadableStream が来たら**実行時ガードで即 throw** | R5(4)・arch S5＋i18n の縫い目1行 |

### 製品側規約（02 AU-3 の転記 — lint の掛かり先）

- **`recoverAuth` の定義は `client.ts` と同一ファイル内 MUST**。A-1 の生 fetch 例外パスはこの
  1ファイルのみ `[E]`（「recover 用の第2の fetch 許可ファイル」の発明防止 — A-2 の単一
  チョークポイントを2つにしない。nene2-standards の合成 config が client.ts の off で実装済み）。
- invoice の**単純 sessionStorage 置換による機能後退は SHOULD NOT**（R5 タグ監査で格下げ —
  実効は W2b demo ゲート＋field-trials release gate `[C]` が持つ）。access token の置き場自体は
  既決 sessionStorage（A-7）。

## 3. 受け入れテスト仕様（field-trials 12本 — nene2-js の release gate `[C:release]`）

受け入れ基準 = **invoice `client.test.ts` のシナリオ群を nene2-js field-trials へ移植**し
release gate にする（仕様を発明せず現物から抽出 — payout#155 と同じ型）。

### 3.1 invoice client.test.ts からの翻訳移植（6本）

| # | シナリオ | 期待 |
|---|---|---|
| FT-1 | 透過 replay: 401 → recover 成功 → 同一リクエスト再送 → 200 | 呼び出し元は 401 を観測しない・結果は 200 の値 |
| FT-2 | refresh 死亡: recover が null | fail-closed — 元の 401 Nene2ClientError が伝播・token clear → onUnauthorized（現行順序） |
| FT-3 | 起動時復元 | adapter 側関心のまま移植（transport 仕様への追加要求なし） |
| FT-4 | 復元失敗 | 同上 |
| FT-5 | single-flight: 並行 N 本が同一の失敗 token で 401 | recover は1回のみ・全員が同一の新 token で replay |
| FT-6 | revoke | adapter 側関心のまま移植 |

### 3.2 新規（6本 — R5 議題(4) で確定）

| # | シナリオ | 期待 | 出典 |
|---|---|---|---|
| FT-7 | S-10 成功パス: recover 成功＋replay 成功 | clearToken / onUnauthorized **不発火** | arch S1 |
| FT-8 | S-6 世代ずれ 401: 添付 token が旧世代 | recover 起動せず現 store token で即 replay | arch S4 |
| FT-9 | FormData upload の replay | multipart body が再送可能・2回目も同内容（records media/wxr mutations が実消費者） | i18n |
| FT-10 | abort-during-recover: recover 待ち中に caller abort | replay せず AbortError 系で終了（S-5） | i18n |
| FT-11 | postBytes(Blob) の replay | Blob body 再送（Shift_JIS 銀行 CSV 資産の二重読み防止） | dx |
| FT-12 | fresh signal 再鋳造プローブ: 1回目の timeout signal が消費済みでも replay が成功 | S-3 の機序検証（:213） | css |

- FT-3/4/6 は adapter（invoice 側）関心のまま — transport 仕様に混ぜない（R5(4)）。
- 経路除外の**翻訳版**は FT 群に含める: recover 内 fetch の transport 非経由検証（S-11）＋
  資格情報 401（token 無し）の recover 非発火検証（S-1）。

## 4. conformance / release gate への接続

- nene2-js: **field-trials 12本が release gate**（05 §5.2 #21 — 12本 green なしに publish 拒否）。
- invoice: transport 移行（W2b）は seam ADR（due 07-28）＋demo ゲートを前提（AM-23:
  invoice-demo 衝突時は該当行のみ自動後送）。
- registries: `transition: invoice-recover-auth-seam`（kind ラベルは批准レビュー送り）。

## 5. 実装への引き継ぎ（W2b・nene2-js 担当）

- 本書の TS ブロック（§1）は nene2-fleet-tooling の CI で**型検査される**（docs/seam/*.test.ts —
  仕様の腐敗防止）。nene2-js 実装は §1 の型と S-1〜S-12 を満たし、FT-1〜12 を field-trials として
  同梱すること。
- transport.ts の行番号参照（:192 :213 :225 :240-241 :299-304 :339-353 :379-389 :176）は
  R5 議題(4) 時点（2026-07-14）の nene2-js 現物 — 実装時に再実測すること（G-3[P](a)）。

## 6. 起草判断（本書で確定した細部 — 批准レビュー対象）

| # | 判断 | 理由 |
|---|---|---|
| SD-1 | `AuthFailureContext` の最小面を §1 に転記（request.method/path・attachedToken） | 仕様書の自己完結性のため。**現物（nene2-js）が正本** — 食い違いは現物優先で本書を追随 |
| SD-2 | FT の番号付け（FT-1〜12）と 3.1/3.2 の分割 | R5(4) の列挙を検収可能な形に固定しただけ — 内容の追加削除なし |
| SD-3 | 経路除外の翻訳版2本（S-11/S-1 検証）は FT-1〜12 と別枠にせず FT 群の付帯検証とした | R5(4) の「field-trials には除外の翻訳版を置く」の採録 — 本数の水増しをしない |
