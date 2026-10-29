// E2 全构筑穷举的批量运行：多线程求解，每局一行写入 .e2-tmp/<批次>.jsonl，中断后可接着跑。
// 用法：
//   node scripts/run-e2.ts full      S1：700 构筑 × 三类标准敌人 × 20 种子，姿态＋变招（无词缀）
//   node scripts/run-e2.ts stance    S2：同上 × 无词缀与六个词缀，只选姿态
//   node scripts/run-e2.ts <批次> --limit N   只跑前 N 局（试运行）
// 汇总见 scripts/e2/analyze.ts。口径见 docs/engine/e2-solver.md。

import { availableParallelism } from 'node:os';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { AFFIXES } from '../src/content/affixes.ts';
import { MATRIX_ENEMIES, SEEDS } from '../src/sim/matrix.ts';
import { allConfigs, solveTask, type BattleRecord, type Model, type Task } from '../src/sim/e2.ts';

const configs = allConfigs();

if (!isMainThread) {
  parentPort!.on('message', (t: Task | null) => {
    if (t === null) return process.exit(0);
    parentPort!.postMessage(solveTask(t, configs));
  });
} else {
  const model = (process.argv[2] ?? 'full') as Model;
  if (model !== 'full' && model !== 'stance') throw new Error('批次只能是 full 或 stance');
  const li = process.argv.indexOf('--limit');
  const limit = li > 0 ? Number(process.argv[li + 1]) : Infinity;
  const affixes = model === 'full' ? [null] : [null, ...AFFIXES.map((a) => a.id)];
  const tasks: Task[] = [];
  for (const affix of affixes) for (const enemy of MATRIX_ENEMIES) for (let config = 0; config < configs.length; config++) for (const seed of SEEDS) tasks.push({ config, enemy, seed, affix, model });

  mkdirSync('.e2-tmp', { recursive: true });
  const file = `.e2-tmp/${model}.jsonl`;
  const tag = (t: Task): string => `${t.config}|${t.enemy}|${t.seed}|${t.affix ?? ''}`;
  const done = new Set(existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => tag(JSON.parse(l) as Task)) : []);
  const todo = tasks.filter((t) => !done.has(tag(t))).slice(0, limit);
  console.log(`${model}：共 ${tasks.length} 局，已完成 ${done.size}，本次 ${todo.length}，构筑 ${configs.length} 种`);

  const started = Date.now();
  let finished = 0;
  let next = 0;
  const workers = Math.min(availableParallelism(), todo.length);
  for (let i = 0; i < workers; i++) {
    const w = new Worker(new URL(import.meta.url));
    const feed = (): void => { w.postMessage(next < todo.length ? todo[next++]! : null); };
    w.on('message', (r: BattleRecord) => {
      appendFileSync(file, JSON.stringify(r) + '\n');
      finished += 1;
      if (finished % 500 === 0 || finished === todo.length) {
        const sec = (Date.now() - started) / 1000;
        console.log(`${finished}/${todo.length}，${sec.toFixed(0)} 秒，预计还要 ${((sec / finished) * (todo.length - finished) / 60).toFixed(0)} 分钟`);
      }
      feed();
    });
    w.on('error', (e) => { console.error(e); process.exit(1); });
    feed();
  }
}
