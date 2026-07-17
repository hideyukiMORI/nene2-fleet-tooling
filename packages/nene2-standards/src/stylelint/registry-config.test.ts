/**
 * #65 Piece 2 — stylelintConfigFor / stylelintConfigFromRegistries（台帳由来 secondary の合成）。
 * 4型（vault=allowlist / deal=legacy-manifest / payout=0 / 未登録=fail-closed）＋ G-7 隔離を固定。
 */
import { describe, expect, it } from 'vitest';

import { REGISTRIES_SCHEMA_ID, type RegistriesDocument } from '../registries/schema.js';
import config, { stylelintConfigFor, stylelintConfigFromRegistries } from './index.js';

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

describe('stylelintConfigFor — 同梱中央 registries を読む', () => {
  it('REG-2 登録済み（#65）: vault/invoice は allowlist・deal は legacy-manifest を焼いて返す', () => {
    const vault = stylelintConfigFor('nene-vault');
    const vaultRule = vault.rules?.['nene2/layer-components-allowlist'];
    expect(Array.isArray(vaultRule)).toBe(true);
    expect((vaultRule as [true, { allowedClasses: string[] }])[1].allowedClasses).toHaveLength(156);
    expect(vault.plugins).toEqual(config.plugins);

    const invoice = stylelintConfigFor('nene-invoice');
    const invoiceRule = invoice.rules?.['nene2/layer-components-allowlist'];
    expect((invoiceRule as [true, { allowedClasses: string[] }])[1].allowedClasses).toHaveLength(
      381,
    );

    const deal = stylelintConfigFor('nene-deal');
    expect(deal.rules?.['nene2/layer-legacy-manifest-only']).toEqual([
      true,
      { files: ['src/app/design/designs.css', 'src/app/design/styles.css'] },
    ]);
    // deal は components-allowlist 0 件＝base のまま（fail-closed）
    expect(deal.rules?.['nene2/layer-components-allowlist']).toBe(true);
  });

  it('未登録 repo は base（fail-closed）で返る・throw しない', () => {
    const r = stylelintConfigFor('nene-payout');
    expect(r.rules?.['nene2/layer-components-allowlist']).toBe(true);
    expect(r.rules?.['nene2/layer-legacy-manifest-only']).toBe(true);
    expect(r.plugins).toEqual(config.plugins);
  });
});
