// 教学进度与授业：教学细则 V1.2 第一章（开场两门、其余逐项取得）、2.2 节（四种状态、授业去重、一次成果）、
// 2.3 节（失败不撤销、免费补课、退出引导不自动授予）、第三章（各课前置与成果）；组件细则 V1.2 7.2 节。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BATTLE_LESSONS } from '../src/teach/lessons.ts';
import {
  acquiredArts, completeLesson, editResearch, emptyProgress, enterLesson, LESSON_GRANT, lessonStatus, missingFor, openLessons, pageOpen, sanitizeProgress, type LessonId, type TeachingProgress,
} from '../src/teach/progress.ts';

const run = (ids: LessonId[], p: TeachingProgress = emptyProgress()) => ids.reduce((q, id) => completeLesson(enterLesson(q, id), id), p);

test('开场只有断势击与归息诀，没有改良权限与残页（教学细则第一章）', () => {
  const p = emptyProgress();
  assert.deepEqual(acquiredArts(p), ['break_strike', 'return_breath']);
  assert.deepEqual(editResearch(p), { mastered: [], library: [] });
  assert.equal(pageOpen(p), false);
});

test('四门武学按授业逐项取得：破势课→崩势追击，架招课→借力诀，调息课→叠寒剑，蓄震课→踏风步（2.2 节）', () => {
  let p = run(['teach_first_clash_v1']);
  assert.deepEqual(acquiredArts(p), ['break_strike', 'return_breath', 'break_chase']);
  p = run(['teach_guard_return_v1', 'teach_breath_v1', 'teach_resonance_v1'], p);
  assert.deepEqual(acquiredArts(p).sort(), ['borrow_force', 'break_chase', 'break_strike', 'cold_sword', 'return_breath', 'wind_step']);
});

test('授业只结算一次：重做、回看同一课不重复发放（2.2 节去重）', () => {
  const once = run(['teach_first_clash_v1']);
  const twice = run(['teach_first_clash_v1'], once);
  assert.deepEqual(twice.grants, ['grant_chase_intro_v1']);
  assert.equal(twice, once, '重复结算不产生新对象');
  assert.equal(lessonStatus(twice, 'teach_first_clash_v1'), 'granted');
});

test('前置未满足不能进入：寒霜连锁课要先取得叠寒与追击，不借给未学的奖励技能（第三章）', () => {
  assert.deepEqual(missingFor(emptyProgress(), 'teach_cold_chain_v1'), ['grant_cold_intro_v1', 'grant_chase_intro_v1']);
  assert.throws(() => enterLesson(emptyProgress(), 'teach_cold_chain_v1'));
  const p = run(['teach_first_clash_v1', 'teach_breath_v1']);
  assert.deepEqual(missingFor(p, 'teach_cold_chain_v1'), []);
});

test('单槽授业课要求已知断势与叠寒、确认过破势与蓄震课一轮；结算后精通断势、叠寒，组件库只有破势甲与连击乙（2.2 节、组件细则 7.2 节）', () => {
  const before = run(['teach_first_clash_v1', 'teach_breath_v1']);
  assert.deepEqual(missingFor(before, 'teach_edit_one_v1'), ['grant_step_intro_v1']);
  const p = run(['teach_resonance_v1', 'teach_edit_one_v1'], before);
  assert.deepEqual(editResearch(p), { mastered: ['break_strike', 'cold_sword'], library: ['A_break:甲', 'A_combo:乙'] });
});

test('版本对照课完成后开放卷首残页（2.2 节 grant_page_preface_v1）', () => {
  const p = run(['teach_first_clash_v1', 'teach_breath_v1', 'teach_resonance_v1', 'teach_edit_one_v1']);
  assert.equal(pageOpen(p), false);
  assert.equal(pageOpen(run(['teach_compare_versions_v1'], p)), true);
});

test('只进入不完成，不授予任何东西（2.3 节：退出引导不自动授予）', () => {
  const p = enterLesson(emptyProgress(), 'teach_first_clash_v1');
  assert.equal(lessonStatus(p, 'teach_first_clash_v1'), 'inProgress');
  assert.deepEqual(p.grants, []);
  assert.deepEqual(acquiredArts(p), ['break_strike', 'return_breath']);
});

test('免费补课列表：前置已满足且未完成的课（2.3 节）', () => {
  assert.deepEqual(openLessons(emptyProgress()), ['teach_intro_v1', 'teach_first_clash_v1', 'teach_guard_return_v1', 'teach_breath_v1']);
  const p = run(['teach_first_clash_v1', 'teach_breath_v1']);
  assert.ok(openLessons(p).includes('teach_cold_chain_v1'));
  assert.ok(!openLessons(p).includes('teach_first_clash_v1'));
});

test('读取存档：不认识的课程与授业被丢弃，不凭空授予', () => {
  const p = sanitizeProgress({ lessons: { teach_first_clash_v1: 'granted', teach_fake: 'granted', teach_breath_v1: 'weird' }, grants: ['grant_chase_intro_v1', 'grant_fake', 'grant_chase_intro_v1'] });
  assert.deepEqual(p, { lessons: { teach_first_clash_v1: 'granted' }, grants: ['grant_chase_intro_v1'] });
  assert.deepEqual(sanitizeProgress(null), emptyProgress());
});

test('战斗课定义与授业表一致', () => {
  for (const l of BATTLE_LESSONS) assert.equal(l.grant, LESSON_GRANT[l.id as LessonId], l.id);
});
