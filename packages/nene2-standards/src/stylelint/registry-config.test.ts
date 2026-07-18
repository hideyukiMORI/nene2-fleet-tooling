/**
 * #65 Piece 2 — stylelintConfigFor / stylelintConfigFromRegistries（台帳由来 secondary の合成）。
 * 4型（vault=allowlist / deal=legacy-manifest / payout=0 / 未登録=fail-closed）＋ G-7 隔離を固定。
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  parseRegistries,
  REGISTRIES_SCHEMA_ID,
  type RegistriesDocument,
} from '../registries/schema.js';
import config, { stylelintConfigFor, stylelintConfigFromRegistries } from './index.js';

/** 中央 source fleet.jsonc（リポ内・tarball 非同梱）を repo でスライスした per-repo registry を temp に書く。 */
const centralSource = readFileSync(
  fileURLToPath(new URL('../../registries/fleet.jsonc', import.meta.url)),
  'utf8',
);
const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
  tmpDirs.length = 0;
});
function writeRepoRegistry(repo: string): string {
  const central = parseRegistries(centralSource);
  const entries = central.entries.filter((e) => e.repo === repo);
  const dir = mkdtempSync(path.join(tmpdir(), 'nene2-b1-'));
  tmpDirs.push(dir);
  const p = path.join(dir, 'registries.jsonc');
  writeFileSync(p, JSON.stringify({ schema: REGISTRIES_SCHEMA_ID, entries }, null, 2));
  return p;
}

function docOf(entries: RegistriesDocument['entries']): RegistriesDocument {
  return { schema: REGISTRIES_SCHEMA_ID, entries };
}

describe('stylelintConfigFromRegistries — 台帳由来 secondary の合成', () => {
  it('vault 型（components-allowlist）: allowedClasses を焼く（ソート済み）', () => {
    const r = stylelintConfigFromRegistries(
      docOf([
        {
          kind: 'components-allowlist',
          id: 'vault-c',
          repo: 'nene-vault',
          classes: ['tbl', 'audit-row', 'rail-link'],
        },
      ]),
      'nene-vault',
    );
    expect(r.rules?.['nene2/layer-components-allowlist']).toEqual([
      true,
      { allowedClasses: ['audit-row', 'rail-link', 'tbl'] },
    ]);
    // legacy-manifest は base のまま（fail-closed）
    expect(r.rules?.['nene2/layer-legacy-manifest-only']).toBe(true);
  });

  it('deal 型（legacy-manifest）: files を焼く・allowlist は base のまま', () => {
    const r = stylelintConfigFromRegistries(
      docOf([
        {
          kind: 'legacy-manifest',
          id: 'deal-s',
          repo: 'nene-deal',
          path: 'src/shared/ui/styles.css',
          maxLines: 100,
          maxBytes: 2000,
        },
        {
          kind: 'legacy-manifest',
          id: 'deal-d',
          repo: 'nene-deal',
          path: 'src/shared/ui/designs.css',
          maxLines: 200,
          maxBytes: 4000,
        },
      ]),
      'nene-deal',
    );
    expect(r.rules?.['nene2/layer-legacy-manifest-only']).toEqual([
      true,
      { files: ['src/shared/ui/designs.css', 'src/shared/ui/styles.css'] },
    ]);
    expect(r.rules?.['nene2/layer-components-allowlist']).toBe(true);
  });

  it('payout 型（エントリ0）・未登録 repo: base のまま＝fail-closed（G-6）', () => {
    for (const repo of ['nene-payout', 'nene-does-not-exist']) {
      const r = stylelintConfigFromRegistries(docOf([]), repo);
      expect(r.rules?.['nene2/layer-components-allowlist']).toBe(true);
      expect(r.rules?.['nene2/layer-legacy-manifest-only']).toBe(true);
    }
  });

  it('🔴 G-7 隔離: 他リポのエントリは焼かれない（repo で厳密フィルタ）', () => {
    const r = stylelintConfigFromRegistries(
      docOf([
        {
          kind: 'components-allowlist',
          id: 'vault-c',
          repo: 'nene-vault',
          classes: ['tbl'],
        },
      ]),
      'nene-invoice', // invoice には自分のエントリが無い
    );
    // invoice は vault の allowlist を借用しない＝base のまま
    expect(r.rules?.['nene2/layer-components-allowlist']).toBe(true);
  });

  it('base config の他ルール・overrides は保持する（rules を破壊しない）', () => {
    const r = stylelintConfigFromRegistries(
      docOf([{ kind: 'components-allowlist', id: 'x', repo: 'nene-vault', classes: ['a'] }]),
      'nene-vault',
    );
    expect(r.rules?.['color-no-hex']).toBe(true);
    expect(r.overrides).toEqual(config.overrides);
  });
});

describe('stylelintConfigFor — per-repo registries.jsonc を読む（P2-B1）', () => {
  it('REG-2 登録済み（#65）: vault/invoice は allowlist・deal は legacy-manifest を焼いて返す', () => {
    const vault = stylelintConfigFor('nene-vault', {
      registriesPath: writeRepoRegistry('nene-vault'),
    });
    const vaultRule = vault.rules?.['nene2/layer-components-allowlist'];
    expect(Array.isArray(vaultRule)).toBe(true);
    expect((vaultRule as [true, { allowedClasses: string[] }])[1].allowedClasses).toHaveLength(156);
    expect(vault.plugins).toEqual(config.plugins);

    const invoice = stylelintConfigFor('nene-invoice', {
      registriesPath: writeRepoRegistry('nene-invoice'),
    });
    const invoiceRule = invoice.rules?.['nene2/layer-components-allowlist'];
    expect((invoiceRule as [true, { allowedClasses: string[] }])[1].allowedClasses).toHaveLength(
      381,
    );

    const deal = stylelintConfigFor('nene-deal', {
      registriesPath: writeRepoRegistry('nene-deal'),
    });
    expect(deal.rules?.['nene2/layer-legacy-manifest-only']).toEqual([
      true,
      { files: ['src/app/design/designs.css', 'src/app/design/styles.css'] },
    ]);
    // deal は components-allowlist 0 件＝base のまま（fail-closed）
    expect(deal.rules?.['nene2/layer-components-allowlist']).toBe(true);
  });

  it('未登録 repo（空 registries.jsonc）は base（fail-closed）で返る・throw しない（F2 payout 型）', () => {
    const r = stylelintConfigFor('nene-payout', {
      registriesPath: writeRepoRegistry('nene-payout'),
    });
    expect(r.rules?.['nene2/layer-components-allowlist']).toBe(true);
    expect(r.rules?.['nene2/layer-legacy-manifest-only']).toBe(true);
    expect(r.plugins).toEqual(config.plugins);
  });

  it('registries.jsonc 不在 → loud error（silent fallback 廃止・F2）', () => {
    const missing = path.join(mkdtempSync(path.join(tmpdir(), 'nene2-b1-')), 'registries.jsonc');
    tmpDirs.push(path.dirname(missing));
    expect(() => stylelintConfigFor('nene-invoice', { registriesPath: missing })).toThrow(
      /見つからない/,
    );
  });

  it('別 repo のエントリが混じる → loud error（取り違え検出・B1 追加受入条件）', () => {
    // invoice を要求したのに vault の registry を渡す（cwd 取り違えの模擬）
    const vaultRegistry = writeRepoRegistry('nene-vault');
    expect(() => stylelintConfigFor('nene-invoice', { registriesPath: vaultRegistry })).toThrow(
      /別 repo/,
    );
  });
});

describe('lint-baseline (rule,file) grandfather の合成（P2-A2・#101）', () => {
  it('invoice 型（file 在り・語彙内 rule）: 当該 file の当該 rule を null 化する override を足す', () => {
    const r = stylelintConfigFromRegistries(
      docOf([
        {
          kind: 'lint-baseline',
          id: 'invoice-spec-index',
          repo: 'nene-invoice',
          rule: 'selector-max-specificity',
          file: 'src/shared/ui/theme/index.css',
          frozenCount: 149,
          initializedBy: 'init --scan',
        },
      ]),
      'nene-invoice',
    );
    const added = (r.overrides ?? []).filter((o) =>
      (o.files as string[])?.includes('src/shared/ui/theme/index.css'),
    );
    expect(added).toHaveLength(1);
    expect(added[0]?.rules?.['selector-max-specificity']).toBeNull();
    // base の rule 本体は不変（当該 file 以外では効く）
    expect(r.rules?.['selector-max-specificity']).toBe(config.rules?.['selector-max-specificity']);
    // base の overrides（themes/base.css）は保たれる
    expect((r.overrides ?? []).length).toBe((config.overrides ?? []).length + 1);
  });

  it('語彙内 rule なのに file 無し → loud error（黙ってスキップしない・hub 追加受入条件）', () => {
    expect(() =>
      stylelintConfigFromRegistries(
        docOf([
          {
            kind: 'lint-baseline',
            id: 'invoice-spec-nofile',
            repo: 'nene-invoice',
            rule: 'selector-max-specificity',
            frozenCount: 149,
            initializedBy: 'init --scan',
          },
        ]),
        'nene-invoice',
      ),
    ).toThrow(/file が無い/);
  });

  it('語彙外 rule（eslint JP-lint）は file 無しでも素通し（stylelint 合成に無関係・throw しない）', () => {
    const r = stylelintConfigFromRegistries(
      docOf([
        {
          kind: 'lint-baseline',
          id: 'concierge-jp',
          repo: 'nene-concierge',
          rule: 'no-restricted-syntax (noHardcodedJapanese)',
          frozenCount: null,
          initializedBy: 'init --scan',
        },
      ]),
      'nene-concierge',
    );
    // override は増えない（base のまま）
    expect((r.overrides ?? []).length).toBe((config.overrides ?? []).length);
  });
});
