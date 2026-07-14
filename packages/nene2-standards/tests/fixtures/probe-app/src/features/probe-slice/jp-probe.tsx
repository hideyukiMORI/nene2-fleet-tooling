// JP lint 3ノード プローブ6本（第4部 I18N-16・AI-19 の表そのまま）
export function JpProbe({ n }: { n: number }) {
  const s = '保存しました'; // 1: Literal
  const t = `合計 ${n} 件`; // 3: TemplateElement
  const memo = 'ﾒﾓ'; // 5: 半角カナ
  const shime = '締〆'; // 6: 〆
  return (
    <div>
      <p>保存しました</p> {/* 2: JSXText */}
      <button aria-label="閉じる">{[s, t, memo, shime].join('')}</button> {/* 4: 属性 Literal */}
    </div>
  );
}
