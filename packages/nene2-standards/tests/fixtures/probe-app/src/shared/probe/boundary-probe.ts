// fsd zones プローブ: shared → features は下位→上位 import で MUST NOT（会議R1①）
import { probeValue } from '@/features/probe-slice';

export const boundaryProbe = probeValue;
