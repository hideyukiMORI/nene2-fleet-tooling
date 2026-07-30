// #118 プローブ: I18nProvider 実装（AM-18 が唯一許している座席）。
// ここでの lang 付与は**検知されてはいけない**（条文が許可している唯一の場所）。
// 一方、他の禁止（Intl 直呼び）は**ここでも検知される**べき＝1ルール丸ごと off にしていないことの確認。
export function syncLang(el: HTMLElement, locale: string): void {
  el.lang = locale;
}

export function badIntl(): string {
  return new Intl.NumberFormat('ja-JP').format(1);
}
