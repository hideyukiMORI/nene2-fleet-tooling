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
- codemod 写像表 v1（common＋origin＋vault 個別表＋是正リスト — versioned）
- 参照テーマ `themes/reference.css`・active.css 機構サンプル `samples/active.css`

## CLI

```sh
nene2-tokens validate [--container] [--container-selector <sel>] [--parent <brand.css>] <files…>
nene2-tokens fill [--parent <brand.css>] [--check] <files…>
nene2-tokens plain <file> / unplain <file>
nene2-tokens extract [--map common|origin|vault] <file>
nene2-tokens generate [--plain] <doc.json>
nene2-tokens contract / map
```

終了コード: 0 = green ／ 1 = 違反 ／ 2 = 検査不能（fail-closed — unknown は green ではない）。

契約凍結レビュー: `../../docs/contract-freeze-review-2026-07-18.md`（07-18）。
契約進化は AM-2（minor=派生式同梱・major=codemod 3点セット・移行窓中は stop-the-line ADR のみ）。
