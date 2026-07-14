// testing 統合セレクタのプローブ（tests/** 位置）
import { vi } from 'vitest';

vi.mock('@/shared/api/client');

declare const screen: { getByTestId: (id: string) => unknown };
export const el = screen.getByTestId('probe');
