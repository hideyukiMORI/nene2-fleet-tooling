// arbitrary VARIANT（FC-1 blessed idiom）は許容・variant 下の arbitrary VALUE は検知（#142）
export function ArbitraryVariantProbe() {
  return (
    <div className="data-[tone=danger]:bg-danger-soft">
      <span className="[&:nth-child(2)]:w-4">variant は許容</span>
      <span className="hover:p-[17px]">value は検知</span>
    </div>
  );
}
