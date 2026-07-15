# @hideyukimori/nene2-tokens

Core Token Contract v1 — NeNe フリートの唯一のセマンティックトークン語彙（color 28＋shadow 4）。
**このパッケージが契約の正本**（規約 03 §0.1 — 散文は索引・注釈）。

**契約は凍結済み**（2026-07-14 hide 承認 — 記録 = リポ `docs/contract-freeze-review-2026-07-18.md` §7・
凍結スナップショット = 同梱 `contract-freeze.json`）。以後のキー集合変更は stop-the-line ADR のみ（AM-2 —
publish は `release-gate` が拒否する）。

## 同梱物

- `CONTRACT_TOKENS`（名前配列＋版）・契約 TS 型（AM-3）
- `validate:themes` CLI — parity／閉文法（TK-04）／予約語・名前パターン（TK-03）／
  `@theme inline` 検出（TH-04）／参照クロージャ（TH-06 W-5／AM-4）／fill 再生成比較（AM-1 F-1）／
  WCAG AA コントラスト（ペア表 v1・focus 3:1）。fail-closed（検査不能=エラー終了）
- `themegen` — 決定性 MUST（bit 同一・prettier 固定点）・`plain/unplain`（`@theme`↔`:root`）・
  `extract → map → generate` 順序固定（未知キー error reject）・`fill`（局所スコープのツール維持）
- codemod 写像表 v1（common＋origin＋vault＋suite 個別表＋是正リスト — versioned）
- **語彙 codemod ランナー**（jscodeshift transform＋CLI — 規約 05 §6.6 T-4 MUST・#15）
- 参照テーマ `themes/reference.css`・active.css 機構サンプル `samples/active.css`

## CLI

```sh
nene2-tokens validate [--container] [--container-selector <sel>] [--parent <brand.css>] <files…>
nene2-tokens fill [--parent <brand.css>] [--check] <files…>
nene2-tokens plain <file> / unplain <file>
nene2-tokens extract [--map common|origin|vault|suite] <file>
nene2-tokens generate [--plain] <doc.json>
nene2-tokens contract / map
nene2-tokens codemod-plan --theme <theme.css> [--map <table>]
nene2-tokens codemod --theme <theme.css> [--map <table>] [--check] [--ext ts,tsx] <paths…>
```

終了コード: 0 = green ／ 1 = 違反 ／ 2 = 検査不能（fail-closed — unknown は green ではない）。

## generate の正準形 — **authored コメントは保存されない**（#18）

`extract → generate` は**正準化**であって整形ではない。出力に現れるのは
**プラグマ・（あれば）components import・宣言だけ**で、それ以外の CSS コメントは
**保存されない**（仕様 — バグではない）。

```css
/* 入力 */
/*
 * このテーマがなぜ存在するか（authored な 5 行ヘッダ）
 */
@theme {
  --color-surface: oklch(1 0 0); /* ページ地 */
}

/* generate 出力 — コメントは消える */
/* @nene2-contract 1.0 @themegen 1.0.0 */
@theme {
  --color-surface: oklch(1 0 0);
}
```

理由（決定性 MUST・R5 AM-1'「同一入力 → bit 同一出力」）:

- `ThemeDocument` はコメント欄を持たない（パイプライン全体でコメントを**モデル化していない**）。
  parser が読むコメントは `@nene2-contract` プラグマと `@nene2-fill` マーカーの 2 つだけで、
  他は捨てる。つまり generate が落としているのではなく、**extract が最初から拾っていない**。
- generate はキーを**正準順に並べ替える**（`canonicalCompare`）。宣言に紐づくコメントは
  並べ替えで宿主を失い、浮いたヘッダコメントには錨が無い。位置を保存する規則を入れると
  「与え順に依存しない」が壊れる。
- 出力中のコメント（プラグマ・fill マーカー）は**生成器の持ち物**であって authored 入力ではない。

**運用**: テーマの存在理由など人間向けの説明は、generate が触らない場所に置く
（`README` ／ 対の `*.components.css` ／ ADR）。**M-1 のレビューで
「codemod の diff だけ」を見たいときは、テーマ移行（`extract → generate`）の
コミットと codemod のコミットを分ける** — コメント削除は語彙 rename ではなく
正準化の diff として別コミットに現れる。

保存が必要になった場合は `ThemeDocument` にコメント欄を足す設計変更が要る（未実施 — #18）。

## 語彙 codemod（T-4）

テーマの**トークン改名**（`--spacing-inline-md → --spacing-x-inline-md`）に対応する
**utility class 改名**（`px-inline-md → px-x-inline-md`）を TSX/TS へ撃つ実行物。
写像判断は一切持たず、正本の写像表（`CODEMOD_MAP_V1` / `mapTokenSet`）から機械導出する。

### W1 移行の順序（**厳守** — 逆順・二度撃ちは壊れる）

```sh
# 0. 何が起きるかを先に見る（M-1 の PR 本文へ貼る: codemod 名・version・写像表 version）
npx nene2-tokens codemod-plan --theme src/shared/ui/theme/themes/default.css --map common

# 1. TSX/TS の class・var(--) 位置を撃つ（★テーマ移行より先。計画はテーマから導出される）
npx nene2-tokens codemod --theme src/shared/ui/theme/themes/default.css --map common src tests

# 2. テーマ本体を移行（versioned CLI — extract→map→generate の順序固定）
npx nene2-tokens extract --map common src/shared/ui/theme/themes/default.css > /tmp/doc.json
npx nene2-tokens generate /tmp/doc.json > src/shared/ui/theme/themes/default.css

# 3. 冪等確認（テーマ移行後は計画が空になり no-op = exit 0）
npx nene2-tokens codemod --check --theme src/shared/ui/theme/themes/default.css --map common src
```

**codemod は 1 回だけ撃つ。** 計画はテーマから導出されるので、テーマを移行する前に 2 回撃つと
`gap-inline-sm → gap-x-inline-sm → gap-x-x-inline-sm` と二重適用される（`gap-x` が Tailwind の
実在ルートである字面衝突 — hideyukiMORI/nene2-fleet-tooling#17）。CLI は該当する再入 rename を
`NOTE` 行で開示する。手順 2 を済ませれば計画は空になり、以後 `--check` は緑で固定される。

### x- の挿入位置は v4 namespace を保存する（map v1.0.2 — #17）

x- は**先頭セグメント直後ではなく v4 namespace の直後（＝キーの先頭）**に入る。

| 旧トークン | v1.0.1 まで | v1.0.2（現在） | v4 での意味 |
|---|---|---|---|
| `--font-weight-medium` | `--font-x-weight-medium` ✗ | `--font-weight-x-medium` ✓ | ✗ は font-**family** のキーに変質していた |
| `--inset-shadow-glow` | `--inset-x-shadow-glow` ✗ | `--inset-shadow-x-glow` ✓ | 同上（multi-segment namespace が割れる） |
| `--spacing-inline-sm` | `--spacing-x-inline-sm` | `--spacing-x-inline-sm`（不変） | single-segment は元から正しい |

実測（tailwindcss 4.3.2 の emit・テストで固定）:
`--font-weight-x-medium → .font-x-medium { font-weight: … }` ／
`--font-x-weight-medium → .font-x-weight-medium { font-family: … }`。

字面衝突（`gap-x`/`space-x`/`inset-x`）は **v1.0.2 でも残る**（`--spacing-*` は single-segment
なので x- の位置は変わらない）。軸ルートのクラスも独立に改名されるため、**移行を完了すれば**
軸の意味論は保たれる（`gap-x-inline-sm → gap-x-x-inline-sm` = column-gap のまま・実測でテスト固定）。

**未対応（#17 に据え置き）**: `--font-size-body` / `--line-height-body` のような
**v4 namespace ではない legacy 綴り**を `--text-x-body` / `--leading-x-body` へ再ホームするかは
語彙判断（namespace を跨ぐ＝機械導出できない）。現状は先頭セグメント直後に x- が入る
（`--font-x-size-body`）。これらは v4 が utility を生成しないので**元から silent no-op**であり、
再ホームは「効いていなかったものを効かせる」意味論変更になる — 施主/評議会の裁定待ち。

### 素の jscodeshift から叩く

```sh
npx jscodeshift -t node_modules/@hideyukimori/nene2-tokens/dist/codemod-transform.js \
  --parser=tsx --theme=src/shared/ui/theme/themes/default.css --map=common src
```

### 出力方式（splice — 施主追認済み 2026-07-15）

AST は書き換えず、jscodeshift で class 文字列の**位置**を特定して原文の該当範囲だけ差し替える
（`toSource()` は使わない）。recast は変更した文字列リテラルを `quote` 設定で刷り直すが、
フリートの prettier は JS 文字列 `'…'`・JSX 属性 `"…"` で**どの quote 設定でも片方が崩れる**ため。
T-4 は engine（jscodeshift）の指定であって recast printer の指定ではない、という整理。

**prettier 固定点について（実測・over-claim しない）**:
splice は引用符・空白・セミコロンに触れないので、prettier の整形判断を動かし得る要因は
「rename で行が **+2 桁伸びる**」ことだけに限られる。

- **payout 実ツリーでは固定点**（実測）: 移行前ツリー（prettier 緑）に codemod を流した
  **41 ファイル・133 置換**の出力に対し、payout の実 `.prettierrc.json`
  （`semi:false`・`singleQuote`・`printWidth:100`）で `prettier --check` が**緑**。
  100 桁超の行は 20 本あるが、**折り返せない class 文字列**なので prettier は動かせない。
- **一般には保証されない**（反例あり・テストで固定）: **折り返せる**行が rename で
  `printWidth` を跨ぐと prettier は再整形したがる（例: 99 桁 → 101 桁の 1 行 JSX は
  括弧で包み直される）。この形が出る repo では codemod 後に pinned prettier を流すこと。
  codemod の diff と prettier の diff は別コミットに分けられるのでレビュー性は保たれる。

契約凍結レビュー: `../../docs/contract-freeze-review-2026-07-18.md`（07-18）。
契約進化は AM-2（minor=派生式同梱・major=codemod 3点セット・移行窓中は stop-the-line ADR のみ）。
