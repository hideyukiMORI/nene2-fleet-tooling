// styling 7セレクタのプローブ（features 位置）
export function StylingProbe({ kind }: { kind: string }) {
  document.body.setAttribute('data-theme', 'dark'); // data-theme 付与
  document.body.getAttribute('data-theme'); // data-theme 読み取り
  document.body.style.setProperty('--color-accent', 'red'); // setProperty
  document.createElement('style'); // style 要素注入
  const cls = `bg-${kind}-soft`; // 断片補間 — AM-13(iii)
  return (
    <div className="p-[17px]">
      <span className="dark:bg-surface">{cls}</span>
    </div>
  );
}
