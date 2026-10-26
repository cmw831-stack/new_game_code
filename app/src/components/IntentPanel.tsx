import { describeArt, STANCE_NAME } from '../../../src/narrate/narrate.ts';
import type { BattleState, RoundIntent } from '../../../src/rules/types.ts';

export function IntentPanel({ state, intent }: { state: BattleState; intent: RoundIntent }) {
  const segment = state.script.segments.find((s) => s.id === intent.segmentId)!;
  const remaining = segment.items.slice(intent.itemIndex + 1);
  const enemyFirst = state.rules.initiative === 'enemyOnAttack' && intent.stance === 'attack';
  const last = intent.itemIndex === intent.segmentLength - 1;
  // 冻结待跳过、且下一次机会不受保护时，本轮基础行动会被跳过（战斗细则第七章）。
  const st = state.enemy.status;
  const skipped = st.freezePending && st.protectedSeq !== state.enemy.actionSeq + 1;
  return (
    <div class="intent">
      <div class="intent-main">
        <span class="intent-label">对手本轮</span>
        <span class={`intent-stance ${intent.stance}`}>{STANCE_NAME[intent.stance]}</span>
        {enemyFirst && !skipped && <span class="chip warn">对手先手</span>}
        {skipped && <span class="chip good">已被冻结：本轮行动将被跳过</span>}
      </div>
      <div class="small">
        段落 {intent.segmentId}「{intent.segmentName}」第 {intent.itemIndex + 1} / {intent.segmentLength} 项
        {remaining.length > 0 && <>　本段剩余：{remaining.map((i) => STANCE_NAME[i.stance]).join(' → ')}</>}
      </div>
      <div class="small">下一项：{intent.next ? STANCE_NAME[intent.next.stance] : '—'}{last ? '（本段结束，下一段已抽定）' : ''}</div>
      <ul class="enemy-arts">
        {state.enemy.arts.map((a) => {
          const off = intent.disabled.includes(a.art.id);
          return (
            <li key={a.instanceId} class={off ? 'off' : ''}>
              <strong>{a.art.name}</strong>
              <span class="muted"> · {a.art.cost} 内力{off ? ' · 本轮禁用' : ''}</span>
              <div class="small">{describeArt(a.art)}</div>
            </li>
          );
        })}
        <li class="small muted">基础出招：{state.enemy.weapon.base.hp} 气血／{state.enemy.weapon.base.posture} 架势</li>
      </ul>
    </div>
  );
}
