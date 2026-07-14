/**
 * 静的色評価 — TK-04 閉文法は「静的に色値へ評価できて初めて WCAG AA CI 検査ができる」
 * ための実装可能性条件（規約 03 §3.4）。ここがその評価器。
 * fail-closed: 評価できない値は例外（＝validate はエラー終了）。
 */

/** oklch 色値（alpha 付き） */
export interface Oklch {
  /** 0..1 */
  l: number;
  /** チャンネル値そのまま（およそ 0..0.4） */
  c: number;
  /** deg（achromatic のとき NaN 可） */
  h: number;
  /** 0..1 */
  alpha: number;
}

export class ColorEvalError extends Error {}

const num = (s: string, what: string): number => {
  const v = Number(s);
  if (!Number.isFinite(v)) throw new ColorEvalError(`cannot parse ${what}: '${s}'`);
  return v;
};

/** `oklch(L C H [/ A])` リテラルのパース（L は % か 0..1 数値・H は deg 数値か none） */
export function parseOklchLiteral(text: string): Oklch {
  const m = /^oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)\s*(?:\/\s*([^\s)]+)\s*)?\)$/i.exec(
    text.trim(),
  );
  if (!m) throw new ColorEvalError(`not an oklch() literal: '${text}'`);
  const [, lRaw, cRaw, hRaw, aRaw] = m;
  const l = lRaw!.endsWith('%') ? num(lRaw!.slice(0, -1), 'L') / 100 : num(lRaw!, 'L');
  const c = cRaw!.endsWith('%') ? (num(cRaw!.slice(0, -1), 'C') / 100) * 0.4 : num(cRaw!, 'C');
  const h = hRaw === 'none' ? NaN : num(hRaw!, 'H');
  let alpha = 1;
  if (aRaw !== undefined) {
    alpha = aRaw.endsWith('%') ? num(aRaw.slice(0, -1), 'alpha') / 100 : num(aRaw, 'alpha');
  }
  return { l, c, h, alpha };
}

export const KEYWORD_COLORS: Record<string, Oklch> = {
  // 閉文法キーワード3語（AM-6）
  white: { l: 1, c: 0, h: NaN, alpha: 1 },
  black: { l: 0, c: 0, h: NaN, alpha: 1 },
  transparent: { l: 0, c: 0, h: NaN, alpha: 0 },
};

/**
 * color-mix(in oklch, A wA%, B wB%) — CSS Color 5 の premultiplied 補間。
 * 重み省略時は 50/50・片側指定時は残りが補完（正規化）。
 */
export function mixOklch(a: Oklch, wa: number, b: Oklch, wb: number): Oklch {
  const sum = wa + wb;
  if (sum <= 0) throw new ColorEvalError('color-mix weights sum to zero');
  const pa = wa / sum;
  const pb = wb / sum;
  const alpha = a.alpha * pa + b.alpha * pb;
  // premultiplied by alpha
  const fa = alpha === 0 ? 0 : (a.alpha * pa) / alpha;
  const fb = alpha === 0 ? 0 : (b.alpha * pb) / alpha;
  const l = a.l * fa + b.l * fb;
  const c = a.c * fa + b.c * fb;
  // hue: shorter-path interpolation, achromatic hue is powerless
  let h: number;
  const aH = Number.isNaN(a.h) || a.c === 0 ? null : a.h;
  const bH = Number.isNaN(b.h) || b.c === 0 ? null : b.h;
  if (aH === null && bH === null) h = NaN;
  else if (aH === null) h = bH!;
  else if (bH === null) h = aH;
  else {
    let d = ((bH - aH) % 360) + 0;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    h = aH + d * fb;
  }
  return { l, c, h, alpha };
}

/** oklch → linear sRGB（gamut 外はクランプ） */
export function oklchToLinearSrgb(color: Oklch): [number, number, number] {
  const hRad = Number.isNaN(color.h) ? 0 : (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(hRad);
  const b = color.c * Math.sin(hRad);
  const L = color.l;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [clamp(r), clamp(g), clamp(bl)];
}

/** WCAG 相対輝度（linear sRGB から） */
export function relativeLuminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.x コントラスト比。
 * fg に alpha があれば bg 上へ合成してから計算。bg が不透明でない場合は
 * 検査不能として例外（fail-closed — 合成前提は §9.10 未確定領域）。
 */
export function contrastRatio(fg: Oklch, bg: Oklch): number {
  if (bg.alpha < 1) {
    throw new ColorEvalError(
      'background color is not opaque — contrast is not statically checkable (fail-closed)',
    );
  }
  if (fg.alpha < 1) {
    // linear-light compositing over bg
    const [fr, fgc, fb] = oklchToLinearSrgb(fg);
    const [br, bgc, bb] = oklchToLinearSrgb(bg);
    const a = fg.alpha;
    const lum =
      0.2126 * (fr * a + br * (1 - a)) +
      0.7152 * (fgc * a + bgc * (1 - a)) +
      0.0722 * (fb * a + bb * (1 - a));
    const lumBg = relativeLuminance(bg);
    const [hi, lo] = lum > lumBg ? [lum, lumBg] : [lumBg, lum];
    return (hi + 0.05) / (lo + 0.05);
  }
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
