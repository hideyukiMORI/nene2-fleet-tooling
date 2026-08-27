import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * solid の文字コントラストを機械で守る（#487）。
 *
 * 🔴 この PR の初稿は、全 tone の前景に `--color-on-accent`（白）を載せて出そうとした。
 * `--color-warn` は中間輝度なので **3.48:1** ——AA(4.5:1) を割る。**契約は最初からこれを
 * 解いていた**: `--color-on-warn` は 2026-07-14 の凍結時から在る暗いブラウンで、載せると
 * **4.97:1**。⇒ 誤りは契約の値ではなく、契約を読まなかったこと。
 *
 * 🔑 だから「目視で確かめる」に回さない。**計算で決まるものは計算で止める。**
 * 目視が要るのは、計算では出ない側（並びの落ち着き・意匠の統一感）だけ。
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(here, '../../themes/default.css'), 'utf8');

/** `--x: var(--y);` を辿って oklch のリテラルに着地させる。 */
function resolve(name: string, depth = 0): string {
  if (depth > 8) throw new Error(`--${name}: var() の連鎖が深すぎる`);
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`--${name} がテーマに無い`);
  const v = m[1].trim();
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/);
  return ref ? resolve(ref[1], depth + 1) : v;
}

function srgb(oklch: string): [number, number, number] {
  const m = oklch.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`oklch として読めない: ${oklch}`);
  const L = Number(m[1]) / 100;
  const a = Number(m[2]) * Math.cos((Number(m[3]) * Math.PI) / 180);
  const b = Number(m[2]) * Math.sin((Number(m[3]) * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  return lin.map((x) => {
    const c = Math.max(0, Math.min(1, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  }) as [number, number, number];
}

const luminance = (c: [number, number, number]) => {
  const [r, g, b] = c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [la, lb] = [luminance(srgb(a)), luminance(srgb(b))];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** 🔑 tone は列挙せず、テーマのスロット名から導出する（型1: 列挙は列挙に無いものを緑にする）。 */
const TONES = [
  ...new Set(
    [...css.matchAll(/--color-x-slot-button-([a-z]+)-bg:/g)]
      .map((m) => m[1])
      .filter((t) => t !== 'outline'),
  ),
];

describe('Button solid の文字コントラスト（#487）', () => {
  it('導出した tone の集合が空でない（陽性対照）', () => {
    expect(TONES.length).toBeGreaterThanOrEqual(6);
  });

  it('陰性対照: 計算器が「落ちる組み合わせ」を実際に落とす', () => {
    // 白 on warn は AA を割る。これが 4.5 未満と出ないなら計算器を疑う。
    expect(contrast(resolve('color-warn'), resolve('color-on-accent'))).toBeLessThan(4.5);
  });

  it.each(TONES)('solid × %s の文字が AA(4.5:1) を満たす', (tone) => {
    const ratio = contrast(
      resolve(`color-x-slot-button-${tone}-bg`),
      resolve(`color-x-slot-button-${tone}-fg`),
    );
    expect(ratio, `solid×${tone} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TONES)('outline / bare / link × %s の文字が AA(4.5:1) を満たす', (tone) => {
    const ratio = contrast(
      resolve(`color-x-slot-button-${tone}-ink`),
      resolve('color-x-slot-button-outline-bg'),
    );
    expect(ratio, `ink×${tone} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});
