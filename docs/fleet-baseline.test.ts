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

  it('発効済み: client ^1.1.0・tokens ^1.1.0・standards ^1.2.0（2026-07-18 publish landed で実在版追随・npm 公開実測 shasum standards 6b8fd027 / tokens e18befd5）・i18n ^0.1.0', () => {
    expect(baseline.packages['@hideyukimori/nene2-client']).toBe('^1.1.0');
    // tokens ^1.1.0: 2026-07-18 publish landed（写像表 v1 payout 分＋codemod ランナー同梱の最低版）。
    // npm latest=1.1.0・dist.shasum e18befd55354be6002b236859746ebcf89399b91（fleet-tooling 実測）。
    expect(baseline.packages['@hideyukimori/nene2-tokens']).toBe('^1.1.0');
    // standards ^1.2.0: 2026-07-18 publish landed（registries/fleet.jsonc 同梱・components-allowlist kind）。
    // npm latest=1.2.0・dist.shasum 6b8fd02714cdc9f52fc469c07bc71327a3d4071a（fleet-tooling 実測）。
    // #57 順序規範（publish→座席充填）どおり、publish 実在確認後にフロアを実在版へ追随。
    expect(baseline.packages['@hideyukimori/nene2-standards']).toBe('^1.2.0');
    // null（座席のみ）→ ^0.1.0。rc で出すと範囲が ^0.1.0-rc.1 になり、それは 0.1.0 も 0.1.1 も
    // 拾う（semver 実測）ため、版が進んでも全消費リポに prerelease 範囲が残り続ける（#44）
    expect(baseline.packages['@hideyukimori/nene2-i18n']).toBe('^0.1.0');
  });
});
