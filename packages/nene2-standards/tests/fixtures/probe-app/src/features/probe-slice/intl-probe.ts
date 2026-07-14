// I18N-13 / AM-18 プローブ
export function intlProbe(n: number): string {
  document.documentElement.lang = 'ja'; // lang 代入
  const f = new Intl.NumberFormat('ja-JP'); // Intl 直呼び
  return f.format(n) + n.toLocaleString(); // toLocaleString
}
