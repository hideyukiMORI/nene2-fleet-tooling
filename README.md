# nene2-fleet-tooling

NeNe フリート・フロント統一規約の**配布物（versioned 実行可能物）**を収容するモノレポ。
規約の正本はここの配布パッケージであり、文書（`/home/xi/docker/_work/reports/2026-07-14-frontend-standards/`）は索引・注釈（食い違ったら配布物が正 — 会議 R1⑨）。

## 状態

批准4前提のうち **(a) MUST タグ付け・(b) exemplars・(d) は達成済み**。残るのは **(c) 素振りレーン**。
現況の正は `docs/todo/current.md` と `_work/board.txt`（**この README に進捗を書かない** — #55 / #152 の再発防止）。
リポ新設 GO = 2026-07-14 hide 裁定。施主判断6点＋承認2点も同日全件クローズ（記録: `_work/handoff-frontend-standards-2026-07-14-decision-request.md`）。

## 構成（予定・W0a 成果物）

| パス                                   | 内容                                                                                                                                                                                                                | 状態                                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/nene2-tokens`                | Core Token Contract v1（color 28＋shadow 4）・CONTRACT_TOKENS export・validate:themes・themegen・codemod 写像表 v1                                                                                                  | **契約凍結済み**（2026-07-14 hide 承認・§6 全6項目・承認記録 = `docs/contract-freeze-review-2026-07-18.md` §7・以後の契約キー集合変更は stop-the-line ADR のみ=AM-2） |
| `packages/nene2-standards`             | ESLint flat config 配布（合成規律=ルール単位1定義・plugin 同梱）・Stylelint 2枚組・known-utility lint・`nene2-check`（conformance・fail-closed）・`init --scan`                                                     | 出荷中（暫定事項はパッケージ README に明記）                                                                                                                          |
| `packages/nene2-i18n`                  | 型付き i18n（ja 権威カタログ・parity・同値率検査・`./format` / `./react` / `./testing` subpath）                                                                                                                    | 出荷中                                                                                                                                                                |
| `packages/nene2-standards/registries/` | 構造レジストリ（恒久公認差異）＋負債台帳（lint-baseline / legacy-manifest）＋waiver — kind 判別ユニオン jsonc（スキーマ = `src/registries/schema.ts`・配置は 05 §1.1 準拠でパッケージ同梱＝製品は pinned 版で消費） | **v1 発効時点の現物 登録済**（経過措置2件は kind=transition・批准レビュー送り）                                                                                       |
| `fleet-baseline.json`                  | 基盤4パッケージ semver の単一マニフェスト（スキーマ = `docs/fleet-baseline.schema.json`）                                                                                                                           | **ここが版の正本**（floor の意図的な据え置きは `_work/board.txt` に理由つきで記録）                                                                                   |

## 版はここに書かない（#152 — 手書き台帳を1つ減らす）

**各パッケージの版を README に書かない。** #55 で一度是正したのに 13 日で再発し（standards が
**メジャー1つぶん** ずれた状態で放置された）、手書きの版表がある限り再発するため、
**表そのものを落とした**（#152 の提案 (ii)・hub 裁定 2026-07-30）。

版を知りたいときの正本:

| 知りたいこと                         | 見る場所                               |
| ------------------------------------ | -------------------------------------- |
| 公開されている最新版                 | `npm view @hideyukimori/<pkg> version` |
| フリートの floor（消費側が従う下限） | `fleet-baseline.json`                  |
| このツリーのローカル版               | `packages/<pkg>/package.json`          |
| 出荷履歴・publish の手順             | `docs/publish.md`                      |

ローカルと npm がずれているか（= 未 publish の差分があるか）も、上の2つを見比べれば分かる。
**README は「何があるか」だけを書き、「今どの版か」は書かない。**

## リリース（publish）

- publish は `.github/workflows/publish.yml`（nene2-js と同型: OIDC Trusted Publishing・provenance・workflow_dispatch・dry_run 既定 true・パッケージ選択 input）。手順と npm 側の事前設定は `docs/publish.md`。
- **AM-2 release gate**: 契約キー集合が凍結記録（`packages/nene2-tokens/contract-freeze.json`）と一致しない限り publish 拒否（`scripts/am2-release-gate.mjs`・`npm run check` にも組込み・fail-closed）。契約進化は stop-the-line ADR＋codemod 同梱のみ。diff 粒度の changeset 検査は未実装（W1 の fg→text 予行演習で実装 — release-gate.ts 冒頭の TODO 参照）。
- **基盤4パッケージの初回 publish は全て完了**（残る初回なし）。`nene2-i18n` の初回は 2026-07-16 に施主が実行（`private` 解除 = #45・版は施主裁定 = #46・rc を採らない根拠は `67f476c` の semver 実測）。**現在の版は上表のとおり README には書かない**（`npm view` / `fleet-baseline.json` が正）。

## 規律

- マージ・npm publish は施主承認後。
- 実装が文書と食い違ったら実装を正とし、文書へ追随 PR（standards patch レーン）。
- 誠実性ガード: 未実装は未実装と書く。空虚合格（fail-open）の検査を出荷しない（G-6）。
