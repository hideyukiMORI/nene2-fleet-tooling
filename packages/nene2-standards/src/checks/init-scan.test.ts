/**
 * P2-A4: init --scan が (rule,file) frozenCount を実測生成する（lint-baseline 器の土台）。
 * 本リポ初の programmatic stylelint 実行テスト — 実走で数える（空虚合格防止: 違反+1で frozenCount+1）。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { RegistriesDocument } from '../registries/schema.js';
import { validateRegistries, REGISTRIES_SCHEMA_ID } from '../registries/schema.js';
import { initCheck, initScan, initScanEntries, scanLintBaselines } from './init-scan.js';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs.length = 0;
});

/** 一時 repo（src/shared/ui/x.css・テーマ外＝構造ルールが素で効く）に css を置く。 */
function makeRepo(css: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'nene2-a4-'));
  dirs.push(dir);
  const uiDir = path.join(dir, 'src', 'shared', 'ui');
  mkdirSync(uiDir, { recursive: true });
  writeFileSync(path.join(uiDir, 'x.css'), css);
  return dir;
}

const TWO_HEX = `@layer components {
  .foo { color: #ffffff; border-color: #000000; }
  div.bar .baz.qux:hover { color: green; }
}
`;
const THREE_HEX = `@layer components {
  .foo { color: #ffffff; border-color: #000000; background: #123456; }
  div.bar .baz.qux:hover { color: green; }
}
`;

function frozenOf(
  baselines: Awaited<ReturnType<typeof scanLintBaselines>>,
  rule: string,
): number | undefined {
  return baselines.find((b) => b.rule === rule)?.frozenCount;
}

describe('scanLintBaselines — (rule,file) 実測（P2-A4）', () => {
  it('構造ルール違反を (rule,file) で数える（color-no-hex は hex 個数と一致）', async () => {
    const baselines = await scanLintBaselines(makeRepo(TWO_HEX));
    expect(frozenOf(baselines, 'color-no-hex')).toBe(2);
    expect(frozenOf(baselines, 'selector-max-specificity') ?? 0).toBeGreaterThanOrEqual(1);
    // file は frontend cwd 相対（A2 override files と一致する形・F3）
    expect(baselines.every((b) => b.file === 'src/shared/ui/x.css')).toBe(true);
  });

  it('seat 済みルール（layer-components-allowlist）は除外（二重計上しない・F1）', async () => {
    const baselines = await scanLintBaselines(makeRepo(TWO_HEX));
    // 未登録クラス .foo/.bar/... は layer-components-allowlist に触れるが baseline には出さない
    expect(baselines.some((b) => b.rule === 'nene2/layer-components-allowlist')).toBe(false);
    expect(baselines.some((b) => b.rule === 'nene2/layer-legacy-manifest-only')).toBe(false);
  });

  it('空虚合格防止: hex を1つ増やすと color-no-hex frozenCount が +1', async () => {
    const two = await scanLintBaselines(makeRepo(TWO_HEX));
    const three = await scanLintBaselines(makeRepo(THREE_HEX));
    expect(frozenOf(three, 'color-no-hex')).toBe((frozenOf(two, 'color-no-hex') ?? 0) + 1);
  });

  it('違反ゼロの css は lint-baseline を生成しない（green は entry 0・F4）', async () => {
    const clean = `@layer components {\n  .ok { opacity: 1; }\n}\n`;
    const baselines = await scanLintBaselines(makeRepo(clean));
    expect(baselines).toEqual([]);
  });
});

describe('initScanEntries — lint-baseline emit（P2-A4）', () => {
  it('(rule,file) エントリを registries-valid な形で吐く', async () => {
    const scan = await initScan(makeRepo(TWO_HEX));
    const entries = initScanEntries(scan, 'nene-test');
    const lb = entries.filter((e) => e.kind === 'lint-baseline');
    expect(lb.length).toBeGreaterThan(0);
    expect(lb[0]).toMatchObject({
      kind: 'lint-baseline',
      repo: 'nene-test',
      initializedBy: 'init --scan',
    });
    // validateRegistries を通る（id 付き・貼れる正本形）
    const diags = validateRegistries(JSON.stringify({ schema: REGISTRIES_SCHEMA_ID, entries }));
    expect(diags).toEqual([]);
  });
});

describe('initCheck — lint-baseline count-ratchet（#119・AM-14）', () => {
  const REPO = 'nene-test';
  const CLEAN = `@layer components {\n  .ok { opacity: 1; }\n}\n`;

  /** 指定 CSS の scan を凍結値として登録した registries doc を作る。 */
  async function registriesFrozenAt(css: string): Promise<RegistriesDocument> {
    const scan = await initScan(makeRepo(css));
    return { entries: initScanEntries(scan, REPO) } as RegistriesDocument;
  }

  it('回帰: live > frozenCount は regression（FAIL 対象）・shrinkable でない', async () => {
    const registries = await registriesFrozenAt(TWO_HEX); // color-no-hex frozen 2
    const report = await initCheck(makeRepo(THREE_HEX), REPO, registries); // live 3
    expect(report.lintBaselineRegressions.find((r) => r.rule === 'color-no-hex')).toMatchObject({
      frozenCount: 2,
      liveCount: 3,
    });
    expect(report.lintBaselineShrinkable.find((s) => s.rule === 'color-no-hex')).toBeUndefined();
  });

  it('不変: live == frozenCount なら regression も shrinkable も無し', async () => {
    const registries = await registriesFrozenAt(TWO_HEX);
    const report = await initCheck(makeRepo(TWO_HEX), REPO, registries);
    expect(report.lintBaselineRegressions).toEqual([]);
    expect(report.lintBaselineShrinkable).toEqual([]);
  });

  it('縮小: live < frozenCount は shrinkable advisory（FAIL でない）', async () => {
    const registries = await registriesFrozenAt(THREE_HEX); // color-no-hex frozen 3
    const report = await initCheck(makeRepo(TWO_HEX), REPO, registries); // live 2
    expect(report.lintBaselineShrinkable.find((s) => s.rule === 'color-no-hex')).toMatchObject({
      frozenCount: 3,
      liveCount: 2,
    });
    expect(report.lintBaselineRegressions).toEqual([]);
  });

  it('完全解消: 登録ありで live 0（clean）は shrinkable（liveCount 0・scan 不在を 0 と扱う）', async () => {
    const registries = await registriesFrozenAt(TWO_HEX);
    const report = await initCheck(makeRepo(CLEAN), REPO, registries);
    expect(report.lintBaselineShrinkable.find((s) => s.rule === 'color-no-hex')?.liveCount).toBe(0);
    expect(report.lintBaselineRegressions).toEqual([]);
  });
});
