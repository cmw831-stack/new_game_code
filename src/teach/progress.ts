// 教学进度与授业记录。
// 依据：教学细则 V1.2 第 1 章（开场只有断势、归息，其余四门按来源逐项取得）、2.2 节（课题四种状态、授业去重、一次成果）、
// 2.3 节（失败保留已确认事实、免费补课、退出引导不自动授予）、第三章各课的前置与成果；组件细则 V1.2 7.2 节（教学先授破势甲、连击乙）。
// 全部是纯函数：结算返回新的进度对象，重复结算不改变结果。

import { STARTER_ART_IDS } from '../edit/loadout.ts';
import type { EditResearch } from '../edit/variant.ts';

export type LessonStatus = 'notStarted' | 'inProgress' | 'conditionMet' | 'granted';

export const LESSON_IDS = [
  'teach_intro_v1',
  'teach_first_clash_v1',
  'teach_guard_return_v1',
  'teach_breath_v1',
  'teach_cold_chain_v1',
  'teach_resonance_v1',
  'teach_edit_one_v1',
  'teach_compare_versions_v1',
  'teach_manuscript_page_v1',
] as const;
export type LessonId = (typeof LESSON_IDS)[number];

export type GrantId =
  | 'grant_chase_intro_v1'
  | 'grant_counter_intro_v1'
  | 'grant_cold_intro_v1'
  | 'grant_step_intro_v1'
  | 'grant_edit_intro_v1'
  | 'grant_page_preface_v1';

/** 每课完成后结算的授业（2.2 节）；没有授业的课只记完成。 */
export const LESSON_GRANT: Record<LessonId, GrantId | null> = {
  teach_intro_v1: null,
  teach_first_clash_v1: 'grant_chase_intro_v1',
  teach_guard_return_v1: 'grant_counter_intro_v1',
  teach_breath_v1: 'grant_cold_intro_v1',
  teach_cold_chain_v1: null,
  teach_resonance_v1: 'grant_step_intro_v1',
  teach_edit_one_v1: 'grant_edit_intro_v1',
  teach_compare_versions_v1: 'grant_page_preface_v1',
  teach_manuscript_page_v1: null,
};

/** 进入一课前需要已结算的授业（第三章“固定开始状态”与 2.2 节公开条件）。 */
export const LESSON_REQUIRES: Record<LessonId, readonly GrantId[]> = {
  teach_intro_v1: [],
  teach_first_clash_v1: [],
  teach_guard_return_v1: [],
  teach_breath_v1: [],
  // 装叠寒→崩势追击→归息：两门都要已取得，“不借给一门未学的奖励技能”。
  teach_cold_chain_v1: ['grant_cold_intro_v1', 'grant_chase_intro_v1'],
  teach_resonance_v1: ['grant_cold_intro_v1', 'grant_chase_intro_v1'],
  // 已知断势与叠寒，确认过真实破势事实和蓄震课一轮。
  teach_edit_one_v1: ['grant_cold_intro_v1', 'grant_chase_intro_v1', 'grant_step_intro_v1'],
  teach_compare_versions_v1: ['grant_edit_intro_v1'],
  teach_manuscript_page_v1: ['grant_page_preface_v1'],
};

/** 授业带来的武学（完整模板初识）。 */
const GRANT_ART: Partial<Record<GrantId, string>> = {
  grant_chase_intro_v1: 'break_chase',
  grant_counter_intro_v1: 'borrow_force',
  grant_cold_intro_v1: 'cold_sword',
  grant_step_intro_v1: 'wind_step',
};

export interface TeachingProgress {
  lessons: Partial<Record<LessonId, LessonStatus>>;
  /** 已结算的授业 ID（去重键）。 */
  grants: GrantId[];
}

export function emptyProgress(): TeachingProgress {
  return { lessons: {}, grants: [] };
}

export function lessonStatus(p: TeachingProgress, id: LessonId): LessonStatus {
  return p.lessons[id] ?? 'notStarted';
}

/** 缺哪些前置授业；空数组表示可以进入。 */
export function missingFor(p: TeachingProgress, id: LessonId): GrantId[] {
  return LESSON_REQUIRES[id].filter((g) => !p.grants.includes(g));
}

/** 进入一课：未开始的记为进行中；已完成的课可以随时回看或补做，状态不倒退。 */
export function enterLesson(p: TeachingProgress, id: LessonId): TeachingProgress {
  if (missingFor(p, id).length > 0) throw new Error(`${id} 前置未完成：${missingFor(p, id).join('、')}`);
  if (lessonStatus(p, id) !== 'notStarted') return p;
  return { ...p, lessons: { ...p.lessons, [id]: 'inProgress' } };
}

/**
 * 本课条件已由实际事实满足：记为完成，并一次性结算对应授业。
 * 已结算的授业不重复发放；之后战败、重试、回看都不撤销（2.2、2.3 节）。
 */
export function completeLesson(p: TeachingProgress, id: LessonId): TeachingProgress {
  if (missingFor(p, id).length > 0) throw new Error(`${id} 前置未完成`);
  const grant = LESSON_GRANT[id];
  const grants = grant && !p.grants.includes(grant) ? [...p.grants, grant] : p.grants;
  const status: LessonStatus = grant ? 'granted' : 'conditionMet';
  if (lessonStatus(p, id) === status && grants === p.grants) return p;
  return { lessons: { ...p.lessons, [id]: status }, grants };
}

/** 已取得的武学：开场两门，加授业得到的模板。 */
export function acquiredArts(p: TeachingProgress): string[] {
  return [...STARTER_ART_IDS, ...p.grants.flatMap((g) => (GRANT_ART[g] ? [GRANT_ART[g]!] : []))];
}

/** 改良权限：grant_edit_intro_v1 授断势、叠寒精通及破势甲、连击乙（组件细则 7.2 节“教学先授”）。 */
export function editResearch(p: TeachingProgress): EditResearch {
  return p.grants.includes('grant_edit_intro_v1')
    ? { mastered: ['break_strike', 'cold_sword'], library: ['A_break:甲', 'A_combo:乙'] }
    : { mastered: [], library: [] };
}

export function pageOpen(p: TeachingProgress): boolean {
  return p.grants.includes('grant_page_preface_v1');
}

/** 免费补课：前置已满足、尚未完成的课（2.3 节）。 */
export function openLessons(p: TeachingProgress): LessonId[] {
  return LESSON_IDS.filter((id) => missingFor(p, id).length === 0 && !['conditionMet', 'granted'].includes(lessonStatus(p, id)));
}

/** 读取存档里的进度；不认识的课或授业被丢弃，不凭空授予。 */
export function sanitizeProgress(raw: unknown): TeachingProgress {
  const r = raw as Partial<TeachingProgress> | null;
  const lessons: TeachingProgress['lessons'] = {};
  const statuses: LessonStatus[] = ['notStarted', 'inProgress', 'conditionMet', 'granted'];
  for (const id of LESSON_IDS) {
    const s = r?.lessons?.[id];
    if (s && statuses.includes(s)) lessons[id] = s;
  }
  const known = new Set<string>(Object.values(LESSON_GRANT).filter((g): g is GrantId => g !== null));
  const grants = [...new Set((Array.isArray(r?.grants) ? r!.grants : []).filter((g) => known.has(g)))] as GrantId[];
  return { lessons, grants };
}
