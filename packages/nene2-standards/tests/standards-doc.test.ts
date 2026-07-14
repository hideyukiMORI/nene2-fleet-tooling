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
