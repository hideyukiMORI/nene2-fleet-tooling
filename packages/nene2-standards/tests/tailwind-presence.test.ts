/**
 * 非 Tailwind 艦での gate-integrity 偽陽性の回帰テスト（#163）。
 *
 * 事故形: canonical は `better-tailwindcss/no-unknown-classes` を武装して配るが、この検査器は
 * **Tailwind の実 entry を要求する**ので非 Tailwind 艦では検査不能（throw か偽陽性洪水）。
 * それを gate-integrity が「差異登録なき緩和」＝違反として報告していた
 * （concierge 照会・非 Tailwind は concierge/serve/corpus/suite の4艦＝fleet 実測）。
 *
 * **検査不能を違反として罰していた**のが本体なので、#178/#179（不在と off を差に数えない）と同じ類型。
 * 陽性対照 = Tailwind 依存を足すと同じルールが照合対象へ戻ること（＝検査が空振りしていない）。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { checkGateIntegrity, gateIntegrityScope, TAILWIND_DEPENDENT_RULES } from '../src/index.js';
import { detectTailwind } from '../src/checks/tailwind-presence.js';

const TW_RULE = TAILWIND_DEPENDENT_RULES[0]!;

let root: string;
/** 非 Tailwind 艦（依存に tailwindcss が無い） */
let plain: string;
/** Tailwind 艦（devDependencies に tailwindcss） */
let tw: string;
/** 依存が親（リポ直下）に宣言され、測るのは frontend/ の艦 */
let nested: string;

function ship(dir: string, manifest: object): void {
  mkdirSync(path.join(dir, 'src', 'features', 'probe'), { recursive: true });
  writeFileSync(path.join(dir, 'src', 'features', 'probe', 'file.tsx'), 'export const X = 1;\n');
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest, null, 2));
  // canonical を展開しない最小 config（＝ styling 段を採っていない非 Tailwind 艦の形）
  writeFileSync(path.join(dir, 'eslint.config.js'), 'export default [];\n');
}

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'nene2-tw-'));
  plain = path.join(root, 'plain');
  tw = path.join(root, 'tw');
  nested = path.join(root, 'nested');
  ship(plain, { name: 'plain', private: true, devDependencies: { eslint: '^9' } });
  ship(tw, { name: 'tw', private: true, devDependencies: { eslint: '^9', tailwindcss: '^4.1.0' } });
  // nested: frontend/ を測るが依存はリポ直下に宣言（フリートに実在する形）
  ship(path.join(nested, 'frontend'), { name: 'nested-frontend', private: true });
  writeFileSync(
    path.join(nested, 'package.json'),
    JSON.stringify({ name: 'nested', private: true, dependencies: { '@tailwindcss/vite': '^4' } }),
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('detectTailwind — 判定は依存の実測（艦の申告ではない）', () => {
  it('依存が無ければ非 Tailwind と判定する', () => {
    const r = detectTailwind(plain);
    expect(r.present).toBe(false);
    expect(r.reason).toContain('tailwindcss');
  });

  it('devDependencies の tailwindcss を拾う', () => {
    expect(detectTailwind(tw).present).toBe(true);
  });

  it('親1段（リポ直下）の @tailwindcss/* も拾う（frontend/ を測る艦の形）', () => {
    const r = detectTailwind(path.join(nested, 'frontend'));
    expect(r.present).toBe(true);
    expect(r.reason).toContain('@tailwindcss/vite');
  });

  it('package.json が見つからないときは「非 Tailwind と断定」ではなく判定不能を理由に出す', () => {
    const r = detectTailwind(path.join(root, 'does-not-exist'));
    expect(r.present).toBe(false);
    expect(r.reason).toContain('package.json が見つからない');
  });
});

describe('gateIntegrityScope — 何を見ていないかを機械可読に出す', () => {
  it('非 Tailwind 艦では Tailwind 依存ルールが対象外として並ぶ', () => {
    const scope = gateIntegrityScope(plain);
    expect(scope.excluded).toEqual([...TAILWIND_DEPENDENT_RULES]);
    expect(scope.reason).toContain('緩和ではない');
  });

  it('Tailwind 艦では対象外なし（＝全ルールが照合対象）', () => {
    expect(gateIntegrityScope(tw).excluded).toEqual([]);
  });
});

describe('checkGateIntegrity — 非 Tailwind 艦を「緩和」と報告しない', () => {
  it('非 Tailwind 艦の red 詳細に Tailwind 依存ルールが出ない（#163 本体）', async () => {
    const result = await checkGateIntegrity({ cwd: plain });
    // canonical を展開していない艦なので他のルールでは red になる（それは正しい報告）。
    expect(result.state).toBe('red');
    if (result.state === 'red') {
      // 注記自体が「緩和ではない」の語を含むので、**違反行の文言**で判定する
      const violated = (d: string): boolean =>
        d.includes(TW_RULE) && d.includes('差異登録なき緩和');
      expect(result.details.some(violated)).toBe(false);
      // 黙って飛ばさない: 対象外にした事実と根拠が details に出る
      expect(result.details.some((d) => d.includes('照合対象外') && d.includes(TW_RULE))).toBe(
        true,
      );
    }
  }, 60_000);

  it('🔴 陽性対照: Tailwind 依存を足すと同じルールが「緩和」として現れる（空振りでない）', async () => {
    const result = await checkGateIntegrity({ cwd: tw });
    expect(result.state).toBe('red');
    if (result.state === 'red') {
      const violated = (d: string): boolean =>
        d.includes(TW_RULE) && d.includes('差異登録なき緩和');
      expect(result.details.some(violated)).toBe(true);
      expect(result.details.some((d) => d.includes('照合対象外'))).toBe(false);
    }
  }, 60_000);
});
