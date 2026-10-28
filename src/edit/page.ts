// 手稿残页：固定槽加带固定候选的空槽，补满并通过兼容检查后成为一门可装备的秘籍。
// 依据：组件细则 V1.2 第十章；教学细则 V1.2 第 4.2 节残页线框与 teach_manuscript_page_v1。
// Phase 2 只开放卷首残页·折锋；两张早期残页属于 Phase 4。

import { compileArt, specProblems, type ArtSpec } from '../content/components.ts';
import { componentKey, setSlot, SLOT_LABEL, SLOT_NAMES, slotValue, type SlotName, type SlotValue } from './variant.ts';

export interface ManuscriptPage {
  id: string;
  name: string;
  /** 补全后的秘籍类别。 */
  category: ArtSpec['category'];
  /** 五槽的写定内容；空槽处的值不使用。 */
  base: Omit<ArtSpec, 'id' | 'name' | 'category'>;
  /** 空槽及其固定候选（含“无”时写 { id: null }）。 */
  blanks: Partial<Record<SlotName, SlotValue[]>>;
}

/** 卷首残页·折锋（组件细则 V1.2 10.2 节）：接触起势、单击乙固定，劲力从刚、震、柔中选。 */
export const PAGE_PREFACE: ManuscriptPage = {
  id: 'PAGE_PREFACE',
  name: '卷首残页·折锋',
  category: '绝学',
  base: { trigger: 'T_contact', action: 'A_single', tier: '乙', modifier: null, followup: null, recovery: null },
  blanks: { modifier: [{ id: 'M_gang' }, { id: 'M_shock' }, { id: 'M_soft' }] },
};

export const PAGES: readonly ManuscriptPage[] = [PAGE_PREFACE];

export function findPage(id: string): ManuscriptPage | undefined {
  return PAGES.find((p) => p.id === id);
}

export type PageProblemKind = 'missing' | 'notCandidate' | 'fixedSlot' | 'incompatible';

export interface PageProblem {
  kind: PageProblemKind;
  slot?: SlotName;
  message: string;
}

export interface PageFill {
  ok: boolean;
  /** 填好的装配；只有 ok 时可以装备。 */
  spec: ArtSpec | null;
  cost: number | null;
  capacity: number | null;
  problems: PageProblem[];
}

/**
 * 按选择补全残页。空槽只能从本页候选中选，不读取全局组件库；固定槽不可替换；
 * 必须补满全部空槽。价格与普通组件相同，没有残页折扣。
 */
export function fillPage(page: ManuscriptPage, choices: Partial<Record<SlotName, SlotValue>>, id: string, name: string): PageFill {
  const problems: PageProblem[] = [];
  const spec: ArtSpec = { ...page.base, id, name, category: page.category };
  for (const slot of SLOT_NAMES) {
    const candidates = page.blanks[slot];
    const chosen = choices[slot];
    if (!candidates) {
      if (chosen && componentKey(slot, chosen) !== componentKey(slot, slotValue(spec, slot))) {
        problems.push({ kind: 'fixedSlot', slot, message: `${SLOT_LABEL[slot]}是写定的固定槽，不能替换` });
      }
      continue;
    }
    if (!chosen) {
      const names = candidates.map((c) => c.id ?? '无').join('、');
      problems.push({ kind: 'missing', slot, message: `${SLOT_LABEL[slot]}还空着，从本页候选中选一个：${names}` });
      continue;
    }
    if (!candidates.some((c) => componentKey(slot, c) === componentKey(slot, chosen))) {
      problems.push({ kind: 'notCandidate', slot, message: `${SLOT_LABEL[slot]}只能从本页候选中选，${componentKey(slot, chosen) ?? '无'}不在其中` });
      continue;
    }
    setSlot(spec, slot, chosen);
  }
  if (problems.length === 0) {
    for (const m of specProblems(spec)) problems.push({ kind: 'incompatible', message: m });
  }
  if (problems.length > 0) return { ok: false, spec: null, cost: null, capacity: null, problems };
  const art = compileArt(spec);
  return { ok: true, spec, cost: art.cost, capacity: art.capacity, problems };
}
