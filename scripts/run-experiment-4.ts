// 实验 4（M2.8）：用 M2 的改良与换装回答 V1.9.1 修订说明第四节的遗留问题。
// 问题 3：寒霜连锁打蓄震守卫，改一处能否赢？问题 1、2：破势走基础路线（均衡武者 → 高架势守卫）要 2 剂药、对高架势守卫过长。
// 起点为 V1.9.1 默认值；“改一处”只用实验室现有权限（LAB_RESEARCH 与先行六门）。数值调整只在内存中生效。用法：npm run experiment4

import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { compileArt, type ArtSpec } from '../src/content/components.ts';
import { findArt } from '../src/content/catalog.ts';
import { RULES_VERSION, type FighterInput } from '../src/engine/setup.ts';
import { checkLoadout, LAB_ART_IDS } from '../src/edit/loadout.ts';
import { findTemplate, replaceSlot } from '../src/edit/variant.ts';
import { BASELINE, runCell, SEEDS, type Variant } from '../src/sim/matrix.ts';
import { runRoute } from '../src/sim/route.ts';
import { BUILDS, CAUTIOUS, STRATEGIES, type Strategy } from '../src/sim/strategies.ts';

const ALL: Strategy[] = [...STRATEGIES, CAUTIOUS];
const ROUTE = ['balanced_standard', 'guard_standard'];
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const num = (x: number | null): string => (x === null ? '—' : x.toFixed(1));

type Arts = FighterInput['arts'];
interface Option { id: string; name: string; arts: Arts }

const name = (a: string | ArtSpec): string => (typeof a === 'string' ? findArt(a)!.name : a.name);
const capacity = (arts: Arts): number => arts.reduce((n, a) => n + (typeof a === 'string' ? findArt(a)!.capacity : compileArt(a).capacity), 0);

/** 实验室权限内的单槽改良（教学授业：断势、叠寒精通；组件库破势甲、连击乙；可选槽可设为无）。 */
const EDITS: { source: string; spec: ArtSpec }[] = [
  { source: 'cold_sword', spec: { ...replaceSlot(findTemplate('cold_sword')!, 'action', { id: 'A_break', tier: '甲' }, 'cold_break'), name: '叠寒剑·破势' } },
  { source: 'cold_sword', spec: { ...replaceSlot(findTemplate('cold_sword')!, 'modifier', { id: null }, 'cold_plain'), name: '叠寒剑·无劲' } },
  { source: 'break_strike', spec: { ...replaceSlot(findTemplate('break_strike')!, 'action', { id: 'A_combo', tier: '乙' }, 'break_combo'), name: '断势击·连击' } },
];

/** 从一套构筑出发“改一处”：把一位换成改良版或另一门先行武学，或在空位加一门；只保留容量合法的。 */
function oneChange(base: string[]): Option[] {
  const out: Option[] = [{ id: 'base', name: '原样', arts: base }];
  base.forEach((id, i) => {
    for (const e of EDITS.filter((x) => x.source === id)) {
      out.push({ id: `${e.spec.id}@${i}`, name: `${name(id)} → ${e.spec.name}`, arts: base.map((x, j) => (j === i ? e.spec : x)) });
    }
    for (const other of LAB_ART_IDS) {
      if (base.includes(other)) continue;
      out.push({ id: `${other}@${i}`, name: `${name(id)} → ${name(other)}`, arts: base.map((x, j) => (j === i ? other : x)) });
    }
  });
  if (base.length < 4) for (const other of LAB_ART_IDS) if (!base.includes(other)) out.push({ id: `+${other}`, name: `加 ${name(other)}`, arts: [...base, other] });
  return out.filter((o) => checkLoadout({ arts: o.arts.map((a) => (typeof a === 'string' ? a : a.id)), weaponId: 'iron_sword', acquired: LAB_ART_IDS, custom: o.arts.filter((a): a is ArtSpec => typeof a !== 'string').map(compileArt) }).ok);
}

const lines: string[] = [];
const json: Record<string, unknown> = { commit, rules: RULES_VERSION, seeds: SEEDS };
lines.push('# Phase 2 实验 4：M2 改良与换装验证（原始数据）', '');
lines.push(`由 \`npm run experiment4\` 自动生成，请勿手改。规则 ${RULES_VERSION}，代码提交 ${commit}。种子 ${SEEDS[0]}–${SEEDS.at(-1)}，每格 20 场。起点为 V1.9.1 默认值。`, '');
lines.push(`打法：${ALL.map((s) => `${s.name}（${s.rule}）`).join('；')}`, '');
lines.push(`“改一处”的范围：把一位换成实验室权限内的单槽改良（${EDITS.map((e) => e.spec.name).join('、')}）或另一门先行武学，或在空位加一门；只保留四武学位、容量 12 内的合法构筑。`, '');

// ---------- 问题 3：寒霜连锁 × 蓄震守卫 ----------
const cold = BUILDS.find((b) => b.id === 'cold_chain')!;
lines.push('## 一、寒霜连锁打蓄震守卫：改一处', '');
lines.push('| 改动 | 容量 | 始终出招 | 读窗口 | 守反为主 | 谨慎读窗口 | 最好打法的胜场平均轮数／剩余气血 |');
lines.push('| --- | ---: | ---: | ---: | ---: | ---: | --- |');
const q3: unknown[] = [];
for (const o of oneChange(cold.arts)) {
  const cells = ALL.map((s) => runCell({ id: o.id, arts: o.arts }, 'resonance_standard', s));
  const best = cells.reduce((a, b) => (b.winRate > a.winRate ? b : a));
  lines.push(`| ${o.name} | ${capacity(o.arts)} | ${cells.map((c) => pct(c.winRate)).join(' | ')} | ${num(best.avgRoundsWin)}／${num(best.avgHpEndWin)} |`);
  q3.push({ option: o.id, name: o.name, winRates: Object.fromEntries(cells.map((c) => [c.strategy, c.winRate])) });
}
json.q3 = q3;
lines.push('');

// ---------- 问题 1、2：破势走基础路线 ----------
const brk = BUILDS.find((b) => b.id === 'guard_break')!;
lines.push('## 二、破势走基础路线：改一处', '');
lines.push('两战：节点 1 均衡武者 → 节点 3 用药（每剂 +12，满为止）→ 节点 4 高架势守卫。表中是 20 条路线里连胜两战的条数，以及单打高架势守卫（满血开场）的最好打法胜率、胜场平均轮数与剩余气血。', '');
lines.push('| 改动 | 容量 | 0 剂 | 1 剂 | 2 剂 | 单打守卫：最好打法 | 胜率 | 轮数 | 剩余气血 |');
lines.push('| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |');
const q12: unknown[] = [];
const routeWins = (arts: Arts, s: Strategy, potions: number, v: Variant = BASELINE) => SEEDS.filter((seed) => runRoute({ id: 'x', arts }, ROUTE, s, seed, potions, v).cleared).length;
for (const o of oneChange(brk.arts)) {
  const byPotion = [0, 1, 2].map((p) => Math.max(...ALL.map((s) => routeWins(o.arts, s, p))));
  const cells = ALL.map((s) => runCell({ id: o.id, arts: o.arts }, 'guard_standard', s));
  const best = cells.reduce((a, b) => (b.winRate > a.winRate || (b.winRate === a.winRate && (b.avgRoundsWin ?? 99) < (a.avgRoundsWin ?? 99)) ? b : a));
  lines.push(`| ${o.name} | ${capacity(o.arts)} | ${byPotion.join(' | ')} | ${ALL.find((s) => s.id === best.strategy)!.name} | ${pct(best.winRate)} | ${num(best.avgRoundsWin)} | ${num(best.avgHpEndWin)} |`);
  q12.push({ option: o.id, name: o.name, routeByPotion: byPotion, guard: { strategy: best.strategy, winRate: best.winRate, rounds: best.avgRoundsWin, hpEnd: best.avgHpEndWin } });
}
json.q12 = q12;
lines.push('', '路线一栏取四种打法中最好的一种。', '');

// ---------- 数值方案：高架势守卫气血 ----------
lines.push('## 三、数值方案：高架势守卫气血（只在内存中生效）', '');
lines.push('目的：在不改构筑的前提下，看高架势守卫气血降到多少时，破势用 0–1 剂能稳定走完基础路线；同时检查三套构筑“始终出招”打守卫是否仍然会输（V1.9.1 的设计目标）。', '');
lines.push('| 守卫气血 | 破势路线 0／1／2 剂（最好打法） | 寒霜 始终出招／最好 | 防反 始终出招／最好 | 破势 始终出招／最好 | 破势单打守卫轮数／剩余气血 |');
lines.push('| ---: | --- | --- | --- | --- | --- |');
const q12tune: unknown[] = [];
for (const hp of [52, 50, 48, 46, 44]) {
  const v: Variant = { ...BASELINE, id: `G${hp}`, name: `高架势守卫气血 ${hp}`, enemyHpMulBy: { guard_standard: hp / 52 } };
  const route = [0, 1, 2].map((p) => Math.max(...ALL.map((s) => routeWins(brk.arts, s, p, v))));
  const per = BUILDS.map((b) => {
    const cells = ALL.map((s) => runCell(b, 'guard_standard', s, SEEDS, v));
    const best = cells.slice(1).reduce((a, c) => (c.winRate > a.winRate || (c.winRate === a.winRate && (c.avgRoundsWin ?? 99) < (a.avgRoundsWin ?? 99)) ? c : a));
    return { build: b.id, attack: cells[0]!.winRate, best: best.winRate, rounds: best.avgRoundsWin, hpEnd: best.avgHpEndWin };
  });
  const p = per.find((x) => x.build === 'guard_break')!;
  lines.push(`| ${hp} | ${route.join('／')} | ${per.map((x) => `${pct(x.attack)}／${pct(x.best)}`).join(' | ')} | ${num(p.rounds)}／${num(p.hpEnd)} |`);
  q12tune.push({ guardHp: hp, breakRoute: route, perBuild: per });
}
json.q12tune = q12tune;
lines.push('');

writeFileSync('docs/reports/phase2-experiment-4-data.md', lines.join('\n'), 'utf8');
writeFileSync('docs/reports/phase2-experiment-4-data.json', JSON.stringify(json, null, 2), 'utf8');
console.log(lines.join('\n'));
