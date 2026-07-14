# CLAUDE.md — nene2-fleet-tooling

このリポは NeNe フリート・フロント統一規約の**配布物の正本**（tokens / standards / i18n / registries / fleet-baseline）。

## 必読

1. 規約文書: `/home/xi/docker/_work/reports/2026-07-14-frontend-standards/`（README §3 憲法 → 実装対象の章）
2. W0a 指示書: `/home/xi/docker/_work/handoff-fleet-tooling-w0a-2026-07-14-work-order.md`
3. 会議議事録（決定の正本）: 規約 dir の `appendix/council/minutes.md`

## ルール

- **ここの実装が規約の正本**。文書と食い違う場合は実装を直すのではなく、まず議事録の決定と照合し、決定に沿う側へ寄せる（決定にない発明は standards patch レーン＝本リポへの PR で提案）。
- 各章末の「未確定事項」台帳にある値は W0a 実装で確定してよい（「実装が正本」化）。決定済みの値の変更は stop-the-line ADR のみ。
- マージ・npm publish は施主（hide）承認後。conformance / validate は fail-closed（検査不能=unknown・空虚合格禁止）。
- Issue 駆動・1PR=1論点・CI 緑でレビュー依頼。誠実性ガード（実測のみ・未実施は明記）。
