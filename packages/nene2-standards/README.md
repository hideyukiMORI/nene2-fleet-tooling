# @hideyukimori/nene2-standards

NeNe フリート・フロント統一規約の **lint 配布物**（規約 05 §2〜3 の実装正本 — 文書と食い違ったら配布物が正・会議 R1⑨）。

## 製品側の合成形（コピペ正本）

```js
// frontend/eslint.config.js（このファイル以外で lint 設定 MUST NOT — 05 §1.2）
import nene2 from '@hideyukimori/nene2-standards';

export default [
  ...nene2.base,
  ...nene2.fsd,
  ...nene2.api,
  ...nene2.styling,
  ...nene2.i18n,
  ...nene2.testing,
  // 公認差異は registries 登録済みの override のみ合成可（05 §8）
];
```

```js
// frontend/stylelint.config.js
export default { extends: ['@hideyukimori/nene2-standards/stylelint'] };
```

- **plugin 同梱**: 参照する全サードパーティ plugin はこのパッケージが登録する。製品側 `eslint.config.js` での `plugins` 追加 MUST NOT（05 §2.2 冒頭）。
- **raw rule の直書き・後置き override での severity 緩和は gate-integrity FAIL**（会議 R4 AM-11(iii)）。

## 合成規律（このパッケージの内部構造）

ESLint flat config は同一ルールの再指定が**後勝ちで全置換**になる。よって `no-restricted-{syntax,imports,globals}` は
`src/configs/restrictions.ts` で **(ルール, 適用ファイル集合) ごとにちょうど1つの実効定義**へ統合してから配布する
（05 §2.2 冒頭 MUST）。ファイル集合は互いに素・唯一の例外は `src/shared/api/client.ts` の off（A-2/AM-20 の登録済み例外）。
統合定義群は関心別断片のうち `nene2.api` が収容する（意味論の帰属は `src/selectors.ts` / `src/restricted-imports.ts` のコメントが正）。
統合の正しさは**合成済み最終 config への検出プローブ**（`tests/composed-config.probes.test.ts`）が保証する — gate-integrity（severity 照合）では検出できない故障様式のため（05 §2.2）。

## known-utility fast path — severity は起草プレースホルダ（O-5/O-6 の緊張）

`better-tailwindcss/no-unknown-classes` は **`'warn'` の起草時プレースホルダのまま**配布する。これは未決の妥協ではなく規約の設計そのもの:

- **O-5 (MUST)**: severity の正本は `check:tw-oracle`。fast path と oracle の食い違いは**仕様であり常に oracle が正** — fast path を error に引き上げる「修正」は AM-13(iv) の偽陽性洪水を再発させるため MUST NOT。
- **O-6 (MUST)**: 実効 severity は**ファイル単位**で legacy manifest から機械生成する（掲載= off・それ以外= error）。リポ単位の有効化は当該リポの語彙 codemod スタック直後の連続 PR。
- つまり「配布値 warn」→「manifest 生成 override が error/off を上書き」が正規の姿。生成器（O-6 の severity 生成）と `check:tw-oracle` は W0a 後続（conformance / W1 配線)。**error/warn 運用の最終形は批准レビュー送り**（規約 README §8 未解消リスト）。
- O-7: 偽陽性時のリポ側 `eslint-disable` MUST NOT（`eslint-comments/no-restricted-disable` で強制）。是正は 24h の standards patch レーン。

## W0a 実装確定値（「実装が正本」化 — 05 §10.2 の確定送り分）

| 項目 | 確定値 | 備考 |
|---|---|---|
| import 系 plugin | **eslint-plugin-import-x**＋eslint-import-resolver-typescript v4（resolver-next） | rule prefix は `import-x/`（文書の `import/no-restricted-paths` 表記は追随更新） |
| resolver project | `project: ['tsconfig.json']`（lint 実行 cwd 相対） | 実測: project 未指定だと @/ エイリアスが解決されず zones が fail-open |
| known-utility rule-id | `better-tailwindcss/no-unknown-classes`（v4.6.1 実在確認） | `detectComponentClasses: true` 明記（AM-13） |
| custom rule | `nene2/style-prop-css-vars-only` | react/forbid-dom-props は**併用しない**（唯一の許可形を自己誤検知するため custom rule に一本化） |
| eslint-comments | `@eslint-community/eslint-plugin-eslint-comments` を prefix `eslint-comments/` で登録 | O-7 の強制タグ表記と一致 |
| testid 制限 | `no-restricted-syntax` セレクタで実装 | `testing-library/no-test-id-queries` は**実在しない**（v7.6 実確認・05 §2.2.6 は起草時ドラフト） |
| stylelint テーマ override の除外 | extglob `!(*.components).css` | 実測: `!` 否定パターンは配列内で全ファイル match 化（fail-open）— 05 §3.2 起草形は追随更新 |
| JP lint 除外の実装 | 第4部 I18N-16 の有限列挙（`src/shared/i18n/messages/**` のみ JP 免除） | 05 §2.2.5 の `src/shared/i18n/**` 全域免除は I18N-16 確定形に負ける |

## fail-closed（G-6/G-7）

- Stylelint の台帳由来 secondary（`nene2/layer-components-allowlist` の allowedClasses・`nene2/layer-legacy-manifest-only` の files）は**未指定＝空集合＝全 FAIL**。実効値は fleet registries から機械生成した override をゲート導入 PR で合成する（手書き列挙 MUST NOT — AM-10/AM-13(ii)・正本は台帳 G-7）。
- `nene2.overrides.*`（recordsCookieAuth / corpusWidgetSessionToken / vaultJsonCatalog）は現時点で **marker のみ**（緩和対象の A-7 機械検査が未実装のため）。検査実装と同時にこの named config が差し替え座席になる。

## 未実施（誠実性ガード）

- `nene2-check` CLI（conformance / gate-integrity / init --scan）— 後続 PR。
- depcruise 共有 config（05 §4）・prettier/tsconfig/vitest 配布（05 §1.1）— W0a スコープ外（Wave 表の W0a 行に含まれない）。
- `gen:registered-classes`（AM-13(ii)）・O-6 severity 生成器・`check:tw-oracle` — W1 配線。
- 全フリートでの known-utility 偽陽性率は未計測（O-6 のリポ単位有効化手順が吸収装置）。
