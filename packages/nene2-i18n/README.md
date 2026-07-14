# @hideyukimori/nene2-i18n

NeNe フリートの型付き i18n。**W0a 時点は骨格**（指示書どおり — フル実装は W0a 必須でない）。

## W0a 骨格に含まれるもの

- **型付きカタログ**: `MessageCatalog` / `MessageKeyOf<T>` / `createTranslator`（{name} 補間のみ・ICU パーサ禁止 — 会議R1⑦「ランタイム最小」）。未知キーの実行時到達は throw（fail-closed）。
- **parity 検査（AM-17 最終形 = R5 AM-17'）**: `expectCatalogParity` / `checkCatalogParity`
  - shape 100%（欠落・余剰とも FAIL）
  - 同値率検査は**全ロケール対**（権威対限定は「en→de/es/fr コピー」に盲目）
  - `maxIdenticalRatio` 既定 20%・`minKeys: 50` の床（床未満は identicalAllowlist の列挙のみで運用）・`identicalAllowlist`
  - **これは lazy copy の検出器であり翻訳品質の証明ではない**（条文明記 — 数値は検出に使い完了判定に使わない）

## 未実装（W0b — 誠実性ガード）

- `plural`（複数形）・`format`（通貨・日付・数値の Intl ラッパ — I18N-13 の「Intl 直呼びはここだけ」の座席）
- `react` subpath（I18nProvider・useTranslation・lang/dir scope 同期 — AM-18）
- `translate` root subpath（非コンポーネント層の解決）
- vault JSON カタログ形＋DotPaths 型生成（公認差異 #3 — parity の JSON 受理）
- identicalAllowlist の registries（identical-allowlist kind）からの機械生成配線
