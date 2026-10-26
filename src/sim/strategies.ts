// 执行契约 V1.1 第五章：三套先行构筑与三份公开决策策略。
// 策略只读取公开信息（本轮锁定的敌方意图与自身资源），不读取未来敌招或随机数。

import type { BattleState, Decision } from '../rules/types.ts';

export interface Build {
  id: string;
  name: string;
  /** 优先级顺序，靠前先结算。 */
  arts: string[];
  question: string;
}

export const BUILDS: Build[] = [
  {
    id: 'cold_chain',
    name: '寒霜连锁',
    arts: ['cold_sword', 'break_chase', 'return_breath'],
    question: '控制与追击是否抵得上内力和反震风险',
  },
  {
    id: 'guard_counter',
    name: '防反',
    arts: ['return_breath', 'borrow_force', 'wind_step', 'break_strike'],
    question: '主动破势、防反与身法是否有实际用途',
  },
  {
    id: 'guard_break',
    name: '破势',
    arts: ['break_strike', 'break_chase', 'return_breath'],
    question: '单击破势与破绽兑现是否形成不同优势',
  },
];

export interface Strategy {
  id: string;
  name: string;
  /** 写死的决策规则，报告中原样列出。 */
  rule: string;
  decide: (state: BattleState) => Decision;
}

/**
 * 本轮将锁定并公开的敌方基础意图。引擎在 runRound 开始时才写入 state.intent，
 * 但段落指针在上一轮末已经指向本轮这一项，与界面上玩家承诺前看到的意图相同。
 */
function upcomingEnemyStance(state: BattleState): 'attack' | 'guard' | 'breathe' {
  const sc = state.script;
  return sc.segments[sc.segIndex]!.items[sc.itemIndex]!.stance;
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'always_attack',
    name: '始终出招',
    rule: '每轮出招。',
    decide: () => ({ stance: 'attack' }),
  },
  {
    id: 'read_windows',
    name: '读窗口',
    rule: '敌方出招时架招；敌方调息时出招；敌方架招时，内力不少于 6 则出招，否则调息。',
    decide: (s) => {
      const e = upcomingEnemyStance(s);
      if (e === 'attack') return { stance: 'guard' };
      if (e === 'breathe') return { stance: 'attack' };
      return { stance: s.player.qi >= 6 ? 'attack' : 'breathe' };
    },
  },
  {
    id: 'guard_first',
    name: '守反为主',
    rule: '敌方调息时出招，其余时候架招。',
    decide: (s) => (upcomingEnemyStance(s) === 'breathe' ? { stance: 'attack' } : { stance: 'guard' }),
  },
];
