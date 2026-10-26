// 内容目录：十二门预设、敌方专用武学、兵器与敌人配置。
// 数据来源：docs/design 中的组件细则 V1.2 第六、十章，敌人细则 V1.2，成长经济细则 V1.4（策划书 V1.9）。

import type { ArtDef, EnemyConfig, IntentItem, Segment, Stance, Weapon } from '../rules/types.ts';
import { compileArt, type ArtSpec } from './components.ts';

export const CONTENT_VERSION = 'design-v1.9';

// ---------- 十二门预设（组件细则第六章） ----------

export const TEMPLATE_SPECS: ArtSpec[] = [
  { id: 'cold_sword', name: '叠寒剑', category: '外功', trigger: 'T_contact', action: 'A_combo', tier: '乙', modifier: 'M_cold', followup: null, recovery: null },
  { id: 'break_strike', name: '断势击', category: '外功', trigger: 'T_contact', action: 'A_break', tier: '甲', modifier: null, followup: null, recovery: null },
  { id: 'break_chase', name: '崩势追击', category: '外功', trigger: 'T_break', action: 'A_single', tier: '甲', modifier: 'M_gang', followup: null, recovery: 'R_qi' },
  { id: 'shadow_thrust', name: '逐影刺', category: '外功', trigger: 'T_status', triggerParam: 'freeze', action: 'A_combo', tier: '甲', modifier: null, followup: null, recovery: null },
  { id: 'return_breath', name: '归息诀', category: '内功', trigger: 'T_block', action: 'A_qi', tier: '乙', modifier: null, followup: null, recovery: null, perRound: true },
  { id: 'channel', name: '通脉诀', category: '内功', trigger: 'T_contact', action: 'A_qi', tier: '甲', modifier: null, followup: null, recovery: null, perRound: true },
  { id: 'gather_origin', name: '蓄元诀', category: '内功', trigger: 'T_break', action: 'A_qi', tier: '乙', modifier: null, followup: null, recovery: null, perRound: true },
  { id: 'nourish', name: '养元功', category: '内功', trigger: 'T_dodge', action: 'A_qi', tier: '乙', modifier: null, followup: null, recovery: 'R_posture', perRound: true },
  { id: 'wind_step', name: '踏风步', category: '身法', trigger: 'T_contact', action: 'A_step', modifier: null, followup: null, recovery: null, perRound: true },
  { id: 'turn_step', name: '回身步', category: '身法', trigger: 'T_block', action: 'A_step', modifier: null, followup: null, recovery: null, perRound: true },
  { id: 'borrow_force', name: '借力诀', category: '心法', trigger: 'T_block', action: 'A_counter', tier: '甲', modifier: null, followup: null, recovery: null },
  { id: 'guard_humble', name: '守拙诀', category: '心法', trigger: 'T_qi', triggerParam: 8, action: 'A_ward', modifier: null, followup: null, recovery: null, perRound: true },
];

/** 组件细则第六章列出的十二门总价，用于复算测试。 */
export const TEMPLATE_TOTALS: Record<string, { cost: number; capacity: number }> = {
  cold_sword: { cost: 5, capacity: 6 },
  break_strike: { cost: 3, capacity: 4 },
  break_chase: { cost: 3, capacity: 4 },
  shadow_thrust: { cost: 2, capacity: 3 },
  return_breath: { cost: 0, capacity: 2 },
  channel: { cost: 0, capacity: 2 },
  gather_origin: { cost: 0, capacity: 2 },
  nourish: { cost: 0, capacity: 3 },
  wind_step: { cost: 3, capacity: 3 },
  turn_step: { cost: 2, capacity: 3 },
  borrow_force: { cost: 3, capacity: 3 },
  guard_humble: { cost: 2, capacity: 3 },
};

/** 第一阶段先行六门（执行契约第一章）。 */
export const PHASE1_ARTS = ['cold_sword', 'break_strike', 'break_chase', 'return_breath', 'wind_step', 'borrow_force'];

// ---------- 手稿残页（组件细则第十章）：每种合法补法编成一门秘籍 ----------

export const PAGE_SPECS: ArtSpec[] = [
  { id: 'page_preface_gang', name: '折锋（刚）', category: '绝学', trigger: 'T_contact', action: 'A_single', tier: '乙', modifier: 'M_gang', followup: null, recovery: null },
  { id: 'page_preface_shock', name: '折锋（震）', category: '绝学', trigger: 'T_contact', action: 'A_single', tier: '乙', modifier: 'M_shock', followup: null, recovery: null },
  { id: 'page_preface_soft', name: '折锋（柔）', category: '绝学', trigger: 'T_contact', action: 'A_single', tier: '乙', modifier: 'M_soft', followup: null, recovery: null },
];

// ---------- 敌方专用武学（敌人细则第三章） ----------

const ENEMY_ARTS: ArtDef[] = [
  {
    id: 'npc_resonance', name: '蓄震诀', category: '敌方',
    trigger: { kind: 'multiContact', min: 2 },
    action: { kind: 'attack', type: 'resonance', hits: [{ hp: 0, posture: 0 }], swordOnly: false },
    modifier: null, followup: null, recovery: null, cost: 2, capacity: 4, perRound: false, resonancePerContact: 2,
  },
  {
    id: 'npc_heavy', name: '沉刃斩', category: '敌方',
    trigger: { kind: 'contact' },
    action: { kind: 'attack', type: 'heavy', hits: [{ hp: 12, posture: 6 }], swordOnly: false },
    modifier: null, followup: null, recovery: null, cost: 5, capacity: 5, perRound: false,
  },
  {
    id: 'npc_heavy_elite', name: '沉刃斩·论艺', category: '敌方',
    trigger: { kind: 'contact' },
    action: { kind: 'attack', type: 'heavy', hits: [{ hp: 14, posture: 8 }], swordOnly: false },
    modifier: null, followup: null, recovery: null, cost: 6, capacity: 6, perRound: false,
  },
];

const ART_INDEX = new Map<string, ArtDef>();
for (const spec of [...TEMPLATE_SPECS, ...PAGE_SPECS]) ART_INDEX.set(spec.id, compileArt(spec));
for (const art of ENEMY_ARTS) ART_INDEX.set(art.id, art);

export function findArt(id: string): ArtDef | undefined {
  const art = ART_INDEX.get(id);
  return art ? structuredClone(art) : undefined;
}

export function allArtIds(): string[] {
  return [...ART_INDEX.keys()];
}

// ---------- 兵器 ----------

const WEAPONS: Weapon[] = [
  { id: 'iron_sword', name: '铁剑', weaponClass: 'sword', base: { hp: 4, posture: 4 }, capacity: 0 },
  { id: 'iron_staff', name: '长柄铁棍', weaponClass: 'staff', base: { hp: 3, posture: 5 }, capacity: 0 },
  { id: 'iron_blade', name: '铁柄刀', weaponClass: 'blade', base: { hp: 6, posture: 2 }, capacity: 0 },
];

export function findWeapon(id: string): Weapon | undefined {
  const w = WEAPONS.find((x) => x.id === id);
  return w ? structuredClone(w) : undefined;
}

// ---------- 敌人配置（敌人细则第四章、8.2 节） ----------

function item(stance: Stance, disabled: string[] = []): IntentItem {
  return { stance, disabled };
}
function seg(id: string, name: string, items: IntentItem[]): Segment {
  return { id, name, items };
}

const ATK = 'attack', GRD = 'guard', BRT = 'breathe';

const ENEMIES: EnemyConfig[] = [
  {
    id: 'balanced_tutorial', templateId: 'balanced', name: '均衡武者（引导）',
    hpMax: 18, qi: 6, qiMax: 20, postureMax: 12, weaponId: 'iron_sword',
    artIds: ['break_strike'], fixedSegment: true,
    segments: [seg('A', '读节奏', [item(ATK), item(GRD), item(BRT)])],
  },
  {
    id: 'balanced_standard', templateId: 'balanced', name: '均衡武者',
    hpMax: 39, qi: 8, qiMax: 20, postureMax: 16, weaponId: 'iron_sword',
    artIds: ['return_breath', 'break_strike'], fixedSegment: false,
    segments: [
      seg('A', '读节奏', [item(ATK), item(GRD), item(BRT)]),
      seg('B', '抢攻', [item(ATK, ['break_strike']), item(ATK), item(BRT)]),
    ],
  },
  {
    id: 'guard_standard', templateId: 'guard', name: '高架势守卫',
    hpMax: 43, qi: 10, qiMax: 20, postureMax: 28, weaponId: 'iron_staff', basePowerBonus: { hp: 3, posture: 0 },
    artIds: ['return_breath', 'borrow_force', 'break_strike'], fixedSegment: false,
    segments: [
      seg('A', '守势', [item(GRD), item(ATK), item(BRT)]),
      seg('B', '先攻后守', [item(ATK), item(GRD), item(GRD), item(BRT)]),
    ],
  },
  {
    id: 'resonance_standard', templateId: 'resonance', name: '蓄震守卫',
    hpMax: 40, qi: 8, qiMax: 20, postureMax: 20, weaponId: 'iron_sword', basePowerBonus: { hp: 3, posture: 0 },
    artIds: ['return_breath', 'npc_resonance'], fixedSegment: false,
    segments: [
      seg('A', '蓄震', [item(GRD), item(ATK), item(BRT)]),
      seg('B', '久守', [item(ATK), item(GRD), item(GRD), item(BRT)]),
    ],
  },
  {
    id: 'swift_standard', templateId: 'swift', name: '疾步剑客',
    hpMax: 26, qi: 8, qiMax: 20, postureMax: 14, weaponId: 'iron_sword',
    artIds: ['nourish', 'wind_step', 'break_strike'], fixedSegment: false,
    segments: [
      seg('A', '疾步', [item(ATK, ['break_strike']), item(BRT, ['wind_step', 'break_strike']), item(ATK, ['wind_step'])]),
      seg('B', '后发', [
        item(BRT, ['wind_step', 'break_strike']), item(ATK, ['break_strike']),
        item(GRD, ['wind_step', 'break_strike']), item(ATK, ['wind_step']),
      ]),
    ],
  },
  {
    id: 'blade_standard', templateId: 'blade', name: '蓄力刀客',
    hpMax: 36, qi: 10, qiMax: 20, postureMax: 18, weaponId: 'iron_blade',
    artIds: ['channel', 'npc_heavy', 'break_chase'], fixedSegment: false,
    segments: [
      seg('A', '蓄势', [item(BRT, ['npc_heavy']), item(ATK), item(ATK, ['npc_heavy'])]),
      seg('B', '守后发力', [item(ATK, ['npc_heavy']), item(GRD), item(BRT, ['npc_heavy']), item(ATK)]),
    ],
  },
];

export function findEnemy(id: string): EnemyConfig | undefined {
  const e = ENEMIES.find((x) => x.id === id);
  return e ? structuredClone(e) : undefined;
}

export function allEnemyIds(): string[] {
  return ENEMIES.map((e) => e.id);
}
