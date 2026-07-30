/**
 * `reportOnly` ヘルパのテスト（#189・hub 裁定 2026-07-30）。
 *
 * 中心は**事故形の再発防止**。2026-07-30 の origin / field 導入で出た3形を、それぞれ
 * 陽性対照つきで固定する:
 *
 * 1. canonical が off にしているルールを武装させると config 読み込みが落ちる → `'warn'` 指定で
 *    台帳に off が混ざっていたら **fail-loud**（静かに壊れた config を出荷しない）。
 * 2. runtime 導出は canonical の将来追加を黙って吸収する → 台帳は凍結し、追随漏れを
 *    `reportOnlyStaleRules()` が言える。
 * 3. `off` 形の降格が実際に効く（ESLint の実効 severity で確認 — 生成物を信じない）。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import {
  canonicalRuleIds,
  renderReportOnlyLedger,
  reportOnly,
  reportOnlyStaleRules,
  toolingExemption,
} from '../src/configs/report-only.js';
import { composedConfig } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const probeApp = path.join(here, 'fixtures', 'probe-app');

/** canonical が off にしている代表例（eslint-config-prettier 由来・#189 実測） */
const KNOWN_CANONICAL_OFF = '@stylistic/lines-around-comment';

const severityOf = (entry: Linter.RuleEntry | undefined): unknown =>
  Array.isArray(entry) ? entry[0] : entry;

describe('canonicalRuleIds — 台帳の中身は「武装しているルール」だけ', () => {
  it('off のルールを含めない（含めると warn 形で config が落ちる）', () => {
    const ids = canonicalRuleIds();
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain(KNOWN_CANONICAL_OFF);
  });

  it('canonical の実装から導出している（手書き二重管理でない）', () => {
    // composedConfig 側で武装しているルールは、i18n / testing 軸を除けば台帳に載る。
    const armedInAxes = new Set(canonicalRuleIds());
    expect(armedInAxes.has('no-restricted-syntax')).toBe(true);
    expect(armedInAxes.has('no-restricted-imports')).toBe(true);
  });

  it('ソート済み・重複なし（差分レビューを安定させるため）', () => {
    const ids = canonicalRuleIds();
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('reportOnly — 降格ブロック', () => {
  it('既定は off（艦の --max-warnings 0 を壊さない）', () => {
    const block = reportOnly({ ruleIds: ['no-restricted-syntax'] });
    expect(block.rules?.['no-restricted-syntax']).toBe('off');
    expect(block.name).toBe('nene2/report-only');
    expect(block.files).toBeUndefined();
  });

  it('warn も選べる（warning を許容する CI の艦だけ）', () => {
    const block = reportOnly({ ruleIds: ['no-restricted-syntax'], severity: 'warn' });
    expect(block.rules?.['no-restricted-syntax']).toBe('warn');
  });

  it('🔴 陽性対照: warn 形で canonical の off を武装させようとしたら throw（#189 摩擦3）', () => {
    expect(() => reportOnly({ ruleIds: [KNOWN_CANONICAL_OFF], severity: 'warn' })).toThrowError(
      /off にしているルールを 'warn' で武装/,
    );
  });

  it('off 形なら off の混入は無害なので通す（実害が無いものを止めない）', () => {
    const block = reportOnly({ ruleIds: [KNOWN_CANONICAL_OFF] });
    expect(block.rules?.[KNOWN_CANONICAL_OFF]).toBe('off');
  });

  it('files を渡したときだけ座席が絞られる', () => {
    const block = reportOnly({ ruleIds: ['no-restricted-syntax'], files: ['src/**/*.ts'] });
    expect(block.files).toEqual(['src/**/*.ts']);
  });
});

describe('reportOnlyStaleRules — 凍結台帳の追随漏れ', () => {
  it('台帳に無い武装ルールを返す（canonical が後から増やした形）', () => {
    const full = canonicalRuleIds();
    const stale = reportOnlyStaleRules(full.slice(1));
    expect(stale).toEqual([full[0]]);
  });

  it('追随できていれば空（空振りでないことは上のケースが担保）', () => {
    expect(reportOnlyStaleRules(canonicalRuleIds())).toEqual([]);
  });
});

describe('renderReportOnlyLedger — 生成器を配布側に持つ', () => {
  it('件数注記が実際の件数と一致し、id は必要なときだけクォートされる', () => {
    const out = renderReportOnlyLedger();
    const ids = canonicalRuleIds();
    expect(out).toContain(`// ルール数: ${ids.length}`);
    expect(out).toContain('export const canonicalOff = [');
    expect(out).toContain(`  'no-restricted-syntax',`);
  });

  it('生成物は実際に評価できる JS（生成できたことを動くことの証拠にしない）', async () => {
    const src = renderReportOnlyLedger({ standardsVersion: '0.0.0-test' });
    const mod = (await import(
      `data:text/javascript;base64,${Buffer.from(src, 'utf8').toString('base64')}`
    )) as { canonicalOff: string[] };
    expect(mod.canonicalOff).toEqual(canonicalRuleIds());
    expect(src).toContain('0.0.0-test');
  });
});

describe('toolingExemption — 型付きプログラム外ファイル（#189 摩擦5）', () => {
  it('projectService を切る（パースエラーは severity 降格で消せない）', () => {
    const block = toolingExemption();
    expect(block.languageOptions?.parserOptions?.projectService).toBe(false);
    expect(block.files).toContain('**/*.mjs'); // `**/*.js` は .mjs を捕まえない（origin/field 実測）
  });
});

describe('統合: 降格が ESLint の実効値として効く（生成物を信じない）', () => {
  it('canonical + reportOnly(off) で canonical のルールが実効 off になる', async () => {
    const config: Linter.Config[] = [
      ...composedConfig(),
      reportOnly({ ruleIds: canonicalRuleIds() }),
    ];
    const eslint = new ESLint({ cwd: probeApp, overrideConfigFile: true, overrideConfig: config });
    const effective = (await eslint.calculateConfigForFile(
      path.join(probeApp, 'src/features/probe/file.tsx'),
    )) as { rules?: Record<string, Linter.RuleEntry> };
    expect(severityOf(effective.rules?.['no-restricted-syntax'])).toBe(0);
  }, 60_000);

  it('🔴 陽性対照: 降格ブロックを外すと同じルールが武装している（検査が空振りしていない）', async () => {
    const eslint = new ESLint({
      cwd: probeApp,
      overrideConfigFile: true,
      overrideConfig: composedConfig(),
    });
    const effective = (await eslint.calculateConfigForFile(
      path.join(probeApp, 'src/features/probe/file.tsx'),
    )) as { rules?: Record<string, Linter.RuleEntry> };
    expect(severityOf(effective.rules?.['no-restricted-syntax'])).toBe(2);
  }, 60_000);
});
