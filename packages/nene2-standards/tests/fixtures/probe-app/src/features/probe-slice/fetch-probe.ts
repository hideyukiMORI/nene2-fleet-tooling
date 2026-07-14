// A-1 プローブ（features 位置 — imports-slices の統合が api 断片を潰していないことの検査位置）
export async function fetchProbe(): Promise<void> {
  await fetch('/x'); // no-restricted-globals
  await window.fetch('/x'); // no-restricted-syntax
  await globalThis.fetch('/x'); // no-restricted-syntax
}
