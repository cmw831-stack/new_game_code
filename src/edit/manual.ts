// 秘籍版本与实验存档。
// 依据：主计划 V1.9.1 9.1 节（稳定 ID、玩家名称、来源、版本号；名称不承担身份）、9.3 节（失效保留原记录、导出能力）；
// 教学细则 V1.2 3.1 节（保存不覆盖原书、同名不同版本、空名给默认名、长名提示调整）、第五章（导入错误状态）。
// 全部是纯函数：保存返回新的存档对象，旧版本不被修改。

import type { ArtSpec } from '../content/components.ts';
import { CONTENT_VERSION, findArt } from '../content/catalog.ts';
import { RULES_VERSION } from '../engine/setup.ts';
import { fillPage, findPage } from './page.ts';
import { checkVariant, findTemplate, SLOT_NAMES, slotValue, type EditResearch } from './variant.ts';

export type ManualSource = { kind: 'template'; templateId: string } | { kind: 'page'; pageId: string };

export interface ManualVersion {
  /** 同一门秘籍各版本共用的稳定 ID。 */
  manualId: string;
  version: number;
  name: string;
  source: ManualSource;
  /** 五槽装配；spec.id 即版本 ID（manualId@v版本号），作为武学 ID 装备。 */
  spec: ArtSpec;
  note: string;
  savedAt: string;
  rulesVersion: string;
  contentVersion: string;
}

export interface LabArchive {
  format: typeof ARCHIVE_FORMAT;
  schema: 1;
  nextManualNo: number;
  versions: readonly ManualVersion[];
}

export const ARCHIVE_FORMAT = 'wulin-lab-archive';
export const NAME_MAX = 16;

export function emptyArchive(): LabArchive {
  return { format: ARCHIVE_FORMAT, schema: 1, nextManualNo: 1, versions: [] };
}

export function versionId(manualId: string, version: number): string {
  return `${manualId}@v${version}`;
}

export function findVersion(archive: LabArchive, id: string): ManualVersion | undefined {
  return archive.versions.find((v) => v.spec.id === id);
}

export function sourceName(source: ManualSource): string {
  return source.kind === 'template' ? (findArt(source.templateId)?.name ?? source.templateId) : (findPage(source.pageId)?.name ?? source.pageId);
}

/** 空名时的默认名：改良版用“来源名·改”，残页秘籍用残页名。 */
export function defaultName(source: ManualSource): string {
  return source.kind === 'template' ? `${sourceName(source)}·改` : (findPage(source.pageId)?.name.split('·').at(-1) ?? sourceName(source));
}

/** 装配本身是否合法：组件兼容；改良版相对来源模板恰好一槽不同；残页秘籍只用本页候选且补满。不检查研究权限。 */
export function shapeProblems(source: ManualSource, spec: ArtSpec): string[] {
  if (source.kind === 'template') {
    const r = checkVariant(source.templateId, spec, { mastered: [source.templateId], library: allKeysOf(spec) });
    return r.problems.map((p) => p.message);
  }
  const page = findPage(source.pageId);
  if (!page) return [`未知残页：${source.pageId}`];
  // 把五槽全部当作“选择”交给 fillPage：固定槽被改过会报 fixedSlot，空槽不在候选会报 notCandidate。
  const choices = Object.fromEntries(SLOT_NAMES.map((s) => [s, slotValue(spec, s)]));
  return fillPage(page, choices, spec.id, spec.name).problems.map((p) => p.message);
}

/** 让 checkVariant 只检查形状：把草稿自身用到的组件视为已解锁。 */
function allKeysOf(spec: ArtSpec): string[] {
  return [`${spec.action}:${spec.tier ?? '甲'}`, spec.action, spec.trigger, `${spec.trigger}:${spec.triggerParam}`, spec.modifier, spec.followup, spec.recovery].filter((x): x is string => !!x);
}

export interface SaveInput {
  /** 另存为已有秘籍的新版本时给出；省略则新建一门秘籍。 */
  manualId?: string;
  name: string;
  source: ManualSource;
  /** 草稿装配；id 与 name 由保存时决定。 */
  spec: ArtSpec;
  note?: string;
  savedAt: string;
}

export type SaveResult = { ok: true; archive: LabArchive; saved: ManualVersion } | { ok: false; problems: string[] };

/**
 * 保存为不可变的新版本。改良版须满足研究权限（精通、组件已入库）；残页秘籍只看本页候选。
 * 同名允许；空名用默认名；名字超过 NAME_MAX 字提示调整。
 */
export function saveVersion(archive: LabArchive, input: SaveInput, research: EditResearch): SaveResult {
  const problems: string[] = [];
  const name = input.name.trim() || defaultName(input.source);
  if ([...name].length > NAME_MAX) problems.push(`名字最多 ${NAME_MAX} 个字，当前 ${[...name].length} 个`);

  let manualId: string;
  let version: number;
  let nextManualNo = archive.nextManualNo;
  if (input.manualId) {
    const family = archive.versions.filter((v) => v.manualId === input.manualId);
    if (family.length === 0) return { ok: false, problems: [`没有这门秘籍：${input.manualId}`] };
    if (JSON.stringify(family[0]!.source) !== JSON.stringify(input.source)) problems.push('新版本的来源必须与这门秘籍一致');
    manualId = input.manualId;
    version = Math.max(...family.map((v) => v.version)) + 1;
  } else {
    manualId = `m${nextManualNo}`;
    nextManualNo += 1;
    version = 1;
  }

  const spec: ArtSpec = { ...structuredClone(input.spec), id: versionId(manualId, version), name };
  if (input.source.kind === 'template') {
    const r = checkVariant(input.source.templateId, spec, research);
    problems.push(...r.problems.map((p) => p.message));
  } else {
    problems.push(...shapeProblems(input.source, spec));
  }
  if (problems.length > 0) return { ok: false, problems };

  const saved: ManualVersion = Object.freeze({
    manualId,
    version,
    name,
    source: structuredClone(input.source),
    spec,
    note: input.note?.trim() ?? '',
    savedAt: input.savedAt,
    rulesVersion: RULES_VERSION,
    contentVersion: CONTENT_VERSION,
  });
  return { ok: true, archive: { ...archive, nextManualNo, versions: [...archive.versions, saved] }, saved };
}

/** 一个已保存版本现在能否装备：规则或内容版本变化后重新检查，失效时给出原因但保留记录（主计划 9.3 节）。 */
export function versionProblems(v: ManualVersion): string[] {
  const problems = shapeProblems(v.source, v.spec);
  if (v.contentVersion !== CONTENT_VERSION) problems.push(`保存时的内容版本是 ${v.contentVersion}，现在是 ${CONTENT_VERSION}，数值可能已变`);
  return problems;
}

export function exportArchive(archive: LabArchive): string {
  return JSON.stringify(archive, null, 2);
}

export type ImportResult = { ok: true; archive: LabArchive } | { ok: false; reason: string };

/** 读取导出的存档。结构不对时整份拒绝、不替换现有存档；单个版本失效时保留，由 versionProblems 说明原因。 */
export function importArchive(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: '文件不是有效的 JSON' };
  }
  const a = data as Partial<LabArchive> | null;
  if (!a || typeof a !== 'object' || a.format !== ARCHIVE_FORMAT) return { ok: false, reason: '不是本作的实验存档' };
  if (a.schema !== 1) return { ok: false, reason: `存档格式版本 ${String(a.schema)} 无法读取` };
  if (!Array.isArray(a.versions) || !Number.isInteger(a.nextManualNo)) return { ok: false, reason: '存档内容不完整' };
  const seen = new Set<string>();
  for (const v of a.versions as ManualVersion[]) {
    const ok = v && typeof v.manualId === 'string' && Number.isInteger(v.version) && typeof v.name === 'string'
      && v.source && (v.source.kind === 'template' || v.source.kind === 'page') && v.spec && typeof v.spec === 'object';
    if (!ok) return { ok: false, reason: '存档中有一条秘籍记录缺少必要字段' };
    if (v.spec.id !== versionId(v.manualId, v.version)) return { ok: false, reason: `秘籍 ${v.name} 的版本 ID 与编号不一致` };
    if (seen.has(v.spec.id)) return { ok: false, reason: `秘籍版本 ${v.spec.id} 重复` };
    seen.add(v.spec.id);
    const no = Number(v.manualId.slice(1));
    if (!(no < a.nextManualNo!)) return { ok: false, reason: '存档的秘籍编号计数不一致' };
  }
  return { ok: true, archive: { format: ARCHIVE_FORMAT, schema: 1, nextManualNo: a.nextManualNo!, versions: (a.versions as ManualVersion[]).map((v) => Object.freeze(v)) } };
}

/** 模板改良草稿的来源模板（供界面显示原版对照）。 */
export function sourceTemplate(source: ManualSource): ArtSpec | undefined {
  return source.kind === 'template' ? findTemplate(source.templateId) : undefined;
}
