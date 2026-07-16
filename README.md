# nene2-fleet-tooling

NeNe フリート・フロント統一規約の**配布物（versioned 実行可能物）**を収容するモノレポ。
規約の正本はここの配布パッケージであり、文書（`/home/xi/docker/_work/reports/2026-07-14-frontend-standards/`）は索引・注釈（食い違ったら配布物が正 — 会議 R1⑨）。

## 状態

**W0a 進行中**（due 2026-07-21）。指示書: `_work/handoff-fleet-tooling-w0a-2026-07-14-work-order.md`。
リポ新設 GO = 2026-07-14 hide 裁定。施主判断6点＋承認2点も同日全件クローズ（記録: `_work/handoff-frontend-standards-2026-07-14-decision-request.md`）。

## 構成（予定・W0a 成果物）

| パス | 内容 | 状態 |
|---|---|---|
| `packages/nene2-tokens` | Core Token Contract v1（color 28＋shadow 4）・CONTRACT_TOKENS export・validate:themes・themegen・codemod 写像表 v1 | **契約凍結済み（2026-07-14 hide 承認・§6 全6項目・承認記録 = `docs/contract-freeze-review-2026-07-18.md` §7・以後の契約キー集合変更は stop-the-line ADR のみ=AM-2）＋ npm 公開済み 1.0.1**（1.0.0 = 2026-07-14T14:24:27Z / 1.0.1 = 同 18:51:15Z。**ローカルは 1.0.2 で未 publish** — `21ce902` #17/#18 の是正） |
| `packages/nene2-standards` | ESLint flat config 配布（合成規律=ルール単位1定義・plugin 同梱）・Stylelint 2枚組・known-utility lint・`nene2-check`（conformance skeleton・fail-closed）・`init --scan` | **npm 公開済み 1.0.1・ローカル版と一致**（1.0.0 = 2026-07-14T14:24:56Z / 1.0.1 = 同 18:51:18Z。W0a stage2 #2/#8/#9。known-utility warn プレースホルダ等の暫定はパッケージ README 明記のまま） |
| `packages/nene2-i18n` | 型付き i18n（ja 権威カタログ・parity・同値率検査） | **W0a 骨格 実装済・0.1.0 確定・publish 待ち**（`private` 解除済み = #45・版は 2026-07-16 施主裁定 = #46。型付きカタログ＋parity AM-17 最終形。plural/format/react/vault JSON 形は W0b — パッケージ README 参照） |
| `packages/nene2-standards/registries/` | 構造レジストリ（恒久公認差異）＋負債台帳（lint-baseline / legacy-manifest）＋waiver — kind 判別ユニオン jsonc（スキーマ = `src/registries/schema.ts`・配置は 05 §1.1 準拠でパッケージ同梱＝製品は pinned 版で消費） | **v1 発効時点の現物 登録済**（経過措置2件は kind=transition・批准レビュー送り） |
| `fleet-baseline.json` | 基盤4パッケージ semver の単一マニフェスト（スキーマ = `docs/fleet-baseline.schema.json`） | **雛形作成済み**（発効済みは nene2-client ^1.1.0 のみ。tokens/standards/i18n は null=未発効 — 実版数は publish 成功後の別 PR で記入・未公開版を書かない） |

## リリース（publish）

- publish は `.github/workflows/publish.yml`（nene2-js と同型: OIDC Trusted Publishing・provenance・workflow_dispatch・dry_run 既定 true・パッケージ選択 input）。手順と npm 側の事前設定は `docs/publish.md`。
- **AM-2 release gate**: 契約キー集合が凍結記録（`packages/nene2-tokens/contract-freeze.json`）と一致しない限り publish 拒否（`scripts/am2-release-gate.mjs`・`npm run check` にも組込み・fail-closed）。契約進化は stop-the-line ADR＋codemod 同梱のみ。diff 粒度の changeset 検査は未実装（W1 の fg→text 予行演習で実装 — release-gate.ts 冒頭の TODO 参照）。
- `nene2-i18n` は **0.1.0 で publish 待ち**（`private` 解除済み = #45・版は 2026-07-16 施主裁定 = #46。rc を採らない根拠は `67f476c` の semver 実測）。**初回 publish は施主のローカル操作**（Trusted Publisher は既存パッケージにしか設定できないため — `docs/publish.md`）。

## 規律

- マージ・npm publish は施主承認後。
- 実装が文書と食い違ったら実装を正とし、文書へ追随 PR（standards patch レーン）。
- 誠実性ガード: 未実装は未実装と書く。空虚合格（fail-open）の検査を出荷しない（G-6）。
