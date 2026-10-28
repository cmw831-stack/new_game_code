// 水墨方向的单字图标：只是表现，规则与文字说明不依赖它们（主计划 V1.9.1 11.1、11.3 节）。

import type { Stance } from '../../src/rules/types.ts';

export const STANCE_GLYPH: Record<Stance, string> = { attack: '攻', guard: '守', breathe: '息' };

/** 状态图标：护势、身法、寒意、冻结、冻结保护、破绽。 */
export const STATUS_GLYPH = { ward: '护', step: '身', cold: '寒', freeze: '冻', protect: '保', opening: '破' } as const;
