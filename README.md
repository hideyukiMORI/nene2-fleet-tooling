# nene2-fleet-tooling

NeNe フリート・フロント統一規約の**配布物（versioned 実行可能物）**を収容するモノレポ。
規約の正本はここの配布パッケージであり、文書（`/home/xi/docker/_work/reports/2026-07-14-frontend-standards/`）は索引・注釈（食い違ったら配布物が正 — 会議 R1⑨）。

## 状態

**W0a 進行中**（due 2026-07-21）。指示書: `_work/handoff-fleet-tooling-w0a-2026-07-14-work-order.md`。
リポ新設 GO = 2026-07-14 hide 裁定。施主判断6点＋承認2点も同日全件クローズ（記録: `_work/handoff-frontend-standards-2026-07-14-decision-request.md`）。

## 構成（予定・W0a 成果物）

| パス | 内容 | 状態 |
|---|---|---|
| `packages/nene2-tokens` | Core Token Contract v1（color 28＋shadow 4）・CONTRACT_TOKENS export・validate:themes・themegen・codemod 写像表 v1 | **v1.0.0-rc.1 実装済**（W0a stage1・凍結レビュー資料 = `docs/contract-freeze-review-2026-07-18.md`・マージ/publish は施主承認後） |
| `packages/nene2-standards` | ESLint flat config 配布（合成規律=ルール単位1定義・plugin 同梱）・Stylelint 2枚組・known-utility lint・`nene2-check`（conformance skeleton・fail-closed）・`init --scan` | 未実装 |
| `packages/nene2-i18n` | 型付き i18n（ja 権威カタログ・parity・同値率検査） | **W0a 骨格 実装済**（型付きカタログ＋parity AM-17 最終形。plural/format/react/vault JSON 形は W0b — パッケージ README 参照） |
| `registries/` | 構造レジストリ（恒久公認差異）＋負債台帳（lint-baseline / legacy-manifest）＋waiver — kind 判別ユニオン jsonc | 未実装 |
| `fleet-baseline.json` | 基盤4パッケージ semver の単一マニフェスト | 未作成（版が確定済みなのは nene2-client ^1.1.0 のみ） |

## 規律

- マージ・npm publish は施主承認後。
- 実装が文書と食い違ったら実装を正とし、文書へ追随 PR（standards patch レーン）。
- 誠実性ガード: 未実装は未実装と書く。空虚合格（fail-open）の検査を出荷しない（G-6）。
