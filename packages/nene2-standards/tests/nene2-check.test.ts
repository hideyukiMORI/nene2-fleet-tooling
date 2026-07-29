/**
 * nene2-check（conformance skeleton）— fail-closed（G-6）・5状態ユニオン・gate-integrity・
 * scan-coverage・init --scan の両方向（green＋故意 fail）検査。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Linter } from 'eslint';

import {
  CONFORMANCE_KEYS,
  CONFORMANCE_SCHEMA_ID,
  validateConformance,
} from '../src/checks/conformance.js';
import { checkGateIntegrity } from '../src/checks/gate-integrity.js';
import { checkScanCoverage, enumerateStyleSources } from '../src/checks/scan-coverage.js';
import {
  initCheck,
  initRemeasure,
  initScan,
  initScanEntries,
  ledgersAlreadyInitialized,
} from '../src/checks/init-scan.js';
import { resolveInitRegistries, runConformance } from '../src/checks/run.js';
import {
  parseRegistries,
  REGISTRIES_SCHEMA_ID,
  validateRegistries,
} from '../src/registries/schema.js';
import { composedConfig } from '../src/index.js';

const dir = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const probeApp = dir('./fixtures/probe-app/');
const checkApp = dir('./fixtures/check-app/');
const checkAppBad = dir('./fixtures/check-app-bad/');
const checkAppEmpty = dir('./fixtures/check-app-empty/');
const initApp = dir('./fixtures/init-app/');

// fleet-tooling#28 の実測形（clear legacy 隔離パイロット: E2E ハーネスの dist-e2e/ が
// build のたびに生成する css）を模す。build 出力そのものは commit しない（.gitignore に
// 登録済みの init-app/dist-e2e/ 配下へテスト実行時にのみ生成し、実行後に消す — 台帳汚染 MUST NOT
// と同じ理由で、gitignore 済みディレクトリを「常に存在するコミット済みフィクスチャ」にすると
// git 側の無視判定（tracked ファイルは無視対象外）を偽装してしまい回帰検査として機能しない）。
const initAppDistE2e = path.join(initApp, 'dist-e2e');
beforeAll(() => {
  mkdirSync(path.join(initAppDistE2e, 'assets'), { recursive: true });
  writeFileSync(
    path.join(initAppDistE2e, 'assets', 'index-abc123.css'),
    '.injected-e2e-noise { color: red; }\n',
  );
});
afterAll(() => {
  rmSync(initAppDistE2e, { recursive: true, force: true });
});

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

  it('enumerateStyleSources は .gitignore 済みディレクトリを走査しない（fleet-tooling#28）', () => {
    const sources = enumerateStyleSources(initApp);
    expect(sources).not.toContain('dist-e2e/assets/index-abc123.css');
    expect(sources.some((p) => p.startsWith('dist-e2e/'))).toBe(false);
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

  it('.gitignore 登録済みの非標準 outDir（dist-e2e/）は走査対象から除外される（fleet-tooling#28 — clear legacy 隔離パイロットの実測: dist-e2e/assets/index-*.css の誤収載）', async () => {
    const result = await initScan(initApp);
    const allPaths = result.legacyManifest.map((e) => e.path);
    expect(allPaths.some((p) => p.startsWith('dist-e2e/'))).toBe(false);
    expect(allPaths).toEqual(['src/legacy-styles.css']);
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

  it('initScanEntries は registries-valid なエントリ（id 付き）を生成する（#65 emit）', async () => {
    const scan = await initScan(initApp);
    const entries = initScanEntries(scan, 'nene-x');
    const ca = entries.find((e) => e.kind === 'components-allowlist');
    expect(ca).toMatchObject({ repo: 'nene-x', classes: scan.allowedClasses });
    expect(entries.filter((e) => e.kind === 'legacy-manifest')).toHaveLength(1);
    // 貼れる正本形＝validateRegistries を通る（loose 出力の id 欠落を根治）
    expect(validateRegistries(JSON.stringify({ schema: REGISTRIES_SCHEMA_ID, entries }))).toEqual(
      [],
    );
  });

  it('走査クラスが空なら components-allowlist エントリを持たない（payout/deal 型）', () => {
    const entries = initScanEntries(
      { allowedClasses: [], legacyManifest: [], lintBaselines: [], advisories: [] },
      'nene-payout',
    );
    expect(entries.some((e) => e.kind === 'components-allowlist')).toBe(false);
  });

  it('T-3 ガードは components-allowlist の既存も検知する（#65 — kind 追加の穴塞ぎ）', () => {
    const withCa = registriesWith([
      { kind: 'components-allowlist', id: 'x', repo: 'nene-x', classes: ['.badge'] },
    ]);
    expect(ledgersAlreadyInitialized(withCa, 'nene-x').componentsAllowlist).toBe(true);
    expect(ledgersAlreadyInitialized(EMPTY_REGISTRIES, 'nene-x').componentsAllowlist).toBe(false);
  });

  // #176 size-ratchet。**陽性対照つき**（hub 受入条件 2026-07-30）: 検査器を足すときは
  // 「本当に検出できること」を故意 fail で示す。#159→#176 と「登録しても効かない」が2件続いた原因は、
  // 登録経路のテストはあっても**検出経路の負テストが無かった**こと。
  describe('legacy-manifest size-ratchet（#176 — cap 超過の検出）', () => {
    const legacyPath = 'src/legacy-styles.css';
    const capOf = (maxLines: number, maxBytes: number): ReturnType<typeof registriesWith> =>
      registriesWith([
        {
          kind: 'legacy-manifest',
          id: 'x-legacy',
          repo: 'nene-x',
          path: legacyPath,
          maxLines,
          maxBytes,
        },
      ]);

    it('🔴 陽性対照: cap を下回る値で登録すると回帰として検出する（従来は緑になっていた）', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath);
      expect(live).toBeDefined();
      // 実測より小さい cap＝超過している状態
      const report = await initCheck(
        initApp,
        'nene-x',
        capOf(live!.maxLines - 1, live!.maxBytes - 1),
      );
      expect(report.legacyManifestRegressions).toHaveLength(1);
      expect(report.legacyManifestRegressions[0]).toMatchObject({
        path: legacyPath,
        liveLines: live!.maxLines,
        liveBytes: live!.maxBytes,
      });
    });

    it('行だけ超過・byte だけ超過のどちらも検出する（片側だけ見る実装を許さない）', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath)!;
      const linesOnly = await initCheck(
        initApp,
        'nene-x',
        capOf(live.maxLines - 1, live.maxBytes + 999),
      );
      expect(linesOnly.legacyManifestRegressions).toHaveLength(1);
      const bytesOnly = await initCheck(
        initApp,
        'nene-x',
        capOf(live.maxLines + 999, live.maxBytes - 1),
      );
      expect(bytesOnly.legacyManifestRegressions).toHaveLength(1);
    });

    it('cap ちょうど = 回帰でない（境界は超過に含めない）', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath)!;
      const report = await initCheck(initApp, 'nene-x', capOf(live.maxLines, live.maxBytes));
      expect(report.legacyManifestRegressions).toEqual([]);
      expect(report.legacyManifestShrinkable).toEqual([]);
    });

    it('cap を下回っていれば advisory（縮小可）— FAIL ではない', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath)!;
      const report = await initCheck(
        initApp,
        'nene-x',
        capOf(live.maxLines + 10, live.maxBytes + 10),
      );
      expect(report.legacyManifestRegressions).toEqual([]);
      expect(report.legacyManifestShrinkable).toHaveLength(1);
    });

    it('未登録ファイルは size-ratchet の対象外（unregisteredLegacyFiles の管轄）', async () => {
      const report = await initCheck(initApp, 'nene-x', EMPTY_REGISTRIES);
      expect(report.legacyManifestRegressions).toEqual([]);
      expect(report.unregisteredLegacyFiles).toEqual([legacyPath]);
    });

    it('🔴 行数は formattedLineCount で測る（raw wc -l ではない — #176 の単位ズレ）', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath)!;
      const raw = readFileSync(path.join(initApp, legacyPath), 'utf8');
      const rawLineCount = raw.split('\n').length;
      // 実測が raw 行数と一致してしまうと、raw で登録された cap との差が見えなくなる。
      // 尺度が違うことをテストで固定する（一致する場合はフィクスチャを空行入りに直すこと）。
      expect(live.maxLines).not.toBe(rawLineCount);
    });
  });

  // #176 --remeasure。**上げ方向が拒否される陽性対照を必ず持つ**（hub 受入条件 2026-07-30）。
  // この道具の唯一の危険は「cap を上げて超過を追認できてしまう」ことなので、そこを負テストで塞ぐ。
  describe('init --remeasure（既存 cap の引き下げ専用・#176）', () => {
    const legacyPath = 'src/legacy-styles.css';
    const capOf = (maxLines: number, maxBytes: number): ReturnType<typeof registriesWith> =>
      registriesWith([
        {
          kind: 'legacy-manifest',
          id: 'x-legacy',
          repo: 'nene-x',
          path: legacyPath,
          maxLines,
          maxBytes,
        },
      ]);
    const capIn = (result: { entries: unknown[] }): { maxLines: number; maxBytes: number } => {
      const e = (result.entries as Array<Record<string, unknown>>).find(
        (x) => x['kind'] === 'legacy-manifest',
      );
      return { maxLines: e?.['maxLines'] as number, maxBytes: e?.['maxBytes'] as number };
    };

    it('cap が実測より大きい（drain 後）: 実測値へ引き下げる', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath)!;
      const r = await initRemeasure(
        initApp,
        'nene-x',
        capOf(live.maxLines + 50, live.maxBytes + 500),
      );
      expect(r.refused).toEqual([]);
      expect(r.lowered).toHaveLength(1);
      expect(capIn(r)).toEqual({ maxLines: live.maxLines, maxBytes: live.maxBytes });
    });

    it('🔴 陽性対照: 実測が cap を超えていたら更新を拒否する（cap を上げて追認しない）', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath)!;
      const r = await initRemeasure(initApp, 'nene-x', capOf(live.maxLines - 1, live.maxBytes - 1));
      expect(r.refused).toHaveLength(1);
      expect(r.lowered).toEqual([]);
      // 拒否時は現 cap が保持される＝出力を使っても cap は上がらない（二重の歯止め）
      expect(capIn(r)).toEqual({ maxLines: live.maxLines - 1, maxBytes: live.maxBytes - 1 });
    });

    it('🔴 陽性対照: 行だけ超過・byte だけ超過のどちらでも拒否する', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath)!;
      const linesOver = await initRemeasure(
        initApp,
        'nene-x',
        capOf(live.maxLines - 1, live.maxBytes + 500),
      );
      expect(linesOver.refused).toHaveLength(1);
      const bytesOver = await initRemeasure(
        initApp,
        'nene-x',
        capOf(live.maxLines + 50, live.maxBytes - 1),
      );
      expect(bytesOver.refused).toHaveLength(1);
    });

    it('cap ちょうど: 変更なし（lowered にも refused にも入らない）', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath)!;
      const r = await initRemeasure(initApp, 'nene-x', capOf(live.maxLines, live.maxBytes));
      expect(r.lowered).toEqual([]);
      expect(r.refused).toEqual([]);
    });

    it('台帳にあってファイルが無い＝台帳腐敗として報告（呼び出し側が中止する）', async () => {
      const r = await initRemeasure(
        initApp,
        'nene-x',
        registriesWith([
          {
            kind: 'legacy-manifest',
            id: 'x-gone',
            repo: 'nene-x',
            path: 'src/does-not-exist.css',
            maxLines: 10,
            maxBytes: 100,
          },
        ]),
      );
      expect(r.missing).toEqual(['src/does-not-exist.css']);
    });

    it('🔴 他 repo・他 kind には一切触らない（G-7 隔離・cap 専用）', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath)!;
      const mixed = registriesWith([
        {
          kind: 'legacy-manifest',
          id: 'other-legacy',
          repo: 'nene-other',
          path: legacyPath,
          maxLines: 1,
          maxBytes: 1,
        },
        { kind: 'components-allowlist', id: 'x-ca', repo: 'nene-x', classes: ['.keep'] },
        {
          kind: 'legacy-manifest',
          id: 'x-legacy',
          repo: 'nene-x',
          path: legacyPath,
          maxLines: live.maxLines + 50,
          maxBytes: live.maxBytes + 500,
        },
      ]);
      const r = await initRemeasure(initApp, 'nene-x', mixed);
      const entries = r.entries as Array<Record<string, unknown>>;
      // 他 repo の cap は 1/1 のまま（実測で上書きされていない）
      expect(entries.find((e) => e['id'] === 'other-legacy')).toMatchObject({
        maxLines: 1,
        maxBytes: 1,
      });
      // components-allowlist は素通し
      expect(entries.find((e) => e['id'] === 'x-ca')).toMatchObject({ classes: ['.keep'] });
      // 自 repo の cap だけが実測値へ
      expect(entries.find((e) => e['id'] === 'x-legacy')).toMatchObject({
        maxLines: live.maxLines,
        maxBytes: live.maxBytes,
      });
    });

    it('出力は registries-valid（貼れる正本形）', async () => {
      const scan = await initScan(initApp);
      const live = scan.legacyManifest.find((e) => e.path === legacyPath)!;
      const r = await initRemeasure(
        initApp,
        'nene-x',
        capOf(live.maxLines + 5, live.maxBytes + 50),
      );
      expect(
        validateRegistries(JSON.stringify({ schema: REGISTRIES_SCHEMA_ID, entries: r.entries })),
      ).toEqual([]);
    });
  });

  it('--check は登録済み components-allowlist を差し引いた未分類クラスを報告する（#65 — 全報告でなく差分）', async () => {
    const scan = await initScan(initApp); // .badge / .data-table
    const withOne = registriesWith([
      { kind: 'components-allowlist', id: 'x', repo: 'nene-x', classes: [scan.allowedClasses[0]!] },
    ]);
    const report = await initCheck(initApp, 'nene-x', withOne);
    expect(report.unregisteredClasses).toEqual(scan.allowedClasses.slice(1));
    expect(report.unregisteredClasses).not.toContain(scan.allowedClasses[0]);
  });
});

describe('runConformance（skeleton 全体 — CF-1〜4）', () => {
  it('出力は schema green・n/a なし・未配線キーは unknown(not-installed)', async () => {
    // B1: registries は per-repo（既定 cwd/registries.jsonc）。テストは中央 source を明示注入して
    // 従前どおり registries ロード済みで conformance を回す（同梱 fleet.jsonc は tarball 非同梱に）。
    const vector = await runConformance({
      cwd: checkApp,
      repo: 'nene-x',
      registriesPath: dir('../registries/fleet.jsonc'),
    });
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

describe('resolveInitRegistries — scan は不在=空で bootstrap 続行・check は不在=中止（#107）', () => {
  const tmp: string[] = [];
  afterAll(() => {
    for (const d of tmp) rmSync(d, { recursive: true, force: true });
  });
  const freshRepo = (): string => {
    const d = mkdtempSync(path.join(tmpdir(), 'nene2-boot-'));
    tmp.push(d);
    return d; // registries.jsonc 無し
  };

  it('scan: registries 不在 → 空 doc で生成へ進む（fresh repo bootstrap）', () => {
    const { registries } = resolveInitRegistries(undefined, freshRepo(), 'scan');
    expect(registries).toEqual({ schema: REGISTRIES_SCHEMA_ID, entries: [] });
  });

  it('check: registries 不在 → null（呼び出し側が exit 2・fail-closed 維持）', () => {
    const { registries } = resolveInitRegistries(undefined, freshRepo(), 'check');
    expect(registries).toBeNull();
  });

  it('scan: 在るが形式不正 → null（不在だけが空・fail-closed）', () => {
    const d = freshRepo();
    writeFileSync(path.join(d, 'registries.jsonc'), '{ not valid registries');
    const { registries } = resolveInitRegistries(undefined, d, 'scan');
    expect(registries).toBeNull();
  });
});
