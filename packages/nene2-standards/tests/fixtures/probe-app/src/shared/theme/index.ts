// #130 プローブ: 登録テーマモジュール（会議R2⑥/R5 が唯一許している座席）。
// data-theme の付与・読み取りは**検知されてはいけない**。
// 一方、他の禁止（JP リテラル）は**ここでも検知される**べき＝1ルール丸ごと off にしていないことの確認。
export function applyTheme(theme: string): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function currentTheme(): string | null {
  return document.documentElement.getAttribute('data-theme');
}

export const BAD_LABEL = 'テーマ';
