// 确定性随机数：mulberry32，只用整数运算，状态为一个 uint32。
// 战斗中只在套路段落交界抽取下一段落时调用（敌人细则 V1.1 第 2.2 节）。

export function nextU32(state: number): { value: number; state: number } {
  const t = (state + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return { value: (r ^ (r >>> 14)) >>> 0, state: t };
}

/** 在 [0, n) 中取一个整数。n 很小（段落数），取模偏差可忽略且结果确定。 */
export function pick(state: number, n: number): { index: number; state: number } {
  const { value, state: next } = nextU32(state);
  return { index: value % n, state: next };
}
