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

### 素の jscodeshift から叩く

```sh
npx jscodeshift -t node_modules/@hideyukimori/nene2-tokens/dist/codemod-transform.js \
  --parser=tsx --theme=src/shared/ui/theme/themes/default.css --map=common src
```

### 出力方式

AST は書き換えず、jscodeshift で class 文字列の**位置**を特定して原文の該当範囲だけ差し替える
（`toSource()` は使わない）。recast は変更した文字列リテラルを `quote` 設定で刷り直すが、
フリートの prettier は JS 文字列 `'…'`・JSX 属性 `"…"` で**どの quote 設定でも片方が崩れる**ため。
この方式なら入力が prettier 固定点なら出力も固定点のまま（repo ごとの prettier 設定に非依存）。

契約凍結レビュー: `../../docs/contract-freeze-review-2026-07-18.md`（07-18）。
契約進化は AM-2（minor=派生式同梱・major=codemod 3点セット・移行窓中は stop-the-line ADR のみ）。
