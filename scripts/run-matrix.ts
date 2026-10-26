// 运行 27 格构筑矩阵与段落可行性检查，输出原始数据（JSON）与数据表（Markdown）。
// 用法：npm run matrix

import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { allEnemyIds, CONTENT_VERSION, findArt, findEnemy } from '../src/content/catalog.ts';
import { RULES_VERSION } from '../src/engine/setup.ts';
import { MATRIX_ENEMIES, runMatrix, SEEDS, segmentFeasibility, type CellResult } from '../src/sim/matrix.ts';
import { BUILDS, STRATEGIES } from '../src/sim/strategies.ts';

const OUT_DIR = 'docs/reports';
const started = Date.now();
const cells = runMatrix();
const feasibility = segmentFeasibility(allEnemyIds().filter((id) => !findEnemy(id)!.fixedSegment));
const elapsedMs = Date.now() - started;

let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  if (execSync('git status --porcelain -- src scripts', { encoding: 'utf8' }).trim()) commit += '（另有未提交的代码改动）';
} catch {
  // 不在 git 仓库中运行时保留 unknown。
}

const name = (id: string): string => findArt(id)?.name ?? (id === 'basic' ? '基础出招' : id);
const enemyName = (id: string): string => findEnemy(id)?.name ?? id;
const buildName = (id: string): string => BUILDS.find((b) => b.id === id)!.name;
const stratName = (id: string): string => STRATEGIES.find((s) => s.id === id)!.name;
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const num = (x: number | null): string => (x === null ? '—' : x.toFixed(1));

const lines: string[] = [];
lines.push('# Phase 1 构筑矩阵：原始数据表', '');
lines.push(`由 \`npm run matrix\` 自动生成，请勿手改。规则 ${RULES_VERSION}，内容 ${CONTENT_VERSION}，代码提交 ${commit}。`, '');
lines.push(`种子：${SEEDS[0]}–${SEEDS.at(-1)}，每格 ${SEEDS.length} 场，共 ${cells.length} 格 ${cells.length * SEEDS.length} 场；耗时 ${elapsedMs} ms。玩家统一为铁剑、30／20／20、留力 0。`, '');

lines.push('## 一、策略', '');
lines.push('| 策略 | 规则 |', '| --- | --- |');
for (const s of STRATEGIES) lines.push(`| ${s.name} | ${s.rule} |`);
lines.push('');
lines.push('## 二、构筑', '');
lines.push('| 构筑 | 武学（优先级顺序） | 验证的问题 |', '| --- | --- | --- |');
for (const b of BUILDS) lines.push(`| ${b.name} | ${b.arts.map(name).join(' → ')} | ${b.question} |`);
lines.push('');

lines.push('## 三、27 格结果', '');
lines.push('胜率之后依次为：败、其他结束（轮数上限等）、全部场次平均轮数、胜场平均剩余气血、平均气血最低点、平均净内力、敌方因缺内力停招次数／场、段落序列种数。', '');
for (const enemy of MATRIX_ENEMIES) {
  lines.push(`### ${enemyName(enemy)}`, '');
  lines.push('| 构筑 | 策略 | 胜率 | 败 | 其他 | 平均轮数 | 胜场剩血 | 最低气血 | 净内力 | 敌停招 | 段落序列 |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const c of cells.filter((x) => x.enemy === enemy)) {
    lines.push(`| ${buildName(c.build)} | ${stratName(c.strategy)} | ${pct(c.winRate)} | ${c.defeats} | ${c.other} | ${num(c.avgRounds)} | ${num(c.avgHpEndWin)} | ${num(c.avgHpMin)} | ${num(c.avgQiNet)} | ${num(c.enemyStarvedPerBattle)} | ${c.segmentSequences} |`);
  }
  lines.push('');
}

lines.push('## 四、伤害来源占比', '');
lines.push('| 构筑 | 敌人 | 策略 | 各来源占玩家总伤害 |', '| --- | --- | --- | --- |');
for (const c of cells) {
  const parts = Object.entries(c.damageShare).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${name(k)} ${pct(v)}`);
  lines.push(`| ${buildName(c.build)} | ${enemyName(c.enemy)} | ${stratName(c.strategy)} | ${parts.join('，') || '—'} |`);
}
lines.push('');

lines.push('## 五、每套构筑的最佳格', '');
lines.push('按胜率、胜场平均轮数（少者优先）、胜场剩余气血（多者优先）排序。', '');
lines.push('| 敌人 | 排名 | 构筑 | 最佳策略 | 胜率 | 胜场平均轮数 | 胜场剩血 |', '| --- | ---: | --- | --- | ---: | ---: | ---: |');
const best = (build: string, enemy: string): CellResult => {
  const cs = cells.filter((c) => c.build === build && c.enemy === enemy);
  return cs.sort((a, b) => b.winRate - a.winRate || (a.avgRoundsWin ?? 99) - (b.avgRoundsWin ?? 99) || (b.avgHpEndWin ?? 0) - (a.avgHpEndWin ?? 0))[0]!;
};
const rankings: Record<string, string[]> = {};
for (const enemy of MATRIX_ENEMIES) {
  const ranked = BUILDS.map((b) => best(b.id, enemy)).sort((a, b) => b.winRate - a.winRate || (a.avgRoundsWin ?? 99) - (b.avgRoundsWin ?? 99) || (b.avgHpEndWin ?? 0) - (a.avgHpEndWin ?? 0));
  rankings[enemy] = ranked.map((c) => c.build);
  ranked.forEach((c, i) => lines.push(`| ${enemyName(enemy)} | ${i + 1} | ${buildName(c.build)} | ${stratName(c.strategy)} | ${pct(c.winRate)} | ${num(c.avgRoundsWin)} | ${num(c.avgHpEndWin)} |`));
}
lines.push('');

lines.push('## 六、设计目标核对（机械判定）', '');
for (const b of BUILDS) {
  const wonAgainst = MATRIX_ENEMIES.filter((e) => cells.some((c) => c.build === b.id && c.enemy === e && c.wins > 0));
  lines.push(`- ${b.name}：在 ${wonAgainst.length} 类标准敌人上有可复现的胜利（${wonAgainst.map(enemyName).join('、') || '无'}）。目标至少 2 类：${wonAgainst.length >= 2 ? '达到' : '未达到'}。`);
}
const orders = MATRIX_ENEMIES.map((e) => rankings[e]!.join('>'));
const swapped = new Set(orders).size > 1;
lines.push(`- 构筑排名在不同敌人间${swapped ? '出现' : '没有出现'}交换：${MATRIX_ENEMIES.map((e) => `${enemyName(e)} ${rankings[e]!.map(buildName).join(' > ')}`).join('；')}。`);
const abnormal = cells.reduce((n, c) => n + c.other, 0);
lines.push(`- 非正常结束（轮数上限、安全上限）共 ${abnormal} 场，占 ${pct(abnormal / (cells.length * SEEDS.length))}。`);
lines.push('');

lines.push('## 七、段落资源可行性', '');
lines.push(`五类标准敌人各对两个无武学的探针玩家打 ${SEEDS.length} 个种子，每场最多 12 轮。统计每个段落里敌方武学因内力不足而停招的次数。`, '');
lines.push('| 敌人 | 探针 | 段落 | 经历轮数 | 缺内力停招 | 每 10 轮停招 |', '| --- | --- | --- | ---: | ---: | ---: |');
for (const f of feasibility) lines.push(`| ${enemyName(f.enemy)} | ${f.probe} | ${f.segment} | ${f.rounds} | ${f.starved} | ${(f.rounds ? (f.starved * 10) / f.rounds : 0).toFixed(1)} |`);
lines.push('');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/phase1-matrix-data.md`, lines.join('\n'), 'utf8');
writeFileSync(`${OUT_DIR}/phase1-matrix-data.json`, JSON.stringify({ rulesVersion: RULES_VERSION, contentVersion: CONTENT_VERSION, commit, seeds: SEEDS, cells, feasibility, rankings }, null, 1), 'utf8');
console.log(`wrote ${OUT_DIR}/phase1-matrix-data.md and .json (${cells.length} cells, ${elapsedMs} ms)`);
