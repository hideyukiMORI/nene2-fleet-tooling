// nene2/style-prop-css-vars-only プローブ
export function StylePropProbe({ dynamic }: { dynamic: string }) {
  return (
    <div>
      <div style={{ margin: '4px' }} /> {/* 非 CSS 変数キー → error */}
      <div style={{ '--x': '#ff0000' }} /> {/* リテラル色 → error */}
      <div style={{ '--x': dynamic }} /> {/* 非リテラル・注入器未登録 → error */}
      <div style={{ '--x': 'var(--color-accent)' }} /> {/* 唯一の許可形 → OK */}
    </div>
  );
}
