/**
 * fleet-baseline.json の腐敗防止テスト（docs/seam の仕様検査と同型の発想）。
 * 依存を増やさないため ajv は使わず、スキーマの制約を手で適用する
 * （スキーマ側の pattern をこのテストが読むので、二重定義にはならない）。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const baseline = JSON.parse(
  readFileSync(new URL('../fleet-baseline.json', import.meta.url), 'utf8'),
) as { $schema: string; schemaVersion: number; packages: Record<string, string | null> };

const schema = JSON.parse(
  readFileSync(new URL('./fleet-baseline.schema.json', import.meta.url), 'utf8'),
) as {
  properties: {
    packages: { patternProperties: Record<string, { oneOf: [unknown, { pattern: string }] }> };
  };
};

const namePattern = new RegExp(
  Object.keys(schema.properties.packages.patternProperties)[0] ?? '$^',
);
const rangePattern = new RegExp(
  Object.values(schema.properties.packages.patternProperties)[0]?.oneOf[1].pattern ?? '$^',
);

describe('fleet-baseline.json', () => {
  it('スキーマの骨格に適合（schemaVersion 1・$schema 参照・packages 非空）', () => {
    expect(baseline.$schema).toBe('./docs/fleet-baseline.schema.json');
    expect(baseline.schemaVersion).toBe(1);
    expect(Object.keys(baseline.packages).length).toBeGreaterThan(0);
  });

  it('全キーが @hideyukimori/nene2-* 形・値は caret range か null（未発効）', () => {
    for (const [name, range] of Object.entries(baseline.packages)) {
      expect(name, `package name: ${name}`).toMatch(namePattern);
      if (range !== null) {
        expect(range, `${name} の版は caret range 固定形`).toMatch(rangePattern);
      }
    }
  });

  it('発効済み: client ^1.1.0・tokens/standards ^1.0.0（2026-07-14 npm 公開実測: 39/79 files）・i18n は骨格につき null', () => {
    expect(baseline.packages['@hideyukimori/nene2-client']).toBe('^1.1.0');
    expect(baseline.packages['@hideyukimori/nene2-tokens']).toBe('^1.0.0');
    expect(baseline.packages['@hideyukimori/nene2-standards']).toBe('^1.0.0');
    expect(baseline.packages['@hideyukimori/nene2-i18n']).toBeNull();
  });
});
