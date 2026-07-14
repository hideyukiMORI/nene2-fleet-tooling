/**
 * nene2.overrides — 公認差異の実行可能登録の座席（規約 05 §8・02 §11・会議R1⑨決定）。
 *
 * 登録の正本は registries/*.jsonc（fleet-tooling 中央 — G-7）。ここは各エントリが指す
 * override config の実体。**現時点で緩和・差し替えする配布ルールは存在しない**
 * （A-7 token store の機械検査・vault parity の JSON 形受理は W0a スコープ外 — 未実装）。
 * 検査が実装され次第、この named config が差し替え座席になる（座席が先に固定されていないと
 * 「第2の override 置き場」が発明される — A-2 と同型の理由）。
 *
 * 空の marker config を返す理由: 製品側 eslint.config.js の合成形
 * `...nene2.overrides.recordsCookieAuth` を registries 発効と同時に書ける状態を保つため。
 * gate-integrity は name フィールドで override 適用の有無を照合する。
 */
import type { Linter } from 'eslint';

function marker(name: string): Linter.Config[] {
  return [{ name }];
}

export const overrides = {
  /** nene-records: HttpOnly cookie＋X-Requested-With CSRF（外部制約: トークンを JS に持たせない） */
  recordsCookieAuth: marker('nene2/overrides/records-cookie-auth'),
  /** nene-corpus widget: X-Session-Token（admin JWT と分離 — #340 が正運用 exemplar） */
  corpusWidgetSessionToken: marker('nene2/overrides/corpus-widget-session-token'),
  /** nene-vault: i18n カタログ JSON＋DotPaths（ADR 0005 — parity 検査は JSON 形を受理） */
  vaultJsonCatalog: marker('nene2/overrides/vault-json-catalog'),
} as const;
