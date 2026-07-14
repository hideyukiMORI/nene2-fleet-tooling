// 正例プローブ（#19）: per-component import（@/shared/ui/<component>）は R1① の正 —
// no-restricted-imports が 1 件も出ないこと（patterns の gitignore 意味論で全滅した実事故の再発防止）
import { probeToken } from '@/shared/ui/probe';

export const allowedImportsProbe = probeToken;
