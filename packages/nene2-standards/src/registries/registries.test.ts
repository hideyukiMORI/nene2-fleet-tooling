/**
 * registries スキーマ検査 — v1 発効時点の現物（fleet.jsonc）green＋故意 fail 両方向。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  ALL_KINDS,
  DEBT_KINDS,
  parseRegistries,
  REGISTRIES_SCHEMA_ID,
  stripJsonc,
  validateRegistries,
} from './schema.js';

const fleetPath = fileURLToPath(new URL('../../registries/fleet.jsonc', import.meta.url));
const fleetSource = readFileSync(fleetPath, 'utf8');

const NOW = new Date('2026-07-14T00:00:00Z');

function doc(entries: unknown[]): string {
  return JSON.stringify({ schema: REGISTRIES_SCHEMA_ID, entries });
}

describe('v1 発効時点の登録現物（fleet.jsonc）', () => {
  it('形式検査 green・パース可能', () => {
    expect(validateRegistries(fleetSource, NOW)).toEqual([]);
    const parsed = parseRegistries(fleetSource, NOW);
    expect(parsed.schema).toBe(REGISTRIES_SCHEMA_ID);
  });

  it('規約 README §5 の表と同型（恒久3・scoped-theme 3・injector 1・lint-baseline 2・経過措置2・waiver 0）', () => {
    const parsed = parseRegistries(fleetSource, NOW);
    const byKind = new Map<string, number>();
    for (const e of parsed.entries) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
    expect(byKind.get('authorized-divergence')).toBe(3);
    expect(byKind.get('scoped-theme')).toBe(3);
    expect(byKind.get('injector')).toBe(1);
    expect(byKind.get('lint-baseline')).toBe(2);
    expect(byKind.get('transition')).toBe(2);
    expect(byKind.get('waiver')).toBeUndefined();
  });

  it('経過措置2件（invoice seam / concierge widget）は transition・批准レビュー送りの注記付き', () => {
    const parsed = parseRegistries(fleetSource, NOW);
    const transitions = parsed.entries.filter((e) => e.kind === 'transition');
    expect(new Set(transitions.map((e) => e.repo))).toEqual(
      new Set(['nene-invoice', 'nene-concierge']),
    );
    expect(fleetSource).toContain('批准レビュー');
  });

  it('恒久差異は overrides 実行可能登録名を持つ（散文登録 MUST NOT — R1⑨）', () => {
    const parsed = parseRegistries(fleetSource, NOW);
    for (const e of parsed.entries) {
      if (e.kind === 'authorized-divergence') {
        expect(e.overrides).toMatch(/^nene2\.overrides\./);
      }
    }
  });
});

describe('故意 fail（fail-closed の両方向確認）', () => {
  it('スキーマ外 kind は FAIL', () => {
    const diags = validateRegistries(
      doc([{ kind: 'my-new-exception', id: 'x', repo: 'nene-x' }]),
      NOW,
    );
    expect(diags.some((d) => d.message.includes('スキーマ外'))).toBe(true);
  });

  it('authorized-divergence の reasonRef 欠落は FAIL（REG-4(a)）', () => {
    const diags = validateRegistries(
      doc([{ kind: 'authorized-divergence', id: 'x', repo: 'nene-x', review: 'r' }]),
      NOW,
    );
    expect(diags.some((d) => d.message.includes('reasonRef'))).toBe(true);
  });

  it('waiver の until >90日は FAIL（REG-4(b)）', () => {
    const diags = validateRegistries(
      doc([
        {
          kind: 'waiver',
          id: 'x',
          repo: 'nene-x',
          key: 'styling.utilities',
          issuedOn: '2026-07-14',
          until: '2026-11-01',
          reasonRef: 'issue:x#1',
        },
      ]),
      NOW,
    );
    expect(diags.some((d) => d.message.includes('90日'))).toBe(true);
  });

  it('waiver ≤90日は green・失効済みは FAIL 報告', () => {
    const ok = validateRegistries(
      doc([
        {
          kind: 'waiver',
          id: 'x',
          repo: 'nene-deal',
          key: 'styling.utilities',
          issuedOn: '2026-07-14',
          until: '2026-09-04',
          reasonRef: 'issue:deal#calm-design-decision',
        },
      ]),
      NOW,
    );
    expect(ok).toEqual([]);
    const expired = validateRegistries(
      doc([
        {
          kind: 'waiver',
          id: 'x',
          repo: 'nene-deal',
          key: 'styling.utilities',
          issuedOn: '2026-04-01',
          until: '2026-06-01',
          reasonRef: 'issue:deal#calm-design-decision',
        },
      ]),
      NOW,
    );
    expect(expired.some((d) => d.message.includes('失効'))).toBe(true);
  });

  it("legacy-manifest の maxLines/maxBytes 0 プレースホルダは FAIL（AM-25'）", () => {
    const diags = validateRegistries(
      doc([
        {
          kind: 'legacy-manifest',
          id: 'x',
          repo: 'nene-profile',
          path: 'src/shared/ui/profile-ds.css',
          maxLines: 2921,
          maxBytes: 0,
        },
      ]),
      NOW,
    );
    expect(diags.some((d) => d.message.includes('maxBytes'))).toBe(true);
  });

  it('id 重複・schema 不一致・パース不能は FAIL', () => {
    const dup = validateRegistries(
      doc([
        { kind: 'transition', id: 'x', repo: 'a', summary: 's', wave: 'W2a', reasonRef: 'r' },
        { kind: 'transition', id: 'x', repo: 'b', summary: 's', wave: 'W2b', reasonRef: 'r' },
      ]),
      NOW,
    );
    expect(dup.some((d) => d.message.includes('重複'))).toBe(true);
    expect(
      validateRegistries(JSON.stringify({ schema: 'nene2-registries/2', entries: [] }), NOW).length,
    ).toBeGreaterThan(0);
    expect(validateRegistries('{ broken', NOW)[0]?.message).toContain('パース不能');
  });
});

describe('stripJsonc', () => {
  it('コメント・末尾カンマを除去し、文字列中の // は保持する', () => {
    const src = `{
      // line comment
      "a": "http://example.com", /* block */
      "b": [1, 2,],
    }`;
    expect(JSON.parse(stripJsonc(src))).toEqual({ a: 'http://example.com', b: [1, 2] });
  });

  it('kind 列挙は 9種＋scoped-theme＋transition＋waiver＋components-allowlist', () => {
    expect(ALL_KINDS).toHaveLength(12);
    expect(ALL_KINDS).toContain('components-allowlist');
  });
});

describe('components-allowlist kind（#65 — DEBT・縮小単調）', () => {
  it('有効な components-allowlist エントリは green', () => {
    const ok = validateRegistries(
      doc([
        {
          kind: 'components-allowlist',
          id: 'vault-components',
          repo: 'nene-vault',
          classes: ['tbl', 'audit-row', 'rail-link'],
        },
      ]),
      NOW,
    );
    expect(ok).toEqual([]);
  });

  it('classes 欠落・空配列・非文字列要素は FAIL（fail-closed）', () => {
    for (const bad of [{}, { classes: [] }, { classes: ['ok', 3] }]) {
      const diags = validateRegistries(
        doc([{ kind: 'components-allowlist', id: 'x', repo: 'nene-x', ...bad }]),
        NOW,
      );
      expect(diags.some((d) => d.message.includes('classes'))).toBe(true);
    }
  });

  it('DEBT_KIND に含まれる（縮小単調の対象 — REG-3）', () => {
    expect(DEBT_KINDS).toContain('components-allowlist');
  });
});
