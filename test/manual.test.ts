// 秘籍版本与实验存档：主计划 V1.9.1 9.1 节（稳定 ID、名称不承担身份、另存新版保留旧版）、9.3 节（失效保留原记录）；
// 教学细则 V1.2 3.1 节（保存不覆盖原书；同名不同版本；空名给默认名；长名提示调整）、第五章（导入错误状态）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle } from '../src/engine/setup.ts';
import { emptyArchive, exportArchive, importArchive, saveVersion, versionProblems, type LabArchive } from '../src/edit/manual.ts';
import { fillPage, PAGE_PREFACE } from '../src/edit/page.ts';
import { findTemplate, replaceSlot, type EditResearch } from '../src/edit/variant.ts';
import { player } from './helpers.ts';

const TAUGHT: EditResearch = { mastered: ['break_strike', 'cold_sword'], library: ['A_break:甲', 'A_combo:乙'] };
const cold = findTemplate('cold_sword')!;
const coldBreak = replaceSlot(cold, 'action', { id: 'A_break', tier: '甲' });
const gang = fillPage(PAGE_PREFACE, { modifier: { id: 'M_gang' } }, 'x', 'x').spec!;
const at = '2026-10-28T00:00:00Z';

function save(a: LabArchive, over: Partial<Parameters<typeof saveVersion>[1]> = {}) {
  const r = saveVersion(a, { name: '寒锋', source: { kind: 'template', templateId: 'cold_sword' }, spec: coldBreak, savedAt: at, ...over }, TAUGHT);
  if (!r.ok) throw new Error(r.problems.join('；'));
  return r;
}

test('保存改良版：得到稳定 ID 与版本 1，来源记为模板，原书不变（主计划 9.1 节）', () => {
  const r = save(emptyArchive());
  assert.equal(r.saved.spec.id, 'm1@v1');
  assert.equal(r.saved.manualId, 'm1');
  assert.equal(r.saved.version, 1);
  assert.deepEqual(r.saved.source, { kind: 'template', templateId: 'cold_sword' });
  assert.equal(findTemplate('cold_sword')!.action, 'A_combo', '原书不被覆盖');
});

test('另存为新版本：版本号递增，旧版本保留且不可修改（主计划 9.1 节）', () => {
  const a = save(emptyArchive()).archive;
  const b = save(a, { manualId: 'm1', name: '寒锋二', spec: replaceSlot(cold, 'modifier', { id: null }) }).archive;
  assert.deepEqual(b.versions.map((v) => v.spec.id), ['m1@v1', 'm1@v2']);
  assert.equal(a.versions.length, 1, '保存返回新存档，不改动旧存档');
  assert.throws(() => { (b.versions[0] as { name: string }).name = '改名'; }, TypeError, '已保存版本不可变');
});

test('名称不承担身份：同名的两门秘籍各有 ID；空名用默认名（教学细则 3.1 节）', () => {
  const a = save(emptyArchive()).archive;
  const b = save(a).archive;
  assert.deepEqual(b.versions.map((v) => [v.spec.id, v.name]), [['m1@v1', '寒锋'], ['m2@v1', '寒锋']]);
  assert.equal(save(emptyArchive(), { name: '  ' }).saved.name, '叠寒剑·改');
  assert.equal(save(emptyArchive(), { name: '', source: { kind: 'page', pageId: 'PAGE_PREFACE' }, spec: gang }).saved.name, '折锋');
});

test('长名提示调整，不保存（教学细则 3.1 节）', () => {
  const r = saveVersion(emptyArchive(), { name: '寒'.repeat(17), source: { kind: 'template', templateId: 'cold_sword' }, spec: coldBreak, savedAt: at }, TAUGHT);
  assert.equal(r.ok, false);
});

test('不合法的改良不能保存：两槽不同、未精通（组件细则第九章、7.1 节）', () => {
  const two = { ...coldBreak, recovery: 'R_qi' as const };
  assert.equal(saveVersion(emptyArchive(), { name: 'a', source: { kind: 'template', templateId: 'cold_sword' }, spec: two, savedAt: at }, TAUGHT).ok, false);
  assert.equal(saveVersion(emptyArchive(), { name: 'a', source: { kind: 'template', templateId: 'cold_sword' }, spec: coldBreak, savedAt: at }, { mastered: [], library: TAUGHT.library }).ok, false);
});

test('残页秘籍：补全后保存，来源记为残页；之后可在候选内重填另存新版本（组件细则 10.1 节第 3 条）', () => {
  const page = { kind: 'page' as const, pageId: 'PAGE_PREFACE' };
  const a = save(emptyArchive(), { name: '折锋·刚', source: page, spec: gang }).archive;
  const soft = fillPage(PAGE_PREFACE, { modifier: { id: 'M_soft' } }, 'x', 'x').spec!;
  const b = save(a, { manualId: 'm1', name: '折锋·柔', source: page, spec: soft }).archive;
  assert.deepEqual(b.versions.map((v) => [v.spec.id, v.spec.modifier]), [['m1@v1', 'M_gang'], ['m1@v2', 'M_soft']]);
  const cold = { ...gang, modifier: 'M_cold' as const };
  assert.equal(saveVersion(a, { manualId: 'm1', name: 'x', source: page, spec: cold, savedAt: at }, TAUGHT).ok, false, '寒劲不在候选里');
  assert.equal(saveVersion(a, { manualId: 'm1', name: 'x', source: { kind: 'template', templateId: 'cold_sword' }, spec: coldBreak, savedAt: at }, TAUGHT).ok, false, '新版本来源必须一致');
});

test('已保存版本可以按版本 ID 装备开打', () => {
  const v = save(emptyArchive()).saved;
  assert.deepEqual(versionProblems(v), []);
  const s = createBattle({ seed: 1, player: player([v.spec, 'return_breath']), enemy: { config: 'balanced_standard' } });
  assert.equal(s.player.arts[0]!.art.id, 'm1@v1');
  assert.equal(s.player.arts[0]!.art.cost, 4);
});

test('导出再导入得到相同存档（主计划 9.3 节导出能力）', () => {
  const a = save(save(emptyArchive()).archive, { name: '折锋', source: { kind: 'page', pageId: 'PAGE_PREFACE' }, spec: gang }).archive;
  const r = importArchive(exportArchive(a));
  assert.equal(r.ok, true);
  assert.deepEqual(r.ok && r.archive, a);
});

test('导入错误：不是 JSON、不是本作存档、字段缺失、ID 不一致都整份拒绝并说明原因（教学细则第五章）', () => {
  const good = JSON.parse(exportArchive(save(emptyArchive()).archive));
  const cases: [string, string][] = [
    ['{', '不是有效的 JSON'],
    [JSON.stringify({ format: 'other' }), '不是本作的实验存档'],
    [JSON.stringify({ ...good, schema: 2 }), '无法读取'],
    [JSON.stringify({ ...good, versions: [{ ...good.versions[0], spec: undefined }] }), '缺少必要字段'],
    [JSON.stringify({ ...good, versions: [{ ...good.versions[0], version: 2 }] }), '不一致'],
  ];
  for (const [text, reason] of cases) {
    const r = importArchive(text);
    assert.equal(r.ok, false, text);
    assert.ok(!r.ok && r.reason.includes(reason), `${text} → ${!r.ok && r.reason}`);
  }
});

test('导入的失效版本保留记录，并说明为什么不能装备（主计划 9.3 节）', () => {
  const good = JSON.parse(exportArchive(save(emptyArchive()).archive));
  const broken = { ...good.versions[0], contentVersion: 'design-v1.8', spec: { ...good.versions[0].spec, recovery: 'R_qi' } };
  const r = importArchive(JSON.stringify({ ...good, versions: [broken] }));
  assert.equal(r.ok, true);
  const problems = r.ok ? versionProblems(r.archive.versions[0]!) : [];
  assert.ok(problems.some((m) => m.includes('2 个槽不同')), problems.join('；'));
  assert.ok(problems.some((m) => m.includes('design-v1.8')), problems.join('；'));
});

test('教学进度随存档导出导入；没有这一项的旧存档视为未开始，伪造的授业被丢弃（教学细则 2.2 节）', () => {
  const a = { ...emptyArchive(), teaching: { lessons: { teach_first_clash_v1: 'granted' as const }, grants: ['grant_chase_intro_v1' as const] } };
  const r = importArchive(exportArchive(a));
  assert.deepEqual(r.ok && r.archive.teaching, a.teaching);
  const old = JSON.parse(exportArchive(emptyArchive()));
  delete old.teaching;
  const r2 = importArchive(JSON.stringify(old));
  assert.deepEqual(r2.ok && r2.archive.teaching, { lessons: {}, grants: [] });
  const forged = importArchive(JSON.stringify({ ...old, teaching: { lessons: {}, grants: ['grant_everything'] } }));
  assert.deepEqual(forged.ok && forged.archive.teaching.grants, []);
});
