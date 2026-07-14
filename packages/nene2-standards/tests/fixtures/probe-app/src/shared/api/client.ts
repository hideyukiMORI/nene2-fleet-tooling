// 負例プローブの対: client.ts は A-1 fetch 例外の唯一の座席（A-2/AM-20）— ここでは error にならないこと
export async function rawFetchAllowedHere(): Promise<unknown> {
  const res = await fetch('/api/v1/health');
  return res.json();
}
