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

  it('発効済みは nene2-client ^1.1.0 のみ・本リポ3パッケージは publish 前につき null（誠実性ガード: 未公開版を書かない — 記入は publish 成功後の別 PR）', () => {
    expect(baseline.packages['@hideyukimori/nene2-client']).toBe('^1.1.0');
    // ↓ tokens / standards の publish が成功したら、この期待値を実版数に更新する
    expect(baseline.packages['@hideyukimori/nene2-tokens']).toBeNull();
    expect(baseline.packages['@hideyukimori/nene2-standards']).toBeNull();
    expect(baseline.packages['@hideyukimori/nene2-i18n']).toBeNull();
  });
});
