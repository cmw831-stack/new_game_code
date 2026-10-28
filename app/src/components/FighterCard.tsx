import type { FighterState } from '../../../src/rules/types.ts';
import { findAffix } from '../../../src/content/affixes.ts';

function Bar({ label, value, max, kind }: { label: string; value: number; max: number; kind: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div class="bar" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span class="bar-label">{label}</span>
      <span class="bar-track"><span class={`bar-fill ${kind}`} style={{ width: `${pct}%` }} /></span>
      <span class="bar-num">{value} / {max}</span>
    </div>
  );
}

export function FighterCard({ f, title }: { f: FighterState; title: string }) {
  const st = f.status;
  const chips: string[] = [];
  if (st.ward) chips.push(st.ward.source === 'basic' ? '护势（架招）' : '护势（武学）');
  if (st.step) chips.push('身法准备');
  if (st.cold > 0) chips.push(`寒意 ${st.cold}/${st.coldCapReduced ? f.coldCapProtected : f.coldThreshold}`);
  if (st.freezePending) chips.push('已冻结：将跳过下一次行动');
  if (st.protectedSeq !== null) chips.push('冻结保护中');
  if (st.opening) chips.push('持有破绽');
  return (
    <div class={`fighter ${f.side}`}>
      <div class="fighter-head">
        <span class="fighter-title">{title}</span>
        <span class="fighter-name">{f.name}</span>
      </div>
      <Bar label="气血" value={f.hp} max={f.hpMax} kind="hp" />
      <Bar label="内力" value={f.qi} max={f.qiMax} kind="qi" />
      <Bar label="架势" value={f.posture} max={f.postureMax} kind="posture" />
      {f.affixes.length > 0 && (
        <div class="chips">{f.affixes.map((id) => { const a = findAffix(id); return <span class="chip warn" key={id} title={a?.text}>词缀：{a?.name ?? id}</span>; })}</div>
      )}
      <div class="chips">{chips.length ? chips.map((c) => <span class="chip" key={c}>{c}</span>) : <span class="small muted">无状态</span>}</div>
    </div>
  );
}
