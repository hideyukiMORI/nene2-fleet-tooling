/**
 * check:standards-doc のテスト（RAT-1/RAT-2・AI-21 — 規約 05 G-1〜G-5・§5.2 #19）。
 * 故意 fail（タグ欠落 MUST・不存在 rule-id・[P] 列挙外）が red を出すことを含めて検証する。
 */
import { describe, expect, it } from 'vitest';

import { composedConfig } from '../src/index.js';
import {
  auditStandardsDoc,
  enforcedEslintRuleIds,
  enforcedStylelintRuleIds,
  normalizeRuleId,
} from '../src/checks/standards-doc.js';
import stylelintConfig from '../src/stylelint/index.js';

const ids = {
  eslintRuleIds: new Set([
    'no-restricted-syntax',
    'import-x/no-restricted-paths',
    'nene2/style-prop-css-vars-only',
  ]),
  stylelintRuleIds: new Set(['color-no-hex', 'nene2/themes-token-only']),
};

function audit(content: string, options = ids) {
  return auditStandardsDoc([{ path: 'doc.md', content }], options);
}

/**
 * #61 の較正プローブ（AM-16「lint の昇格には検出プローブ〔正例・負例〕添付 MUST —
 * ルールの存在確認と機能確認は別物」）。
 *
 * 較正前の検出器は「行に MUST の語があるか」だけを見ており、規約文書の実物で
 * **機械強制済みの A-1 をタグ欠落2件として計上していた**（02-data-flow.md:47/:49 実測）。
 * 過検出も AM-16 が名指しした穴（records noHardcodedJapanese の素通し）の裏返しである。
 *
 * 負例＝「red にしてはいけない形」。正例＝「red にしなければいけない形」。
 * **空虚合格の負例**（兄弟 bullet へタグが伝染しないこと）も同時に固定する — G-6。
 */
describe('auditStandardsDoc — #61 較正プローブ（規範ブロック判定）', () => {
  it('負例1: タグが次行にある規範ブロックは強制済み＝red にしない（現物 = 02-data-flow.md A-1）', () => {
    const r = audit(
      '生 `fetch()` / axios 等の HTTP クライアント導入は MUST NOT。\n' +
        '`[E:no-restricted-syntax]`【会議R3④A-1】\n',
    );
    expect(r.untaggedMusts).toHaveLength(0);
    expect(r.state).toBe('green');
    expect(r.mustTagged).toBe(1);
  });

  it('負例2: 見出しの MUST は監査対象外（規範の名前であって本体ではない）＋件数は報告する', () => {
    const r = audit('### A-1 HTTP 境界は createNene2Transport ただ1つ (MUST)\n');
    expect(r.untaggedMusts).toHaveLength(0);
    expect(r.headingMustsSkipped).toBe(1);
    // MUST 行が 1 本も無い＝入力が規約文書でない可能性 → fail-closed で unknown（G-6）。
    expect(r.state).toBe('unknown');
  });

  it('負例3: 空行を挟んだ別段落のタグは効かない（ブロックを跨いで伝染させない）', () => {
    const r = audit('`[E:no-restricted-syntax]` を配布する。\n\n生 fetch は MUST NOT。\n');
    expect(r.untaggedMusts).toHaveLength(1);
    expect(r.untaggedMusts[0]).toMatchObject({ line: 3 });
  });

  it('🔴 空虚合格の負例: 兄弟 bullet はタグを共有しない（G-6 — 較正が fail-open を作らないこと）', () => {
    const r = audit('- 規則A は MUST NOT。`[E:no-restricted-syntax]`\n- 規則B は MUST NOT。\n');
    expect(r.untaggedMusts).toHaveLength(1);
    expect(r.untaggedMusts[0]).toMatchObject({ line: 2 });
    expect(r.state).toBe('red');
  });

  it('🔴 空虚合格の負例: 表の行はタグを共有しない', () => {
    const r = audit(
      '| `app/` | ロジック MUST NOT | `[E:no-restricted-syntax]` |\n' +
        '| `pages/` | 直 import MUST NOT | — |\n',
    );
    expect(r.untaggedMusts).toHaveLength(1);
    expect(r.untaggedMusts[0]).toMatchObject({ line: 2 });
  });

  it('正例: 継続行にもタグが無い規範ブロックは red のまま（較正が検出力を落としていない）', () => {
    const r = audit('生 fetch は MUST NOT。\n理由は hermeticity である。\n');
    expect(r.state).toBe('red');
    expect(r.untaggedMusts).toHaveLength(1);
  });

  it('🔴 回帰: 見出しを MUST 監査から外しても rule-id 実在照合（RAT-2）は生きる（軸が独立していること）', () => {
    // 較正の初版は heading で continue しており、見出しに付いた [E:rule-id] の照合が消えていた
    // （規約文書の実測で不存在 rule-id が 15 → 14 に減って発覚）。
    const r = audit(
      '### A-9 何か (MUST) `[E:no-such-rule-does-not-exist]`\n生 fetch は MUST NOT。\n',
    );
    expect(r.headingMustsSkipped).toBe(1);
    expect(r.ruleIdFailures).toHaveLength(1);
    expect(r.ruleIdFailures[0]).toMatchObject({ candidate: 'no-such-rule-does-not-exist' });
    expect(r.state).toBe('red');
  });

  it('正例: fence 内の MUST は従来どおり対象外（条文の引用であって規範の定義ではない）', () => {
    const r = audit('```ts\n// これは MUST NOT の例\n```\n生 fetch は MUST NOT。\n');
    expect(r.mustTotal).toBe(1);
    expect(r.untaggedMusts).toHaveLength(1);
    expect(r.untaggedMusts[0]).toMatchObject({ line: 4 });
  });
});

describe('auditStandardsDoc — (i) タグ欠落 MUST の検出', () => {
  it('故意 fail: タグの無い MUST 行を red で列挙する', () => {
    const r = audit('- **A-1 (MUST)** 生 fetch 禁止。\n');
    expect(r.state).toBe('red');
    expect(r.untaggedMusts).toHaveLength(1);
    expect(r.untaggedMusts[0]).toMatchObject({ file: 'doc.md', line: 1 });
  });

  it('MUST NOT も MUST として数える', () => {
    const r = audit('直書き MUST NOT。\n');
    expect(r.mustTotal).toBe(1);
    expect(r.untaggedMusts).toHaveLength(1);
  });

  it('強制タグ（bare 含む）付き MUST は red にしない', () => {
    const r = audit(
      '- **A-1 (MUST)** 生 fetch 禁止 `[E:no-restricted-syntax]`\n- **A-2 (MUST)** 型で担保 [T]\n',
    );
    expect(r.untaggedMusts).toHaveLength(0);
    expect(r.mustTagged).toBe(2);
    expect(r.state).toBe('green');
  });

  it('[P] のみの MUST はタグ付きだが機械強制には数えない', () => {
    const r = audit('- 準拠判定は origin/main＋SHA 併記 MUST [P:process]\n');
    expect(r.untaggedMusts).toHaveLength(0);
    expect(r.mustTagged).toBe(1);
    expect(r.mustMachineTagged).toBe(0);
    expect(r.machineCoverageRate).toBe(0);
  });

  it('fenced code block 内の MUST は監査対象外', () => {
    const r = audit('前置き [T] MUST\n```ts\n// これは MUST NOT の引用\n```\n');
    expect(r.mustTotal).toBe(1);
  });

  it('SHOULD だけの行は数えない', () => {
    const r = audit('これは SHOULD の行 [T] MUST な行\nSHOULD のみの行\n');
    expect(r.mustTotal).toBe(1);
  });
});

describe('auditStandardsDoc — (ii) rule-id 実在照合（RAT-2）', () => {
  it('故意 fail: 不存在 rule-id は red', () => {
    const r = audit('境界は zones で強制 MUST `[E:zones]`\n');
    expect(r.state).toBe('red');
    expect(r.ruleIdFailures).toHaveLength(1);
    expect(r.ruleIdFailures[0]).toMatchObject({ kind: 'E', candidate: 'zones', status: 'missing' });
  });

  it('実在 rule-id（完全一致）は ok', () => {
    const r = audit('MUST `[E:import-x/no-restricted-paths]`\n');
    expect(r.ruleIdFailures).toHaveLength(0);
    expect(r.ruleIdFindings[0]?.status).toBe('ok');
  });

  it('prefix 省略は suffix 一致で解決し正準 id を報告する', () => {
    const r = audit(
      'style prop は MUST `[E:style-prop-css-vars-only]`・S 側 `[S:themes-token-only]`\n',
    );
    expect(r.ruleIdFailures).toHaveLength(0);
    expect(r.ruleIdFindings.map((f) => f.resolvedTo)).toEqual([
      'nene2/style-prop-css-vars-only',
      'nene2/themes-token-only',
    ]);
  });

  it('` — 注釈`・括弧サフィックスは正規化してから照合する', () => {
    expect(normalizeRuleId('no-restricted-syntax — 登録テーマモジュール外')).toBe(
      'no-restricted-syntax',
    );
    expect(normalizeRuleId('import-x/no-restricted-paths(zones)')).toBe(
      'import-x/no-restricted-paths',
    );
    expect(normalizeRuleId('no-restricted-syntax（既存9リポ）')).toBe('no-restricted-syntax');
    const r = audit('MUST `[E:no-restricted-syntax — data-theme 読み取り禁止]`\n');
    expect(r.ruleIdFailures).toHaveLength(0);
  });

  it('構文プレースホルダ（rule-id / rule）は照合スキップ（red にしない）', () => {
    const r = audit('タグは `[E:rule-id]` / `[E:rule]` 形式・型は [T] で書く MUST\n');
    expect(r.ruleIdFailures).toHaveLength(0);
    expect(r.ruleIdFindings.filter((f) => f.status === 'placeholder')).toHaveLength(2);
  });

  it('空 id（[E:]）は malformed で red', () => {
    const r = audit('MUST [T] だが空タグ `[E:]` が混入\n');
    expect(r.ruleIdFailures).toHaveLength(1);
    expect(r.ruleIdFailures[0]?.status).toBe('malformed');
  });

  it('fence 内のタグは照合しない', () => {
    const r = audit('本文 [T] MUST\n```js\n// [E:zones] はコード例内\n```\n');
    expect(r.ruleIdFindings).toHaveLength(0);
  });
});

describe('auditStandardsDoc — (ii) 未配布注記つき rule-id は deferred（#72）', () => {
  it('現物: 未配布注記つき [E:rule] は deferred＝red にしない・件数を報告する', () => {
    // 04-i18n.md:348 / 02-data-flow.md:739 等の現物形（配布 config 未有効化を著者が明示）
    const r = audit(
      'View は網羅 switch MUST `[E:@typescript-eslint/switch-exhaustiveness-check（未配布——配布 config 未設定の空隙）]` [T]\n',
    );
    expect(r.ruleIdFailures).toHaveLength(0);
    expect(r.ruleIdFindings.filter((f) => f.status === 'deferred')).toHaveLength(1);
    expect(r.state).toBe('green');
  });

  it('未配布でも [T] 等の裏付けタグがあれば MUST 自体はタグ済み（untagged にしない）', () => {
    const r = audit(
      'export は named のみ MUST `[E:import-x/no-default-export（未配布——W0b）]` [T]\n',
    );
    expect(r.untaggedMusts).toHaveLength(0);
  });

  it('🔴 fail-open の負例: 未配布注記の無い不存在 rule-id は従来どおり missing（deferred が漏れない）', () => {
    const r = audit('境界は zones で強制 MUST `[E:zones]`\n');
    expect(r.ruleIdFailures).toHaveLength(1);
    expect(r.ruleIdFailures[0]?.status).toBe('missing');
    expect(r.ruleIdFindings.filter((f) => f.status === 'deferred')).toHaveLength(0);
  });

  it('未配布は raw id で判定する（normalize が注記を落としても deferred を取りこぼさない）', () => {
    // 実在ルール + 未配布注記 → 著者が「未配布」と言う以上 deferred（missing でも ok でもない）
    const r = audit('MUST `[E:no-restricted-imports（未配布——W0b 追加候補）]`\n');
    expect(r.ruleIdFindings[0]?.status).toBe('deferred');
    expect(r.ruleIdFailures).toHaveLength(0);
  });
});

describe('auditStandardsDoc — 非規範マーカー <!-- nonnormative -->（#74）', () => {
  it('マーカー行は MUST 監査対象外・件数を報告／隣の正規範は生きる', () => {
    const r = audit(
      '生 fetch は MUST NOT `[E:no-restricted-syntax]`\n' +
        '根拠: 旧「500行上限 MUST」は R5 で削除済み。<!-- nonnormative -->\n',
    );
    expect(r.mustTotal).toBe(1); // 1行目のみが規範
    expect(r.untaggedMusts).toHaveLength(0);
    expect(r.nonnormativeMarked).toBe(1); // 2行目は言及行
    expect(r.state).toBe('green');
  });

  it('🔴 fail-open の負例: マーカーは行単位＝次行の無タグ MUST に伝染しない', () => {
    const r = audit('根拠: … MUST … <!-- nonnormative -->\n生 fetch は MUST NOT。\n');
    expect(r.nonnormativeMarked).toBe(1);
    expect(r.untaggedMusts).toHaveLength(1);
    expect(r.untaggedMusts[0]).toMatchObject({ line: 2 });
    expect(r.state).toBe('red');
  });

  it('🔴 fail-open の負例: マーカーは兄弟 bullet を green にしない（明示行のみ）', () => {
    const r = audit('- 規則A に言及 MUST。<!-- nonnormative -->\n- 規則B は MUST NOT。\n');
    expect(r.nonnormativeMarked).toBe(1);
    expect(r.untaggedMusts).toHaveLength(1);
    expect(r.untaggedMusts[0]).toMatchObject({ line: 2 });
  });

  it('設計: マーカーは MUST 監査のみに効く — rule-id 実在照合（RAT-2）は独立軸で続行', () => {
    const r = audit('言及行 MUST `[E:zones]` <!-- nonnormative -->\n');
    expect(r.nonnormativeMarked).toBe(1);
    expect(r.mustTotal).toBe(0);
    // MUST 監査からは外れるが、行に書かれた不存在 rule-id は RAT-2 で依然 red
    expect(r.ruleIdFailures.some((f) => f.candidate === 'zones')).toBe(true);
  });
});

describe('auditStandardsDoc — [P] 列挙制（G-3）と (iv) カバレッジ', () => {
  it('故意 fail: [P:process] 以外の id 付き [P] は red', () => {
    const r = audit('MUST [P:review]\n');
    expect(r.state).toBe('red');
    expect(r.pEnumerationFailures).toHaveLength(1);
    expect(r.pEnumerationFailures[0]?.raw).toBe('[P:review]');
  });

  it('bare [P] と [P:process] は列挙内', () => {
    const r = audit('MUST [P]\nMUST [P:process]\n');
    expect(r.pEnumerationFailures).toHaveLength(0);
  });

  it('カバレッジ率 = 機械強制タグ付き MUST / MUST 総数', () => {
    const r = audit('MUST [T]\nMUST [E:no-restricted-syntax]\nMUST [P:process]\nタグなし MUST\n');
    expect(r.mustTotal).toBe(4);
    expect(r.mustTagged).toBe(3);
    expect(r.mustMachineTagged).toBe(2);
    expect(r.machineCoverageRate).toBeCloseTo(0.5);
    expect(r.taggedCoverageRate).toBeCloseTo(0.75);
    // SHOULD 目標は観測のみ — 90% 未満でも red の根拠は untagged のみ（G-5: 数値ゲート化 MUST NOT）
    expect(r.untaggedMusts).toHaveLength(1);
  });

  it('[X] 参照は check:exemplars へ委譲（数のみ報告）', () => {
    const r = audit('MUST `[X:repo-a/src/a.ts#nene2-exemplar:alpha]`\n');
    expect(r.exemplarRefsDelegated).toBe(1);
    expect(r.state).toBe('green'); // [X] の解決可否は本検査の red 根拠にしない
  });

  it('fail-closed（G-6）: MUST 行 0 = unknown（空虚合格 MUST NOT）', () => {
    const r = audit('規範語の無いただの文章。\n');
    expect(r.state).toBe('unknown');
    expect(r.machineCoverageRate).toBeNull();
  });
});

describe('配布 config からの rule 集合抽出', () => {
  it('enforcedEslintRuleIds は off のみのルール（prettier interop）を実在に数えない', () => {
    const all = enforcedEslintRuleIds(composedConfig());
    expect(all.has('import-x/no-restricted-paths')).toBe(true);
    expect(all.has('better-tailwindcss/no-unknown-classes')).toBe(true);
    expect(all.has('nene2/style-prop-css-vars-only')).toBe(true);
    // eslint-config-prettier が off にするだけの stylistic ルールは「配布が強制するルール」ではない
    expect(all.has('@stylistic/semi')).toBe(false);
  });

  it('enforcedStylelintRuleIds は rules ＋ overrides から非 null 設定を集める', () => {
    const s = enforcedStylelintRuleIds(stylelintConfig);
    expect(s.has('declaration-no-important')).toBe(true);
    expect(s.has('nene2/themes-token-only')).toBe(true); // override 側のみで有効
  });
});
