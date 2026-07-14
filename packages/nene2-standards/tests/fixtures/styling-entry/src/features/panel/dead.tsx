// A genuinely dead class: not emitted by any theme. The known-utility detector must flag it
// even when the canonical entry is loaded (proves detection is live, not silenced).
export function Dead() {
  return <div className="zzz-not-a-real-class-xyz">dead</div>;
}
