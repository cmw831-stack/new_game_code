// 规则引擎对外入口。核心不依赖 DOM、动画帧、网络或在线模型。

export * from './rules/types.ts';
export { createBattle, ValidationError, RULES_VERSION, DEFAULT_LIMITS, DEFAULT_RULES, V18_RULES, OPENING_QI_CAP, encounterOpeningQi, MAX_ARTS, MAX_CAPACITY } from './engine/setup.ts';
export type { ArtOverrides, BattleInput, FighterInput, EnemyInput } from './engine/setup.ts';
export { runRound, runBattle, peekIntent } from './engine/round.ts';
export type { BattleRun, DecisionSource } from './engine/round.ts';
export { compileArt, specProblems } from './content/components.ts';
export type { ArtSpec } from './content/components.ts';
export * from './content/catalog.ts';
