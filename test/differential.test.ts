// E1 对拍（目标 V2 第四节）：固定种子随机生成合法对局，与独立参考实现（oracle/，只读策划文档写成）逐轮比较。
// 预期是“两份独立实现结果相同”，不来自引擎输出；比较方式与裁决见 docs/engine/oracle-io.md 第五节（J1 终局轮、J2 即 Q17）。
// 参考实现需要 Python 3.13；本机没有时跳过并提示，CI 上没有则直接失败。10 万局的正式结论见 docs/reports/e1-report.md。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { oracleCase } from '../src/sim/oracle-gen.ts';
import { runEngineCase } from '../src/sim/oracle-io.ts';
import { firstDiff, oracleAll, oracleAvailable } from '../scripts/e1/oracle-diff.ts';

const RUNS = Number(process.env.DIFF_RUNS ?? 2000);
const SEED = 2;
const available = oracleAvailable();
if (!available && process.env.CI) throw new Error('CI 上必须能运行参考实现（python3 ≥ 3.13）');

test(`对拍：${RUNS} 局随机对局，引擎与独立参考实现逐轮一致（目标 V2 命题 H1；种子 ${SEED}）`, { skip: available ? false : '本机没有 Python 3.13，跳过对拍' }, () => {
  const cases = fc.sample(oracleCase, { numRuns: RUNS, seed: SEED });
  const oracle = oracleAll(cases);
  const problems: string[] = [];
  for (const [i, c] of cases.entries()) {
    const o = oracle[i]!;
    if ('crash' in o) { problems.push(`#${i} 参考实现出错：${o.crash}`); continue; }
    const d = firstDiff(i, runEngineCase(c), o);
    if (d) problems.push(`#${d.index} 第 ${d.round} 轮 ${d.field}：引擎 ${JSON.stringify(d.engine)}，参考实现 ${JSON.stringify(d.oracle)}`);
  }
  assert.deepEqual(problems.slice(0, 5), [], `${problems.length} 局不一致`);
});
