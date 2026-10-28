// 精通阶段的模板单槽替换（改良）。
// 依据：组件细则 V1.2 第 7.1–7.3 节（权限、全局组件库、编辑权限总表）、第八章（合法实例）、第九章（拒绝的组合）；
// 主计划 V1.9.1 3.3、3.7 节。改良版相对来源模板最多一个槽不同，沿用来源的剑类限制，按统一价表重新计价。

import { ACTIONS, compileArt, specProblems, type ArtSpec, type Tier } from '../content/components.ts';
import { TEMPLATE_SPECS } from '../content/catalog.ts';

export type SlotName = 'trigger' | 'action' | 'modifier' | 'followup' | 'recovery';

export const SLOT_NAMES: readonly SlotName[] = ['trigger', 'action', 'modifier', 'followup', 'recovery'];

export const SLOT_LABEL: Record<SlotName, string> = { trigger: '起势', action: '主招', modifier: '劲力', followup: '变化', recovery: '收势' };

/** 一个槽里放的东西：组件规则 ID 加参数档；劲力、变化、收势可为 null（中性“无”）。 */
export interface SlotValue {
  id: string | null;
  tier?: Tier;
  param?: number | 'cold2' | 'freeze';
}

/** 玩家的研究状态中与改良有关的部分。 */
export interface EditResearch {
  /** 已达到精通（或由教学授予精通权限）的模板 ID。 */
  mastered: readonly string[];
  /** 全局组件库：组件规则 ID＋参数档，见 componentKey。 */
  library: readonly string[];
}

/** 全局组件库条目的身份：“组件规则 ID＋参数档”（组件细则 7.3 节）。 */
export function componentKey(slot: SlotName, v: SlotValue): string | null {
  if (v.id === null) return null;
  if (slot === 'action' && ACTIONS[v.id as keyof typeof ACTIONS]?.tiers.乙) return `${v.id}:${v.tier ?? '甲'}`;
  if (slot === 'trigger' && v.param !== undefined) return `${v.id}:${v.param}`;
  return v.id;
}

export function slotValue(spec: ArtSpec, slot: SlotName): SlotValue {
  switch (slot) {
    case 'trigger': return spec.triggerParam === undefined ? { id: spec.trigger } : { id: spec.trigger, param: spec.triggerParam };
    case 'action': return { id: spec.action, tier: spec.tier ?? '甲' };
    case 'modifier': return { id: spec.modifier };
    case 'followup': return { id: spec.followup };
    case 'recovery': return { id: spec.recovery };
  }
}

function sameValue(slot: SlotName, a: SlotValue, b: SlotValue): boolean {
  return componentKey(slot, a) === componentKey(slot, b);
}

/** 两份装配有哪些槽不同。 */
export function slotDiff(a: ArtSpec, b: ArtSpec): SlotName[] {
  return SLOT_NAMES.filter((slot) => !sameValue(slot, slotValue(a, slot), slotValue(b, slot)));
}

export function findTemplate(id: string): ArtSpec | undefined {
  return TEMPLATE_SPECS.find((t) => t.id === id);
}

/** 模板本身是否带剑专用组件（主招或变化）。 */
function templateSwordOnly(t: ArtSpec): boolean {
  return ACTIONS[t.action].swordOnly || t.followup === 'F_freeze_combo' || (t.swordOnly ?? false);
}

/** 把一个槽的值写进装配（就地修改）。 */
export function setSlot(spec: ArtSpec, slot: SlotName, v: SlotValue): void {
  switch (slot) {
    case 'trigger':
      spec.trigger = v.id as ArtSpec['trigger'];
      if (v.param === undefined) delete spec.triggerParam;
      else spec.triggerParam = v.param;
      break;
    case 'action':
      spec.action = v.id as ArtSpec['action'];
      spec.tier = v.tier ?? '甲';
      break;
    case 'modifier': spec.modifier = v.id as ArtSpec['modifier']; break;
    case 'followup': spec.followup = v.id as ArtSpec['followup']; break;
    case 'recovery': spec.recovery = v.id as ArtSpec['recovery']; break;
  }
}

/** 从来源模板替换一个槽，得到改良草稿。草稿沿用来源的名称类别、每轮限次与剑类限制。 */
export function replaceSlot(source: ArtSpec, slot: SlotName, v: SlotValue, draftId = `${source.id}~draft`): ArtSpec {
  const draft: ArtSpec = { ...source, id: draftId };
  setSlot(draft, slot, v);
  if (templateSwordOnly(source)) draft.swordOnly = true;
  return draft;
}

export type VariantProblemKind = 'unknownSource' | 'notMastered' | 'noChange' | 'tooManySlots' | 'locked' | 'swordOnlyLost' | 'incompatible';

export interface VariantProblem {
  kind: VariantProblemKind;
  slot?: SlotName;
  message: string;
}

export interface VariantCheck {
  ok: boolean;
  /** 与来源模板不同的槽。 */
  changed: SlotName[];
  before: { cost: number; capacity: number };
  /** 草稿不兼容时为 null。 */
  after: { cost: number; capacity: number } | null;
  problems: VariantProblem[];
}

/**
 * 检查一份改良草稿：来源必须是已精通的预设模板；相对模板恰好一个槽不同；
 * 新放入的组件必须已在全局组件库（“无”不需要解锁）；剑类限制不能解除；组件之间必须兼容。
 */
export function checkVariant(sourceId: string, draft: ArtSpec, research: EditResearch): VariantCheck {
  const source = findTemplate(sourceId);
  if (!source) {
    return { ok: false, changed: [], before: { cost: 0, capacity: 0 }, after: null, problems: [{ kind: 'unknownSource', message: `只能从十二门预设模板改良：${sourceId} 不是模板` }] };
  }
  const base = compileArt(source);
  const problems: VariantProblem[] = [];
  if (!research.mastered.includes(source.id)) {
    problems.push({ kind: 'notMastered', message: `${source.name}尚未精通，不能做单槽替换` });
  }

  const changed = slotDiff(source, draft);
  if (changed.length === 0) problems.push({ kind: 'noChange', message: '与原版相同，没有替换任何一槽' });
  if (changed.length > 1) {
    problems.push({
      kind: 'tooManySlots',
      message: `相对${source.name}原版有 ${changed.length} 个槽不同（${changed.map((x) => SLOT_LABEL[x]).join('、')}）；精通只能改一个槽，先只改一处，或取得立篇权限后新建绝学`,
    });
  }

  const library = new Set(research.library);
  for (const slot of changed) {
    const key = componentKey(slot, slotValue(draft, slot));
    if (key !== null && !library.has(key)) {
      problems.push({ kind: 'locked', slot, message: `${SLOT_LABEL[slot]}组件 ${key} 尚未解锁，不在全局组件库中` });
    }
  }

  if (templateSwordOnly(source) && !draft.swordOnly && !ACTIONS[draft.action]?.swordOnly) {
    problems.push({ kind: 'swordOnlyLost', message: `${source.name}带剑类限制，改良版必须沿用` });
  }

  const incompatible = specProblems(draft);
  for (const m of incompatible) problems.push({ kind: 'incompatible', message: m });
  const after = incompatible.length === 0 ? (({ cost, capacity }) => ({ cost, capacity }))(compileArt(draft)) : null;

  return { ok: problems.length === 0, changed, before: { cost: base.cost, capacity: base.capacity }, after, problems };
}
