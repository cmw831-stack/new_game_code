// 十课教学中需要战斗的课：固定输入与完成判定。
// 依据：教学细则 V1.2 第 2.1 节（检查点）、2.2 节（授业条件）、第三章（各课固定开始状态与完成判定）。
// 完成判定只看实际发生的事实（事件），不看玩家点了哪个按钮；规则按当前版本（V1.9.1）结算。

import type { ArtSpec } from '../content/components.ts';
import { findEnemy } from '../content/catalog.ts';
import type { EnemyInput, FighterInput } from '../engine/setup.ts';
import type { BattleEvent, EnemyConfig, IntentItem, Stance } from '../rules/types.ts';

const item = (stance: Stance): IntentItem => ({ stance, disabled: [] });

/** 教学检查点只循环开场段落，不抽段落、不带词缀（2.1 节）。 */
function checkpoint(base: string, over: Partial<EnemyConfig>): EnemyConfig {
  const c = findEnemy(base)!;
  return { ...c, ...over, segments: over.segments ?? [c.segments[0]!], fixedSegment: true };
}

/** 2.1 节的四个检查点。数值是文档写定的教学快照，不随正式敌人配置变化。 */
export const FIXTURES = {
  /** 复用 balanced_tutorial：18／6／12，铁剑 4／4；出招接断势 → 架招 → 调息；只装断势击。 */
  intro_balanced: (): EnemyInput => ({ config: checkpoint('balanced_tutorial', { id: 'fixture_intro_balanced_v1', artIds: ['break_strike'] }) }),
  /** 同上，固定从第 2 项（架招）开始。 */
  breath_balanced: (): EnemyInput => ({ config: checkpoint('balanced_tutorial', { id: 'fixture_breath_balanced_v1', artIds: ['break_strike'] }), startItem: 1 }),
  /** 战斗规则 §11.1 的练习窗口：30／8／10，最大 30／20／10；铁剑 4／4；只做基础出招，无武学。 */
  cold_example: (): EnemyInput => ({
    config: checkpoint('balanced_tutorial', {
      id: 'fixture_cold_example_v1', name: '练习对手', hpMax: 30, qi: 8, qiMax: 20, postureMax: 10, artIds: [],
      segments: [{ id: 'A', name: '普通出招', items: [item('attack')] }],
    }),
  }),
  /** 复用 resonance_standard 的模板，但按 2.1 节写定为 32／8／20、铁剑 4／4；架招 → 普通出招 → 调息；归息优先于蓄震。 */
  resonance: (): EnemyInput => ({
    config: checkpoint('resonance_standard', {
      id: 'fixture_resonance_v1', hpMax: 32, qi: 8, qiMax: 20, postureMax: 20, artIds: ['return_breath', 'npc_resonance'], basePowerBonus: { hp: 0, posture: 0 },
      segments: [{ id: 'A', name: '蓄震', items: [item('guard'), item('attack'), item('breathe')] }],
    }),
  }),
};

const P = (hp: number, qi: number, posture: number, arts: FighterInput['arts']): FighterInput => ({
  hp, hpMax: 30, qi, qiMax: 20, posture, postureMax: 20, weaponId: 'iron_sword', arts, reserve: 0,
});

const has = (events: readonly BattleEvent[], pred: (e: BattleEvent) => boolean) => events.some(pred);
const basicContact = (events: readonly BattleEvent[]) => has(events, (e) => e.type === 'hit' && e.side === 'player' && e.art === null);

export interface BattleLesson {
  id: string;
  name: string;
  /** 本课授予的授业 ID；没有则为 null。 */
  grant: string | null;
  player: FighterInput;
  enemy: () => EnemyInput;
  /** 文档建议的姿态（只作提示）；按轮循环使用。 */
  recommended: Stance[];
  /** 完成判定：本课实例内到目前为止的全部事件。 */
  done: (events: readonly BattleEvent[]) => boolean;
  /** 完成判定的中文说明。 */
  goal: string;
}

export const BATTLE_LESSONS: BattleLesson[] = [
  {
    id: 'teach_first_clash_v1', name: '首战', grant: 'grant_chase_intro_v1',
    player: P(30, 20, 20, ['break_strike', 'return_breath']), enemy: FIXTURES.intro_balanced,
    recommended: ['attack'],
    goal: '实际完成一次基础接触，并用已有手段造成对方架势崩溃',
    done: (ev) => basicContact(ev) && has(ev, (e) => e.type === 'crash' && e.side === 'enemy'),
  },
  {
    id: 'teach_guard_return_v1', name: '架招与归息', grant: 'grant_counter_intro_v1',
    player: P(30, 10, 20, ['break_strike', 'return_breath']), enemy: FIXTURES.intro_balanced,
    recommended: ['guard'],
    goal: '实际格挡一次，并由归息诀真实回复内力',
    done: (ev) => has(ev, (e) => e.type === 'block' && e.side === 'player') && has(ev, (e) => e.type === 'qi' && e.side === 'player' && e.data.source === 'return_breath'),
  },
  {
    id: 'teach_breath_v1', name: '调息', grant: 'grant_cold_intro_v1',
    player: P(30, 4, 20, ['break_strike', 'return_breath']), enemy: FIXTURES.breath_balanced,
    recommended: ['breathe', 'attack'],
    goal: '同一课内出招与调息都真实执行过',
    done: (ev) => has(ev, (e) => e.type === 'basicAttack' && e.side === 'player') && has(ev, (e) => e.type === 'qi' && e.side === 'player' && e.data.source === 'breathe'),
  },
  {
    id: 'teach_cold_chain_v1', name: '寒霜连锁', grant: null,
    player: P(30, 8, 20, ['cold_sword', 'break_chase', 'return_breath']), enemy: FIXTURES.cold_example,
    recommended: ['attack'],
    goal: '实际发生冻结，并合法消费一次破绽',
    done: (ev) => has(ev, (e) => e.type === 'freeze' && e.side === 'enemy') && has(ev, (e) => e.type === 'openingConsumed' && e.side === 'player'),
  },
  {
    id: 'teach_resonance_v1', name: '蓄震', grant: 'grant_step_intro_v1',
    player: P(30, 10, 20, ['cold_sword', 'break_chase', 'return_breath']), enemy: FIXTURES.resonance,
    recommended: ['attack'],
    goal: '读过蓄震说明并完成一整轮',
    done: (ev) => has(ev, (e) => e.type === 'roundEnd' || e.type === 'battleEnd'),
  },
];

/** 卷首残页课的演练：断势 → 残页 → 归息，对 fixture_intro_balanced_v1；残页秘籍实际发动一次即完成。 */
export function pageLesson(page: ArtSpec): BattleLesson {
  return {
    id: 'teach_manuscript_page_v1', name: '卷首残页', grant: null,
    player: P(30, 20, 20, ['break_strike', page, 'return_breath']), enemy: FIXTURES.intro_balanced,
    recommended: ['attack'],
    goal: '补全的残页秘籍实际发动一次',
    done: (ev) => has(ev, (e) => e.type === 'cast' && e.side === 'player' && e.art === page.id),
  };
}

/** 版本对照课：A／B 各开独立实例，30／10／20，对 fixture_resonance_v1，相同优先级与首轮出招，完整一轮。 */
export function compareLessonInputs(original: FighterInput['arts'][number], revised: FighterInput['arts'][number]) {
  return {
    a: P(30, 10, 20, [original, 'return_breath']),
    b: P(30, 10, 20, [revised, 'return_breath']),
    enemy: FIXTURES.resonance,
    decisions: [{ stance: 'attack' as const }],
  };
}
