// 首批六个公开词缀（敌人细则 V1.3 第 9.2 节，首轮提案，待验证）。
// 词缀只改公开参数：资源上限、开场资源与状态、状态阈值、基础出招威力（9.1 节）；不新增事件、不占容量、不付内力。

export interface Affix {
  id: string;
  name: string;
  /** 效果说明（界面显示）。 */
  text: string;
  /** 可用的敌人模板。 */
  templates: readonly string[];
}

const ALL_TEMPLATES = ['balanced', 'guard', 'resonance', 'swift', 'blade'];

export const AFFIXES: readonly Affix[] = [
  { id: 'AFX_COLD_BODY', name: '寒体', text: '冻结要 4 层寒意（冻结保护期间上限 3）；气血上限 −10%', templates: ALL_TEMPLATES },
  { id: 'AFX_IRON_GUARD', name: '铁衣', text: '架势上限 +4；崩溃后轮末只恢复到上限的 30%', templates: ALL_TEMPLATES },
  { id: 'AFX_HEAVY_HAND', name: '重手', text: '基础出招架势威力 +2、气血威力 −1', templates: ALL_TEMPLATES },
  { id: 'AFX_DEEP_QI', name: '厚气', text: '开场内力 +4（不超过上限）', templates: ALL_TEMPLATES },
  // “身轻”不用于疾步剑客，避免与其“不连续回补身法”的设计重叠（9.2 节）。
  { id: 'AFX_LIGHT_STEP', name: '身轻', text: '开场带一份身法准备，第 1 轮末到期；架势上限 −2', templates: ['balanced', 'guard', 'resonance', 'blade'] },
  { id: 'AFX_WEARY', name: '伤疲', text: '开场气血为上限的 70%', templates: ALL_TEMPLATES },
];

export const MAX_AFFIXES = 2;

export function findAffix(id: string): Affix | undefined {
  return AFFIXES.find((a) => a.id === id);
}
