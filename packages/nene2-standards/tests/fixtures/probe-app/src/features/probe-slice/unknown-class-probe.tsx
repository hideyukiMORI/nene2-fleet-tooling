// known-utility fast path プローブ（silent no-op — 会議R2⑥(B)）
export function UnknownClassProbe() {
  return <div className="bg-nonexistent-xyz">x</div>;
}
