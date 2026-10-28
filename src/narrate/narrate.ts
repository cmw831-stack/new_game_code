// 把结算事件翻译成中文说明。默认层只保留能解释结果的几行；详细层逐条列出事件。
// 依据：教学与界面细则 V1.2 第 4.4 节（停招原因必须区分，不能都写成“发动失败”）。

import { findArt } from '../content/catalog.ts';
import type { ActionDef, ArtDef, BattleEvent, BattleState, Side, Stance, TriggerDef } from '../rules/types.ts';

export interface Names {
  player: string;
  enemy: string;
  /** 不在内容目录里的武学（玩家保存的秘籍版本）的名称。 */
  arts?: Record<string, string>;
  /** 玩家装备的武学；给出时，默认层会说明本轮没有任何动静的武学为什么没发动。 */
  playerArts?: readonly ArtDef[];
}

/** 一场对局的显示名称，包括双方装备的全部武学。 */
export function battleNames(state: BattleState, player = '你'): Names {
  const arts = Object.fromEntries([...state.player.arts, ...state.enemy.arts].map((a) => [a.art.id, a.art.name]));
  return { player, enemy: state.enemy.name, arts, playerArts: state.player.arts.map((a) => a.art) };
}

export type Tone = 'player' | 'enemy' | 'neutral' | 'warn' | 'end';

export interface Line {
  seq: number;
  tone: Tone;
  text: string;
}

export const STANCE_NAME: Record<Stance, string> = { attack: '出招', guard: '架招', breathe: '调息' };

const SKIP_REASON: Record<string, (d: BattleEvent['data']) => string> = {
  rootLimit: () => '这一串连锁里已经发动过一次',
  roundLimit: () => '本轮已经发动过一次',
  statusExists: () => '同类状态已经存在，没有增量',
  noGain: () => '内力已满，没有收益',
  insufficientQi: (d) => `内力不足（需要 ${d.cost}，现有 ${d.qi}）`,
  reserve: (d) => `付款后会低于留力 ${d.reserve}（需要 ${d.cost}，现有 ${d.qi}）`,
};

const END_REASON: Record<string, string> = {
  victory: '你获胜',
  defeat: '你败退',
  safetyLimit: '达到安全上限，对局中止（不算胜负）',
  roundLimit: '达到轮数上限，对局中止（不算胜负）',
  noDecision: '没有提供下一轮决策',
};

export function artName(id: string | null, arts?: Record<string, string>): string {
  if (!id) return '基础出招';
  const followup = id.endsWith(':followup');
  const base = followup ? id.slice(0, -':followup'.length) : id;
  const name = arts?.[base] ?? findArt(base)?.name ?? base;
  return followup ? `${name}·变化` : name;
}

/** 变招说明：调整了什么，本场还剩几次。 */
function changeText(d: BattleEvent['data'], arts?: Record<string, string>): string {
  const v = d.value as string | number;
  const what =
    d.adjust === 'pause' ? `本轮暂停${artName(v as string, arts)}`
    : d.adjust === 'priority' ? `本轮优先级改为 ${(v as string).split(',').map((id) => artName(id, arts)).join(' → ')}`
    : `本轮留力改为 ${v}`;
  return `变招：${what}（本场还剩 ${d.changesLeft} 次）`;
}

function who(side: Side | null, names: Names): string {
  return side === 'player' ? names.player : side === 'enemy' ? names.enemy : '';
}

/** 一门主招（或基础出招）在本施放内的打击摘要。 */
function hitSummary(evs: BattleEvent[]): string {
  const hits = evs.filter((e) => e.type === 'hit');
  const dodges = evs.filter((e) => e.type === 'dodge');
  const parts: string[] = [];
  if (hits.length > 0) {
    const hp = hits.reduce((n, e) => n + (e.data.hp as number), 0);
    const posture = hits.reduce((n, e) => n + (e.data.posture as number), 0);
    const blocked = hits.filter((e) => e.data.blocked === true).length;
    const count = hits.length + dodges.length > 1 ? `${hits.length + dodges.length} 击，` : '';
    parts.push(`${count}造成 ${hp} 气血、${posture} 架势`);
    if (blocked > 0) parts.push(blocked === hits.length ? '被护势减半' : `${blocked} 击被护势减半`);
  }
  if (dodges.length > 0) parts.push(dodges.length === 1 && hits.length === 0 ? '被身法闪开，没有接触' : `${dodges.length} 击被身法闪开`);
  if (evs.some((e) => e.type === 'openingConsumed')) parts.push('消费破绽 +2');
  if (evs.some((e) => e.type === 'crash')) parts.push('打崩架势，取得破绽');
  const cold = evs.filter((e) => e.type === 'cold').at(-1);
  if (evs.some((e) => e.type === 'freeze')) parts.push('寒意积满，冻结');
  else if (cold) parts.push(`寒意 ${cold.data.after}`);
  const qi = evs.filter((e) => e.type === 'qi').reduce((n, e) => n + (e.data.after as number) - (e.data.before as number), 0);
  if (qi > 0) parts.push(`回气 +${qi}`);
  const posture = evs.filter((e) => e.type === 'posture').reduce((n, e) => n + (e.data.after as number) - (e.data.before as number), 0);
  if (posture > 0) parts.push(`架势 +${posture}`);
  if (evs.some((e) => e.type === 'ward')) parts.push('取得护势');
  if (evs.some((e) => e.type === 'step')) parts.push('取得身法准备');
  return parts.join('，');
}

/** 默认层：按事件顺序，每个施放、跳过或关键状态一行。 */
export function narrate(events: BattleEvent[], names: Names): Line[] {
  const byCast = new Map<number, BattleEvent[]>();
  for (const e of events) {
    if (e.cast === null) continue;
    const list = byCast.get(e.cast) ?? [];
    list.push(e);
    byCast.set(e.cast, list);
  }
  const lines: Line[] = [];
  const tone = (side: Side | null): Tone => (side === 'player' ? 'player' : side === 'enemy' ? 'enemy' : 'neutral');
  for (const e of events) {
    const name = who(e.side, names);
    switch (e.type) {
      case 'segmentDraw':
        lines.push({ seq: e.seq, tone: 'neutral', text: `${names.enemy}下一段套路已定：${e.data.next}「${e.data.nextName}」` });
        break;
      case 'change':
        lines.push({ seq: e.seq, tone: 'player', text: `${name}${changeText(e.data, names.arts)}` });
        break;
      case 'freezeSkip':
        lines.push({ seq: e.seq, tone: 'warn', text: `${name}被冻结，跳过本轮${STANCE_NAME[e.data.stance as Stance]}` });
        break;
      case 'guard': {
        const gain = (e.data.postureAfter as number) - (e.data.postureBefore as number);
        lines.push({ seq: e.seq, tone: tone(e.side), text: `${name}架招：取得护势${gain > 0 ? `，架势 +${gain}` : ''}` });
        break;
      }
      case 'basicAttack':
        lines.push({ seq: e.seq, tone: tone(e.side), text: `${name}出招：${hitSummary(byCast.get(e.cast!) ?? [])}` });
        break;
      case 'cast': {
        const evs = byCast.get(e.cast!) ?? [];
        const cost = e.data.cost as number;
        const summary = hitSummary(evs);
        lines.push({ seq: e.seq, tone: tone(e.side), text: `${name}·${artName(e.art, names.arts)}${cost > 0 ? `（付 ${cost} 内力）` : ''}${summary ? `：${summary}` : ''}` });
        break;
      }
      case 'qi':
        if (e.data.source === 'breathe') lines.push({ seq: e.seq, tone: tone(e.side), text: `${name}调息：内力 ${e.data.before} → ${e.data.after}` });
        break;
      case 'skip': {
        const reason = SKIP_REASON[e.data.reason as string]?.(e.data) ?? String(e.data.reason);
        lines.push({ seq: e.seq, tone: 'warn', text: `${name}·${artName(e.art, names.arts)}没有发动：${reason}` });
        break;
      }
      case 'death':
        lines.push({ seq: e.seq, tone: 'end', text: `${name}气血归零` });
        break;
      case 'battleEnd':
        lines.push({ seq: e.seq, tone: 'end', text: END_REASON[e.data.reason as string] ?? String(e.data.reason) });
        break;
      default:
        break;
    }
  }
  const quiet = quietLine(events, names);
  if (quiet) {
    const end = lines.findIndex((l) => l.tone === 'end');
    lines.splice(end < 0 ? lines.length : end, 0, quiet);
  }
  return lines;
}

/**
 * 本轮既没发动、也没有“未发动”记录的玩家武学，说明原因（教学细则 V1.2 4.4 节）：
 * 变招暂停、战斗已在本轮结束（目标已败退或自己败退），否则是起势未成立。
 */
function quietLine(events: BattleEvent[], names: Names): Line | null {
  if (!names.playerArts || names.playerArts.length === 0) return null;
  const touched = new Set(events.filter((e) => e.side === 'player' && (e.type === 'cast' || e.type === 'skip')).map((e) => e.art));
  const quiet = names.playerArts.filter((a) => !touched.has(a.id));
  if (quiet.length === 0) return null;
  const paused = new Set(events.filter((e) => e.type === 'change' && e.data.adjust === 'pause').map((e) => e.data.value as string));
  const end = events.find((e) => e.type === 'battleEnd')?.data.reason;
  const parts = quiet.map((a) => {
    if (paused.has(a.id)) return `${a.name}（本轮变招暂停）`;
    if (end === 'victory') return `${a.name}（${names.enemy}已败退，战斗结束）`;
    if (end === 'defeat') return `${a.name}（${names.player}已败退）`;
    if (end) return `${a.name}（对局中止）`;
    return `${a.name}（起势未成立：需要${TRIGGER_TEXT[a.trigger.kind](a.trigger).replace(/时$|后$/, '')}）`;
  });
  const seq = (events.find((e) => e.type === 'roundEnd' || e.type === 'battleEnd')?.seq ?? events.at(-1)?.seq ?? 0) - 0.5;
  return { seq, tone: 'neutral', text: `没有机会发动：${parts.join('、')}` };
}

/** 详细层：一条事件一行，保留根连锁与深度。 */
export function describeEvent(e: BattleEvent, names: Names): string {
  const name = who(e.side, names);
  const d = e.data;
  const head = `#${e.seq} 根${e.root ?? '—'}${e.depth > 0 ? ` 深${e.depth}` : ''}`;
  const body = (() => {
    switch (e.type) {
      case 'intent': return `敌方意图：${STANCE_NAME[d.stance as Stance]}（段落 ${d.segment} 第 ${(d.item as number) + 1} 项${d.disabled ? `，禁用 ${String(d.disabled).split(',').map((id) => artName(id, names.arts)).join('、')}` : ''}）`;
      case 'segmentDraw': return `抽取下一段落：${d.from} → ${d.next}「${d.nextName}」`;
      case 'decision': return `你承诺：${STANCE_NAME[d.stance as Stance]}`;
      case 'guard': return `${name}架招，架势 ${d.postureBefore} → ${d.postureAfter}，取得护势`;
      case 'freezeSkip': return `${name}被冻结跳过第 ${d.seq} 次基础行动`;
      case 'qi': return `${name}内力 ${d.before} → ${d.after}（${d.source === 'regen' ? '轮初恢复' : d.source === 'breathe' ? '调息' : artName(d.source as string, names.arts)}）`;
      case 'posture': return `${name}架势 ${d.before} → ${d.after}（${d.source === 'crashRecovery' ? '崩溃后轮末恢复' : d.source}）`;
      case 'basicAttack': return `${name}基础出招`;
      case 'cast': return `${name}发动 ${artName(e.art, names.arts)}`;
      case 'pay': return `${name}支付 ${d.cost} 内力（${d.before} → ${d.after}）`;
      case 'skip': return `${name}的 ${artName(e.art, names.arts)} 未发动：${SKIP_REASON[d.reason as string]?.(d) ?? d.reason}`;
      case 'dodge': return `${name}以身法闪开第 ${(d.hitIndex as number) + 1} 击`;
      case 'hit': return `${artName(e.art, names.arts)} 第 ${(d.hitIndex as number) + 1} 击：威力 ${d.hpPower}／${d.posturePower}${d.blocked ? '，被格挡' : ''}，实际 ${d.hp} 气血、${d.posture} 架势（对方剩 ${d.targetHp}／${d.targetPosture}）`;
      case 'block': return `${name}护势格挡`;
      case 'crash': return `${name}架势崩溃`;
      case 'opening': return `${name}取得破绽`;
      case 'openingConsumed': return `${name}消费破绽，气血威力 +${d.bonus}`;
      case 'openingExpired': return `${name}的破绽过期`;
      case 'cold': return `${name}寒意 ${d.before} → ${d.after}（上限 ${d.cap}）`;
      case 'freeze': return `${name}被冻结，将跳过下一次尚未执行的基础行动`;
      case 'ward': return `${name}取得护势`;
      case 'wardConsumed': return `${name}的护势已消费`;
      case 'step': return `${name}取得身法准备`;
      case 'mainEnd': return `${artName(e.art, names.arts)} 结束：有效接触 ${d.contacts}，伤血 ${d.hp}`;
      case 'complete': return `${artName(e.art, names.arts)} 完成`;
      case 'death': return `${name}气血归零`;
      case 'expire': return `${name}的${d.status === 'ward' ? '护势' : '身法准备'}到期`;
      case 'roundEnd': return `第 ${d.round} 轮结束`;
      case 'battleEnd': return END_REASON[d.reason as string] ?? String(d.reason);
      case 'change': return `${name}${changeText(d, names.arts)}`;
    }
  })();
  return `${head}　${body}`;
}

// ---------- 武学说明 ----------

const TRIGGER_TEXT: Record<TriggerDef['kind'], (t: TriggerDef) => string> = {
  contact: () => '自身基础出招接触后',
  dodge: () => '自身闪避后',
  block: () => '自身格挡后',
  break: () => '对方架势崩溃后',
  qiCross: (t) => `自身内力升到 ${(t as { threshold: number }).threshold} 时`,
  status: (t) => ((t as { condition: string }).condition === 'freeze' ? '对方被冻结时' : '对方寒意升到 2 时'),
  multiContact: (t) => `对方一门主招对自己接触至少 ${(t as { min: number }).min} 次后`,
};

function actionText(a: ActionDef): string {
  switch (a.kind) {
    case 'attack': {
      if (a.type === 'resonance') return '反震：每次有效接触 2 气血';
      const h = a.hits[0]!;
      return a.hits.length > 1 ? `${a.hits.length} 击，每击 ${h.hp}／${h.posture}` : `一击 ${h.hp}／${h.posture}`;
    }
    case 'ward': return '取得一层护势';
    case 'step': return '取得一份身法准备';
    case 'qi': return `回气 ${a.amount}`;
  }
}

const MODIFIER_TEXT: Record<string, string> = {
  gang: '刚劲：首次接触消费己方破绽，气血 +2',
  soft: '柔劲：首次接触气血 −2，自身架势 +2',
  cold: '寒劲：每次接触积寒 1',
  shock: '震劲：首次接触气血 −2、架势 +4',
};

/** 一门武学的一行说明，例如“自身基础出招接触后 → 3 击，每击 2／2；寒劲……”。 */
export function describeArt(art: ArtDef): string {
  const parts = [`${TRIGGER_TEXT[art.trigger.kind](art.trigger)} → ${actionText(art.action)}`];
  if (art.modifier) parts.push(MODIFIER_TEXT[art.modifier]!);
  if (art.recovery) parts.push(art.recovery.kind === 'qiOnHpDamage' ? `造成气血伤害后回气 ${art.recovery.amount}` : `完成后架势 +${art.recovery.amount}`);
  if (art.perRound) parts.push('每轮一次');
  return parts.join('；');
}

// ---------- 组件名称 ----------

const COMPONENT_NAME: Record<string, string> = {
  T_contact: '基础出招接触', T_dodge: '闪避成功', T_block: '格挡成功', T_break: '对方架势崩溃', T_qi: '内力升过阈值', T_status: '对方状态',
  A_single: '单击', A_combo: '连击', A_heavy: '重击', A_break: '破势', A_ward: '护势准备', A_step: '身法', A_qi: '回气', A_counter: '反击',
  M_gang: '刚劲', M_soft: '柔劲', M_cold: '寒劲', M_shock: '震劲',
  F_hit_single: '伤血后单击', F_freeze_combo: '冻结追击',
  R_qi: '伤血回气', R_posture: '复架势',
};

/** 组件库条目或槽值的中文名，例如 "A_break:甲" → "破势甲"，null → "无"。 */
export function componentLabel(key: string | null): string {
  if (key === null) return '无';
  const [id, param] = key.split(':');
  const name = COMPONENT_NAME[id!] ?? id!;
  if (param === undefined) return name;
  if (param === 'cold2') return `${name}（寒意跨 2）`;
  if (param === 'freeze') return `${name}（冻结出现）`;
  return /^\d+$/.test(param) ? `${name} ${param}` : `${name}${param}`;
}
