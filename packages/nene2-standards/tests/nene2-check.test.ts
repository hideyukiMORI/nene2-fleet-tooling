/**
 * nene2-check（conformance skeleton）— fail-closed（G-6）・5状態ユニオン・gate-integrity・
 * scan-coverage・init --scan の両方向（green＋故意 fail）検査。
 */
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import type { Linter } from 'eslint';

import {
  CONFORMANCE_KEYS,
  CONFORMANCE_SCHEMA_ID,
  validateConformance,
} from '../src/checks/conformance.js';
import { checkGateIntegrity } from '../src/checks/gate-integrity.js';
import { checkScanCoverage } from '../src/checks/scan-coverage.js';
import { initCheck, initScan, ledgersAlreadyInitialized } from '../src/checks/init-scan.js';
import { runConformance } from '../src/checks/run.js';
import { parseRegistries, REGISTRIES_SCHEMA_ID } from '../src/registries/schema.js';
import { composedConfig } from '../src/index.js';

const dir = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const probeApp = dir('./fixtures/probe-app/');
const checkApp = dir('./fixtures/check-app/');
const checkAppBad = dir('./fixtures/check-app-bad/');
const checkAppEmpty = dir('./fixtures/check-app-empty/');
const initApp = dir('./fixtures/init-app/');

function registriesWith(entries: unknown[]): ReturnType<typeof parseRegistries> {
  return parseRegistries(JSON.stringify({ schema: REGISTRIES_SCHEMA_ID, entries }));
}

const EMPTY_REGISTRIES = registriesWith([]);

describe('conformance スキーマ（CF-2 — 5状態・n/a 拒否・boolean 拒否）', () => {
  const base = {
    schema: CONFORMANCE_SCHEMA_ID,
    repo: 'nene-payout',
    meta: {},
    keys: {} as Record<string, unknown>,
  };

  it('リポ出力の "n/a" は schema 違反（中央レジストリでのみ宣言可 — G-7）', () => {
    const doc = { ...base, keys: { 'e2e.axe-smoke': { state: 'n/a', reasonRef: 'x' } } };
    expect(validateConformance(doc).some((e) => e.includes('n/a'))).toBe(true);
  });

  it('boolean 状態は MUST NOT（AM-11(vi)）・unknown は reason 判別必須（R5(5)）', () => {
    expect(
      validateConformance({ ...base, keys: { 'gate-integrity': true } }).length,
    ).toBeGreaterThan(0);
    expect(
      validateConformance({
        ...base,
        keys: { 'gate-integrity': { state: 'unknown' } },
      }).some((e) => e.includes('reason')),
    ).toBe(true);
    expect(
      validateConformance({
        ...base,
        keys: { 'gate-integrity': { state: 'unknown', reason: 'not-installed' } },
      }),
    ).toEqual([]);
  });

  it('red は details（証拠列挙）必須・列挙外キーは違反', () => {
    expect(
      validateConformance({ ...base, keys: { 'gate-integrity': { state: 'red' } } }).some((e) =>
        e.includes('details'),
      ),
    ).toBe(true);
    expect(
      validateConformance({ ...base, keys: { 'my.new-key': { state: 'green' } } }).some((e) =>
        e.includes('列挙外'),
      ),
    ).toBe(true);
  });
});

describe('gate-integrity（05 §5.2 #15 — 実効 severity / オプション欠落の照合）', () => {
  it('配布 config そのまま = green（canonical 自己一致）', async () => {
    const result = await checkGateIntegrity({
      cwd: probeApp,
      productConfigOverride: composedConfig(),
    });
    expect(result).toEqual({ state: 'green' });
  }, 60_000);

  it('故意 fail: 後置き off（差異登録なき緩和）は red', async () => {
    const relaxed: Linter.Config[] = [
      ...composedConfig(),
      { files: ['src/**/*.tsx'], rules: { 'no-restricted-syntax': 'off' } },
    ];
    const result = await checkGateIntegrity({ cwd: probeApp, productConfigOverride: relaxed });
    expect(result.state).toBe('red');
    if (result.state === 'red') {
      expect(result.details.some((d) => d.includes('緩和'))).toBe(true);
    }
  }, 60_000);

  it('故意 fail: 後勝ち全置換（severity 同じままセレクタ欠落）も red — severity 照合だけでは見えない形', async () => {
    const clobbered: Linter.Config[] = [
      ...composedConfig(),
      {
        files: ['src/features/**/*.{ts,tsx}'],
        rules: {
          'no-restricted-syntax': ['error', { selector: 'DebuggerStatement', message: 'x' }],
        },
      },
    ];
    const result = await checkGateIntegrity({ cwd: probeApp, productConfigOverride: clobbered });
    expect(result.state).toBe('red');
    if (result.state === 'red') {
      expect(result.details.some((d) => d.includes('後勝ち全置換'))).toBe(true);
    }
  }, 60_000);

  it('fail-closed: eslint.config.js 不在 = unknown(not-installed)', async () => {
    const result = await checkGateIntegrity({ cwd: checkApp });
    expect(result.state).toBe('unknown');
    if (result.state === 'unknown') expect(result.reason).toBe('not-installed');
  });

  it('G-6: 適用ファイル数 0 = unknown（空虚合格 MUST NOT）', async () => {
    const result = await checkGateIntegrity({
      cwd: checkAppEmpty,
      productConfigOverride: composedConfig(),
    });
    expect(result.state).toBe('unknown');
    if (result.state === 'unknown') {
      expect(result.details?.some((d) => d.includes('適用ファイル数 0'))).toBe(true);
    }
  });
});

describe('scan-coverage（05 §5.2 #14 — 補集合検査）', () => {
  it('正例: themes＋index.css＋index.html のみ = green', () => {
    expect(
      checkScanCoverage({ cwd: checkApp, repo: 'nene-x', registries: EMPTY_REGISTRIES }),
    ).toEqual({ state: 'green' });
  });

  it('故意 fail: 台帳外 css は red・scss は即 red', () => {
    const result = checkScanCoverage({
      cwd: checkAppBad,
      repo: 'nene-x',
      registries: EMPTY_REGISTRIES,
    });
    expect(result.state).toBe('red');
    if (result.state === 'red') {
      expect(result.details.some((d) => d.includes('extra.css'))).toBe(true);
      expect(result.details.some((d) => d.includes('legacy.scss') && d.includes('即 red'))).toBe(
        true,
      );
    }
  });

  it('legacy manifest 登録済みの css は許容・記載ファイル不在は red（台帳腐敗防止）', () => {
    const withManifest = registriesWith([
      {
        kind: 'legacy-manifest',
        id: 'x-legacy',
        repo: 'nene-x',
        path: 'src/styles/extra.css',
        maxLines: 3,
        maxBytes: 50,
      },
      {
        kind: 'legacy-manifest',
        id: 'x-gone',
        repo: 'nene-x',
        path: 'src/styles/deleted.css',
        maxLines: 3,
        maxBytes: 50,
      },
    ]);
    const result = checkScanCoverage({
      cwd: checkAppBad,
      repo: 'nene-x',
      registries: withManifest,
    });
    expect(result.state).toBe('red');
    if (result.state === 'red') {
      expect(result.details.some((d) => d.includes('extra.css'))).toBe(false); // 登録済み
      expect(result.details.some((d) => d.includes('deleted.css') && d.includes('台帳腐敗'))).toBe(
        true,
      );
    }
  });

  it('fail-closed: 台帳なし = unknown（補集合検査は台帳なしに定義できない）', () => {
    const result = checkScanCoverage({ cwd: checkApp, repo: 'nene-x', registries: null });
    expect(result.state).toBe('unknown');
  });
});

describe('init --scan（T-3/AM-10 — 走査生成・一度きり・--check 読み取り専用）', () => {
  it('@layer components の class トークンと legacy manifest 初期値（prettier 整形後行数）を生成する', async () => {
    const result = await initScan(initApp);
    expect(result.allowedClasses).toEqual(['.badge', '.data-table']);
    expect(result.legacyManifest).toHaveLength(1);
    const entry = result.legacyManifest[0];
    expect(entry?.path).toBe('src/legacy-styles.css');
    expect(entry?.maxLines).toBeGreaterThan(0);
    expect(entry?.maxBytes).toBeGreaterThan(0);
  });

  it('対象台帳が既存なら実行拒否の判定を返す（生成はゲート導入 PR の一度きり）', () => {
    const withExisting = registriesWith([
      {
        kind: 'legacy-manifest',
        id: 'x',
        repo: 'nene-x',
        path: 'src/legacy-styles.css',
        maxLines: 8,
        maxBytes: 120,
      },
    ]);
    expect(ledgersAlreadyInitialized(withExisting, 'nene-x').legacyManifest).toBe(true);
    expect(ledgersAlreadyInitialized(EMPTY_REGISTRIES, 'nene-x').legacyManifest).toBe(false);
  });

  it('--check は未登録ファイルを報告する（styling green 条件 = 未分類 0）', async () => {
    const report = await initCheck(initApp, 'nene-x', EMPTY_REGISTRIES);
    expect(report.unregisteredLegacyFiles).toEqual(['src/legacy-styles.css']);
  });
});

describe('runConformance（skeleton 全体 — CF-1〜4）', () => {
  it('出力は schema green・n/a なし・未配線キーは unknown(not-installed)', async () => {
    const vector = await runConformance({ cwd: checkApp, repo: 'nene-x' });
    expect(validateConformance(vector)).toEqual([]);
    expect(Object.keys(vector.keys).sort()).toEqual([...CONFORMANCE_KEYS].sort());
    // skeleton: 空虚合格を出荷しない — 未配線キーが green になっていないこと
    expect(vector.keys['i18n.parity'].state).toBe('unknown');
    expect(vector.keys['e2e.axe-smoke'].state).toBe('unknown');
    // 実装済みキー: scan-coverage はパッケージ同梱 registries（現物）で走る
    expect(['green', 'red']).toContain(vector.keys['styling.scan-coverage'].state);
    // meta（CF-4）: contractVersion = テーマプラグマ最小値
    expect(vector.meta.contractVersion).toBe('1.0');
    expect(vector.meta.manifestSha).toMatch(/^[0-9a-f]{64}$/);
  });
});
