/**
 * no-restricted-syntax のセレクタ群（意味論の正本: 規約 05 §2.2.3〜2.2.6）。
 *
 * 合成規律（05 §2.2 冒頭・2026-07-14 レビュー反映）:
 * ESLint flat config は同一ルールの再指定が「後勝ちで全置換」になるため、
 * これらの断片は configs/restrictions.ts で (ルール, 適用ファイル集合) ごとに
 * ちょうど1つの実効定義へ統合してから配布する。本ファイルは統合の材料であり、
 * ここの配列を製品側 config が直接参照すること MUST NOT。
 */

export interface SyntaxSelector {
  readonly selector: string;
  readonly message: string;
}

/** A-1: 生 fetch 禁止の member 形（会議R3④A-1・05 §2.2.3）。bare `fetch` は no-restricted-globals 側。 */
export const API_FETCH_SYNTAX: readonly SyntaxSelector[] = [
  {
    selector: "MemberExpression[object.name='window'][property.name='fetch']",
    message: 'window.fetch 禁止（A-1）。HTTP は shared/api/client.ts の apiClient 経由のみ。',
  },
  {
    selector: "MemberExpression[object.name='globalThis'][property.name='fetch']",
    message: 'globalThis.fetch 禁止（A-1）。HTTP は shared/api/client.ts の apiClient 経由のみ。',
  },
];

/** 05 §2.2.4 styling の7セレクタ（会議R1⑤・R2⑥・R4 AM-5/AM-8/AM-13・R5議題(3)決定）。 */
export const STYLING_SYNTAX: readonly SyntaxSelector[] = [
  {
    // Tailwind arbitrary value 禁止（9リポの既存 lint の共通化 — 会議R1⑤決定）。
    // arbitrary VARIANT（data-[tone=x]:… 等 = FC-1 blessed idiom）は対象外 MUST —
    // `](?!:)` で「] の後に : が続く」＝ variant 形を除外する（#142）。
    // 残ギャップ: data-[x]:bg-[17px]（variant 直後の arbitrary value）は boundary の制約で漏れる。
    selector: String.raw`JSXAttribute[name.name='className'] Literal[value=/(^|[\s'"!])[\w:-]*\[[^\]]*\](?!:)/]`,
    message:
      'arbitrary value（p-[17px] 等）MUST NOT。値はトークン由来ユーティリティのみ（会議R1⑤決定）。',
  },
  {
    // dark: variant 禁止 — モード差はトークン経由のみ（会議R2⑥決定・records 実害現物）
    selector: String.raw`JSXAttribute[name.name='className'] Literal[value=/(^|\s)dark:/]`,
    message: 'dark: variant MUST NOT。モード差は [data-theme] トークンで表す（会議R2⑥決定）。',
  },
  {
    // 色系クラスの断片補間禁止（会議R4 AM-13(iii)決定 — 実測 0 件＝コスト無料）
    selector: String.raw`TemplateLiteral > TemplateElement[value.cooked=/(^|\s)(text|bg|border)-$/]`,
    message: '色系クラスの文字列補間（text-${x}）MUST NOT。variant map（*_CLASS 定数）を使う。',
  },
  {
    // data-theme 付与はテーマコントローラ1ファイルのみ（会議R2⑥決定）
    selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value='data-theme']",
    message: 'data-theme の JS 付与は登録テーマコントローラのみ（会議R2⑥決定）。',
  },
  {
    // コンポーネント内テーマ分岐禁止（会議R5議題(6) タグ発明で MUST 維持）
    selector: "CallExpression[callee.property.name='getAttribute'][arguments.0.value='data-theme']",
    message: '登録テーマモジュール外での data-theme 読み取り MUST NOT（会議R5決定）。',
  },
  {
    // ランタイム CSS 変数注入は登録注入器ファイルのみ（会議R4 AM-5決定）
    selector: String.raw`CallExpression[callee.property.name='setProperty'][arguments.0.value=/^--/]`,
    message:
      'style.setProperty("--…") は registries 登録済み注入器ファイルのみ（会議R4 AM-5決定）。',
  },
  {
    // ランタイム styleSheet 注入禁止（widget エントリの登録分を除く — 会議R4 AM-8(e)決定）
    selector: "CallExpression[callee.property.name='createElement'][arguments.0.value='style']",
    message: 'ランタイム style 要素注入 MUST NOT（公認差異登録 widget エントリを除く）。',
  },
];

/** 05 §2.2.5 の Intl / lang 系（JP 3ノードは別群 — W0a JP lint PR で追加）。 */
export const I18N_RUNTIME_SYNTAX: readonly SyntaxSelector[] = [
  {
    selector: "CallExpression[callee.property.name='toLocaleString']",
    message: '通貨・日付・数値は @hideyukimori/nene2-i18n/format 経由 MUST（第4部 I18N-13）。',
  },
  {
    selector: "NewExpression[callee.object.name='Intl']",
    message: '同上。Intl 直呼びは nene2-i18n の format 実装内のみ。',
  },
  {
    selector: "AssignmentExpression[left.property.name='lang']",
    message: 'lang 属性の設定は I18nProvider の scope 同期のみ（会議R4 AM-18決定）。',
  },
];

/**
 * テストファイル向けセレクタ（会議R2⑧決定）。
 * getByTestId 系: eslint-plugin-testing-library に `no-test-id-queries` は実在しない
 * （2026-07-14 v7.6 実確認 — 05 §2.2.6 の rule-id は起草時ドラフト）。W0a 確定値として
 * 意味論（testid クエリは registries の testid-allowlist 登録分のみ）を no-restricted-syntax
 * で実装する。allowlist 登録分の解除 override は registries から機械生成（W1 配線）。
 */
export const TESTING_SYNTAX: readonly SyntaxSelector[] = [
  {
    selector:
      "CallExpression[callee.object.name='vi'][callee.property.name='mock'][arguments.0.value=/fetch|client/]",
    message: 'ネットワークは MSW server.use() で差し替える（会議R2⑧決定）。',
  },
  {
    selector:
      'CallExpression[callee.property.name=/^(get|getAll|query|queryAll|find|findAll)ByTestId$/]',
    message:
      'getByTestId は registries の testid-allowlist 登録分のみ（会議R2⑧決定）。getByRole(name付き) > getByLabelText > getByText の優先順位で書く。',
  },
];
