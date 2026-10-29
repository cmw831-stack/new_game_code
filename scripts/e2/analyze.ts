// E2 汇总：读 .e2-tmp/full.jsonl（S1）与 .e2-tmp/stance.jsonl（S2），按 docs/engine/e2-solver.md 第三、四节计算，
// 写 docs/reports/e2-data.md 与 e2-data.json。用法：node scripts/e2/analyze.ts

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { AFFIXES } from '../../src/content/affixes.ts';
import { findArt } from '../../src/content/catalog.ts';
import { MATRIX_ENEMIES, SEEDS } from '../../src/sim/matrix.ts';
import { allConfigs, configId, neighbors, type BattleRecord } from '../../src/sim/e2.ts';
import { STANCES } from '../../src/sim/solver.ts';

const configs = allConfigs();
const ids = configs.map(configId);
const idx = new Map(ids.map((id, i) => [id, i]));
const NON_TEACHING = ['guard_standard', 'resonance_standard'];
const ENEMY_NAME: Record<string, string> = { balanced_standard: '均衡武者', guard_standard: '高架势守卫', resonance_standard: '蓄震守卫' };
const AFFIX_NAME: Record<string, string> = Object.fromEntries(AFFIXES.map((a) => [a.id, a.name]));
const STANCE_NAME = { attack: '出招', guard: '架招', breathe: '调息' } as const;
const label = (i: number): string => {
  const c = configs[i]!;
  return `${c.arts.map((a) => findArt(a)!.name).join('→') || '（空）'}，留力 ${c.reserve}`;
};
const pct = (a: number, b: number): string => (b === 0 ? '—' : `${((100 * a) / b).toFixed(1)}%`);

function load(file: string): BattleRecord[] {
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as BattleRecord) : [];
}

type Score = [number, number];
const better = (a: Score, b: Score): number => a[0] - b[0] || a[1] - b[1];

/** 每个（构筑，敌人）的成绩：胜场数、胜场剩余气血之和；policy 选最优或每轮出招。 */
function scores(rs: BattleRecord[], policy: 'opt' | 'attack'): Map<string, Score> {
  const m = new Map<string, Score>();
  for (const r of rs) {
    const k = `${r.config}|${r.enemy}`;
    const s = m.get(k) ?? [0, 0];
    const o = policy === 'opt' ? r : r.attack;
    if (o.tier === 'victory') { s[0] += 1; s[1] += o.hp; }
    m.set(k, s);
  }
  return m;
}

const out: string[] = ['# E2 全构筑穷举：原始数据', '', '由 `node scripts/e2/analyze.ts` 从 `.e2-tmp/` 的逐局记录生成，请勿手改。口径见 [e2-solver.md](../engine/e2-solver.md)。', ''];
const json: Record<string, unknown> = {};

// ---------- S1：H2 判定 ----------
const s1 = load('.e2-tmp/full.jsonl');
const expected = configs.length * MATRIX_ENEMIES.length * SEEDS.length;
out.push('## S1：含变招的最优打法（无词缀）', '', `局数：${s1.length}／${expected}${s1.length < expected ? '（未跑完，以下结论无效）' : ''}`, '');
if (s1.length > 0) {
  const opt = scores(s1, 'opt');
  const atk = scores(s1, 'attack');
  const get = (m: Map<string, Score>, c: number, e: string): Score => m.get(`${c}|${e}`) ?? [0, 0];
  const bestOf = (m: Map<string, Score>, e: string): Score => configs.reduce<Score>((b, _, c) => (better(get(m, c, e), b) > 0 ? get(m, c, e) : b), [-1, -1]);

  // 1. 万能解与被支配
  const top = Object.fromEntries(MATRIX_ENEMIES.map((e) => [e, bestOf(opt, e)]));
  const universal = configs.map((_, c) => c).filter((c) => MATRIX_ENEMIES.every((e) => get(opt, c, e)[0] === SEEDS.length && better(get(opt, c, e), top[e]!) >= 0));
  const dominated = configs.map((_, c) => c).filter((c) => configs.some((_, d) => d !== c
    && MATRIX_ENEMIES.every((e) => better(get(opt, d, e), get(opt, c, e)) >= 0)
    && MATRIX_ENEMIES.some((e) => better(get(opt, d, e), get(opt, c, e)) > 0)));
  out.push('### 判定 1：万能解', '', `**万能解：${universal.length} 种**${universal.length ? `（${universal.map(label).join('；')}）` : ''}。被支配的构筑：${dominated.length}／${configs.length}。`, '');
  out.push('| 敌人 | 最优打法最高成绩（胜场，剩余气血和） | 达到最高成绩的构筑 | 20 胜的构筑数 |', '| --- | --- | --- | ---: |');
  for (const e of MATRIX_ENEMIES) {
    const at = configs.map((_, c) => c).filter((c) => better(get(opt, c, e), top[e]!) === 0);
    out.push(`| ${ENEMY_NAME[e]} | ${top[e]![0]}，${top[e]![1]} | ${at.slice(0, 4).map(label).join('；')}${at.length > 4 ? ` 等 ${at.length} 种` : ''} | ${configs.filter((_, c) => get(opt, c, e)[0] === SEEDS.length).length} |`);
  }
  out.push('');

  // 2. 一直出招
  out.push('### 判定 2：“一直出招”是否最优', '', '| 敌人 | 每轮出招的最好成绩 | 最优打法的最好成绩 | 一直出招不是最优 | 最优能赢而每轮出招赢不了的局 |', '| --- | --- | --- | --- | ---: |');
  const notOptimal: Record<string, boolean> = {};
  for (const e of MATRIX_ENEMIES) {
    const a = bestOf(atk, e), o = bestOf(opt, e);
    notOptimal[e] = better(a, o) < 0;
    const rs = s1.filter((r) => r.enemy === e);
    const gap = rs.filter((r) => r.tier === 'victory' && r.attack.tier !== 'victory').length;
    out.push(`| ${ENEMY_NAME[e]} | ${a[0]} 胜，${a[1]} | ${o[0]} 胜，${o[1]} | ${notOptimal[e] ? '是' : '**否**'} | ${gap}／${rs.length}（${pct(gap, rs.length)}） |`);
  }
  out.push('');

  // 3. 改一处翻盘率
  const won = new Set(s1.filter((r) => r.tier === 'victory').map((r) => `${r.config}|${r.enemy}|${r.seed}`));
  const nb = configs.map((c) => neighbors(c).map((n) => idx.get(configId(n))!));
  const lost = s1.filter((r) => r.tier !== 'victory');
  const flip = lost.filter((r) => nb[r.config]!.some((n) => won.has(`${n}|${r.enemy}|${r.seed}`)));
  out.push('### 判定 3：改一处翻盘率', '', `**${flip.length}／${lost.length}（${pct(flip.length, lost.length)}）**（不含单槽改良，是下界）。`, '', '| 敌人 | 没赢的局 | 可翻盘 | 比例 |', '| --- | ---: | ---: | ---: |');
  for (const e of MATRIX_ENEMIES) {
    const l = lost.filter((r) => r.enemy === e).length, f = flip.filter((r) => r.enemy === e).length;
    out.push(`| ${ENEMY_NAME[e]} | ${l} | ${f} | ${pct(f, l)} |`);
  }
  out.push('');

  // 4. 姿态唯一最优、关键轮、变招
  const points = s1.flatMap((r) => r.points);
  const unique = Object.fromEntries(STANCES.map((x) => [x, points.filter((p) => p.unique === x).length]));
  out.push('### 判定 4：三种姿态的唯一最优局面', '', `局面（最优打法经过的决策点）：${points.length}。`, '', '| 姿态 | 唯一最优的局面 | 占比 | 是最优（含并列）的局面 |', '| --- | ---: | ---: | ---: |');
  for (const x of STANCES) out.push(`| ${STANCE_NAME[x]} | ${unique[x]} | ${pct(unique[x]!, points.length)} | ${points.filter((p) => p.best === x).length} |`);
  out.push(`| 没有唯一最优 | ${points.filter((p) => p.unique === null).length} | ${pct(points.filter((p) => p.unique === null).length, points.length)} | |`, '');
  const changeUse = s1.filter((r) => r.points.some((p) => p.change));
  const kinds = { pause: 0, priority: 0, reserve: 0 };
  for (const p of points) if (p.change) kinds[p.change] += 1;
  out.push('### 其他（不设门槛）', '',
    `- 最优打法用到变招的局：${changeUse.length}／${s1.length}；暂停 ${kinds.pause} 次、优先级 ${kinds.priority} 次、留力 ${kinds.reserve} 次。`,
    `- 30 轮未分胜负：${s1.filter((r) => r.tier === 'undecided').length} 局。`, '');

  const verdict = { universal: universal.length === 0, attack: NON_TEACHING.every((e) => notOptimal[e]), flip: flip.length >= 0.5 * lost.length, stances: STANCES.every((x) => unique[x]! >= 0.1 * points.length) };
  out.splice(4, 0, '## 判定一览', '', '| 项目 | 门槛 | 结果 |', '| --- | --- | --- |',
    `| 万能解 | 没有 | ${verdict.universal ? '通过' : '**未通过**'} |`,
    `| 一直出招 | 两类非教学敌人都不是最优 | ${verdict.attack ? '通过' : '**未通过**'} |`,
    `| 改一处翻盘率 | ≥ 50% | ${verdict.flip ? '通过' : '**未通过**'}（${pct(flip.length, lost.length)}） |`,
    `| 姿态唯一最优 | 三种各 ≥ 10% | ${verdict.stances ? '通过' : '**未通过**'}（${STANCES.map((x) => `${STANCE_NAME[x]} ${pct(unique[x]!, points.length)}`).join('、')}） |`, '');
  json.s1 = { battles: s1.length, verdict, universal: universal.map((c) => ids[c]), dominated: dominated.length, notOptimal, flip: [flip.length, lost.length], unique, points: points.length,
    scores: Object.fromEntries(MATRIX_ENEMIES.map((e) => [e, Object.fromEntries(configs.map((_, c) => [ids[c], { opt: get(opt, c, e), attack: get(atk, c, e) }]))])) };
}

// ---------- S2：词缀 ----------
const s2 = load('.e2-tmp/stance.jsonl');
const expected2 = expected * (AFFIXES.length + 1);
out.push('## S2：只选姿态的最优打法，无词缀与六个词缀（Q16）', '', `局数：${s2.length}／${expected2}${s2.length < expected2 ? '（未跑完，以下结论无效）' : ''}`, '');
if (s2.length > 0) {
  const rate = new Map<string, number>();
  for (const r of s2) if (r.tier === 'victory') { const k = `${r.affix ?? ''}|${r.config}|${r.enemy}`; rate.set(k, (rate.get(k) ?? 0) + 1); }
  const wr = (a: string, c: number, e: string): number => (rate.get(`${a}|${c}|${e}`) ?? 0) / SEEDS.length;
  out.push('| 词缀 | 改变题目（胜率降 ≥ 20 点的构筑×敌人） | 胜率升 ≥ 20 点的构筑×敌人 | 各敌人胜率 ≥ 80% 的构筑数（无词缀时） | 保留解法 |', '| --- | ---: | ---: | --- | --- |');
  const affixJson: Record<string, unknown> = {};
  for (const a of AFFIXES) {
    let down = 0, up = 0;
    for (const e of MATRIX_ENEMIES) for (let c = 0; c < configs.length; c++) {
      const d = wr(a.id, c, e) - wr('', c, e);
      if (d <= -0.2) down += 1;
      if (d >= 0.2) up += 1;
    }
    const solid = MATRIX_ENEMIES.map((e) => [configs.filter((_, c) => wr(a.id, c, e) >= 0.8).length, configs.filter((_, c) => wr('', c, e) >= 0.8).length]);
    const keeps = solid.every(([n]) => n! >= 2);
    out.push(`| ${AFFIX_NAME[a.id]} | ${down > 0 ? `是（${down}）` : '**否**'} | ${up} | ${MATRIX_ENEMIES.map((e, i) => `${ENEMY_NAME[e]} ${solid[i]![0]}（${solid[i]![1]}）`).join('；')} | ${keeps ? '是' : '**否**'} |`);
    affixJson[a.id] = { down, up, solid, keeps };
  }
  out.push('');
  const winPoints = s2.filter((r) => r.affix === null && r.tier === 'victory').flatMap((r) => r.points);
  const key = winPoints.filter((p) => p.key).length;
  out.push(`关键轮比例（无词缀，只选姿态）：最优打法获胜的局里，有一种姿态会把赢变成没赢的决策点 ${key}／${winPoints.length}（${pct(key, winPoints.length)}）。`, '');
  json.s2 = { battles: s2.length, affixes: affixJson, key: [key, winPoints.length] };
}

writeFileSync('docs/reports/e2-data.md', out.join('\n') + '\n', 'utf8');
writeFileSync('docs/reports/e2-data.json', JSON.stringify(json), 'utf8');
console.log(out.slice(0, 14).join('\n'));
