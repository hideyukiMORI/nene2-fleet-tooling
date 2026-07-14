// payout-shape: every class here is a legit theme utility emitted by the FSD canonical
// entry (src/shared/ui/theme/index.css). With the shipped default entryPoint 'src/index.css'
// these all became "unknown" false positives (payout#161: 218 件). With the canonical entry
// they are recognised — 0 false positives.
export function Panel() {
  return (
    <div className="bg-surface border-border px-inline-md py-stack-sm gap-inline-sm">
      panel
    </div>
  );
}
