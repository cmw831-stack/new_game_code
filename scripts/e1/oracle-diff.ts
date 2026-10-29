// E1 对拍的公共部分：把对局交给参考实现批量结算，比较两边逐轮快照。
// scripts/diff-oracle.ts（10 万局报告）与 test/differential.test.ts（常规测试）共用。

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { OracleCase, OracleResult, OracleRound } from '../../src/sim/oracle-io.ts';

const BATCH = fileURLToPath(new URL('./oracle_batch.py', import.meta.url));

/** 本机能否运行参考实现（需要 Python 3.13）。 */
export function oracleAvailable(): boolean {
  const p = spawnSync('python3', ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 13) else 1)']);
  return p.status === 0;
}

/** 分批交给参考实现（oracle_batch.py 逐行调用 oracle/run.py 的 simulate），避免每局启动一次 Python。 */
export function oracleAll(cs: OracleCase[]): (OracleResult | { crash: string })[] {
  const out: (OracleResult | { crash: string })[] = [];
  for (let i = 0; i < cs.length; i += 5000) {
    const chunk = cs.slice(i, i + 5000);
    const p = spawnSync('python3', ['-I', BATCH], { input: chunk.map((c) => JSON.stringify(c)).join('\n') + '\n', encoding: 'utf8', maxBuffer: 1 << 30 });
    if (p.status !== 0) throw new Error(`参考实现批量运行失败：${p.stderr.slice(-400)}`);
    const lines = p.stdout.trim().split('\n');
    if (lines.length !== chunk.length) throw new Error(`参考实现输出 ${lines.length} 行，应为 ${chunk.length}`);
    for (const l of lines) out.push(JSON.parse(l) as OracleResult | { crash: string });
  }
  return out;
}

export interface Diff { index: number; round: number; field: string; engine: unknown; oracle: unknown }

/** 第一处不一致：轮次与字段。 */
export function firstDiff(index: number, a: OracleResult, b: OracleResult): Diff | null {
  if ('error' in a || 'error' in b) {
    return 'error' in a && 'error' in b ? null : { index, round: 0, field: 'error', engine: 'error' in a ? a.error : '合法', oracle: 'error' in b ? b.error : '合法' };
  }
  const n = Math.max(a.rounds.length, b.rounds.length);
  for (let r = 0; r < n; r++) {
    const x = a.rounds[r], y = b.rounds[r];
    if (!x || !y) return { index, round: r + 1, field: 'rounds', engine: a.rounds.length, oracle: b.rounds.length };
    // 对局结束的那一轮只比较资源与结局：终局后的护势、身法等状态没有规则含义（oracle-io.md 第五节裁决 J1）。
    const terminal = x.over !== null || y.over !== null;
    for (const side of ['player', 'enemy'] as const) {
      for (const k of Object.keys(x[side]) as (keyof OracleRound['player'])[]) {
        if (terminal && !['hp', 'qi', 'posture'].includes(k)) continue;
        if (x[side][k] !== y[side]?.[k]) return { index, round: r + 1, field: `${side}.${k}`, engine: x[side][k], oracle: y[side]?.[k] };
      }
    }
    if (x.over !== y.over) return { index, round: r + 1, field: 'over', engine: x.over, oracle: y.over };
  }
  return null;
}
