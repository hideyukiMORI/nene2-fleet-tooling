/**
 * fleet-baseline.json の腐敗防止テスト（docs/seam の仕様検査と同型の発想）。
 * 依存を増やさないため ajv は使わず、スキーマの制約を手で適用する
 * （スキーマ側の pattern をこのテストが読むので、二重定義にはならない）。
 */
import { readFileSync, readdirSync } from 'node:fs';
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

  it('発効済み: client ^1.1.0・tokens ^1.1.0・standards ^2.0.0・i18n ^0.3.0（2026-07-21 publish landed で実在版追随・npm 公開実測 shasum standards 20e4f3e0 / tokens e18befd5 / i18n 8c2e2b08）', () => {
    expect(baseline.packages['@hideyukimori/nene2-client']).toBe('^1.1.0');
    // tokens ^1.1.0: 2026-07-18 publish landed（写像表 v1 payout 分＋codemod ランナー同梱の最低版）。
    // npm latest=1.1.0・dist.shasum e18befd55354be6002b236859746ebcf89399b91（fleet-tooling 実測）。
    expect(baseline.packages['@hideyukimori/nene2-tokens']).toBe('^1.1.0');
    // standards ^2.1.1: 2026-07-22 publish landed（#142 arbitrary-VARIANT 誤検知修正＝FC-1
    // blessed idiom `data-[tone=x]:` を eslint⑤ が通すパッチ・#143/#145）。
    // npm latest=2.1.1・dist.shasum e7b2e4e794e79e4ce7f8f5a63a1d464d5346bbc5（hub 実測）。
    // BREAKING 2.0 系 caret ゆえ 1.x は拾わない（意図どおり）。
    // #57 順序規範（publish→座席充填）どおり、publish 実在確認後にフロアを実在版へ追随。
    expect(baseline.packages['@hideyukimori/nene2-standards']).toBe('^2.1.1');
    // i18n ^0.3.0: 2026-07-21 publish landed（runtime translator options＋/react I18nProvider＋
    // renderWithI18n＝runtime 昇格レーン W0b・#137/#138/#139）。npm latest=0.3.0・
    // dist.shasum 8c2e2b08c5e603117e941f99ceed3d696bf08cb6（fleet-tooling 実測）。
    // 0.x caret ゆえ ^0.3.0 = >=0.3.0 <0.4.0。#57 順序規範（publish→座席充填）どおり実在確認後に追随。
    expect(baseline.packages['@hideyukimori/nene2-i18n']).toBe('^0.3.0');
  });
});

/**
 * floor が「このリポが実際に切った版」を指しているか（#352）。
 *
 * 🔴 上のテスト群はスキーマの形しか見ていなかった。キー名の pattern と、値が caret range か
 * null か。**その range が実在する版を指しているかは、誰も検査していなかった。**
 * `^0.9.0`（未 publish）を書いても緑になる。baseline は艦が従う下限なので、実在しない版を
 * 指すと**全艦が install できない指示を受け取り、しかも CI は緑のまま**になる。
 *
 * baseline の5本のうち4本はこのリポのワークスペースなので、ネット無しで突き合わせられる。
 */
describe('floor が実在する版を指しているか（#352）', () => {
  const pkgs = readdirSync(new URL('../packages', import.meta.url))
    .map((d) => {
      try {
        return JSON.parse(
          readFileSync(new URL(`../packages/${d}/package.json`, import.meta.url), 'utf8'),
        ) as { name: string; version: string };
      } catch {
        return null;
      }
    })
    .filter((p): p is { name: string; version: string } => p !== null);

  /** `^1.2.3` の下限。依存を増やさないので手で比較する。 */
  const cmp = (a: string, b: string) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i += 1) if (pa[i] !== pb[i]) return (pa[i] ?? 0) - (pb[i] ?? 0);
    return 0;
  };

  it.each(pkgs.filter((p) => baseline.packages[p.name] != null))(
    '$name の floor は、このリポが切った版以下',
    ({ name, version }) => {
      const floor = baseline.packages[name]!.replace(/^\^/, '');
      // 🔴 floor > 切った版 ＝ baseline が「まだ存在しないもの」を全艦へ要求している。
      expect(
        cmp(floor, version),
        `baseline は ${name} に ${baseline.packages[name]} を要求しているが、` +
          `このリポが切った最新は ${version}。存在しない版を下限にすると、` +
          `艦は install できない指示を受け取り、CI はそれを緑で通す。`,
      ).toBeLessThanOrEqual(0);
    },
  );

  it('🔴 検査できないものを、緑に数えない', () => {
    // fail-closed（空虚合格禁止）。ワークスペース外のパッケージはこの方法では検査できないので、
    // 「検査できない」と明示する。⚠️ 新しい外部パッケージが baseline に増えたらここが落ちる。
    const external = Object.keys(baseline.packages).filter((n) => !pkgs.some((p) => p.name === n));
    expect(external, 'ワークスペース外＝この検査の射程外').toEqual(['@hideyukimori/nene2-client']);
  });

  it('⚠️ この検査が覆わないもの', () => {
    // 覆うのは「切った版より上を要求していないか」だけ。
    // 🔴 覆わない: publish を飛ばした版（0.5.0 は npm に無いが 0.11.0 以下なので通る）。
    //    ネット無しでは npm の実在を問えない。publish 実測は docs/publish.md の手順に残す。
    // 🔴 覆わない: 切った版が floor の caret 範囲を超えている状態（publish 前は正常）。
    //    ⇒ これを落とすと、マージから publish までの間ずっと CI が赤くなる。
    expect(true).toBe(true);
  });
});
