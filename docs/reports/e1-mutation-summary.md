# E1 变异测试摘要

由 `npx stryker run` 后运行 `python3 -I scripts/e1/mutation_summary.py` 生成，请勿手改。原始报告体积大，不入库。

| 文件 | 抓到 | 超时（算抓到） | 漏掉 | 分数 |
| --- | ---: | ---: | ---: | ---: |
| content/components.ts | 224 | 0 | 119 | 65.31% |
| engine/round.ts | 632 | 8 | 324 | 66.39% |
| engine/setup.ts | 231 | 0 | 99 | 70.00% |
| **合计** | 1087 | 8 | 542 | **66.89%** |

## 漏掉的变异按类型

| 类型 | 个数 |
| --- | ---: |
| ConditionalExpression | 164 |
| StringLiteral | 162 |
| EqualityOperator | 61 |
| ObjectLiteral | 43 |
| LogicalOperator | 26 |
| ArrayDeclaration | 19 |
| BooleanLiteral | 18 |
| ArithmeticOperator | 14 |
| BlockStatement | 13 |
| OptionalChaining | 6 |
| UpdateOperator | 6 |
| MethodExpression | 4 |
| ArrowFunction | 3 |
| AssignmentOperator | 3 |

## 全部漏掉的变异

| 文件:行 | 类型 | 原代码 | 改成 |
| --- | --- | --- | --- |
| content/components.ts:57 | StringLiteral | `kind: 'attack', attackType: 'single', swordOnly: false,` | `""` |
| content/components.ts:61 | StringLiteral | `kind: 'attack', attackType: 'combo', swordOnly: true,` | `""` |
| content/components.ts:63 | ArrayDeclaration | `甲: { cost: 2, capacity: 3, hits: [p(2, 1), p(2, 1)] },` | `[]` |
| content/components.ts:69 | StringLiteral | `kind: 'attack', attackType: 'heavy', swordOnly: false,` | `""` |
| content/components.ts:69 | StringLiteral | `kind: 'attack', attackType: 'heavy', swordOnly: false,` | `""` |
| content/components.ts:69 | BooleanLiteral | `kind: 'attack', attackType: 'heavy', swordOnly: false,` | `true` |
| content/components.ts:70 | ObjectLiteral | `tiers: { 甲: { cost: 4, capacity: 4, hits: [p(8, 2)] }, 乙: { cost: 4, c` | `{}` |
| content/components.ts:70 | ObjectLiteral | `tiers: { 甲: { cost: 4, capacity: 4, hits: [p(8, 2)] }, 乙: { cost: 4, c` | `{}` |
| content/components.ts:70 | ArrayDeclaration | `tiers: { 甲: { cost: 4, capacity: 4, hits: [p(8, 2)] }, 乙: { cost: 4, c` | `[]` |
| content/components.ts:70 | ObjectLiteral | `tiers: { 甲: { cost: 4, capacity: 4, hits: [p(8, 2)] }, 乙: { cost: 4, c` | `{}` |
| content/components.ts:70 | ArrayDeclaration | `tiers: { 甲: { cost: 4, capacity: 4, hits: [p(8, 2)] }, 乙: { cost: 4, c` | `[]` |
| content/components.ts:73 | StringLiteral | `kind: 'attack', attackType: 'break', swordOnly: false,` | `""` |
| content/components.ts:74 | ObjectLiteral | `tiers: { 甲: { cost: 3, capacity: 4, hits: [p(2, 8)] }, 乙: { cost: 3, c` | `{}` |
| content/components.ts:74 | ArrayDeclaration | `tiers: { 甲: { cost: 3, capacity: 4, hits: [p(2, 8)] }, 乙: { cost: 3, c` | `[]` |
| content/components.ts:76 | BooleanLiteral | `A_ward: { kind: 'ward', swordOnly: false, tiers: { 甲: { cost: 2, capac` | `true` |
| content/components.ts:78 | BooleanLiteral | `A_step: { kind: 'step', swordOnly: false, tiers: { 甲: { cost: 3, capac` | `true` |
| content/components.ts:80 | BooleanLiteral | `kind: 'qi', swordOnly: false,` | `true` |
| content/components.ts:84 | StringLiteral | `kind: 'attack', attackType: 'counter', swordOnly: false,` | `""` |
| content/components.ts:85 | ObjectLiteral | `tiers: { 甲: { cost: 4, capacity: 3, hits: [p(6, 2)] }, 乙: { cost: 4, c` | `{}` |
| content/components.ts:85 | ArrayDeclaration | `tiers: { 甲: { cost: 4, capacity: 3, hits: [p(6, 2)] }, 乙: { cost: 4, c` | `[]` |
| content/components.ts:96 | ObjectLiteral | `const FOLLOWUPS: Record<FollowupId, { capacity: number; def: FollowupD` | `{}` |
| content/components.ts:97 | ObjectLiteral | `F_hit_single: { capacity: 3, def: { kind: 'onHpDamage', hits: [p(4, 0)` | `{}` |
| content/components.ts:97 | ObjectLiteral | `F_hit_single: { capacity: 3, def: { kind: 'onHpDamage', hits: [p(4, 0)` | `{}` |
| content/components.ts:97 | StringLiteral | `F_hit_single: { capacity: 3, def: { kind: 'onHpDamage', hits: [p(4, 0)` | `""` |
| content/components.ts:97 | ArrayDeclaration | `F_hit_single: { capacity: 3, def: { kind: 'onHpDamage', hits: [p(4, 0)` | `[]` |
| content/components.ts:97 | BooleanLiteral | `F_hit_single: { capacity: 3, def: { kind: 'onHpDamage', hits: [p(4, 0)` | `true` |
| content/components.ts:98 | ObjectLiteral | `F_freeze_combo: { capacity: 4, def: { kind: 'onOwnFreeze', hits: [p(2,` | `{}` |
| content/components.ts:98 | ObjectLiteral | `F_freeze_combo: { capacity: 4, def: { kind: 'onOwnFreeze', hits: [p(2,` | `{}` |
| content/components.ts:98 | StringLiteral | `F_freeze_combo: { capacity: 4, def: { kind: 'onOwnFreeze', hits: [p(2,` | `""` |
| content/components.ts:98 | ArrayDeclaration | `F_freeze_combo: { capacity: 4, def: { kind: 'onOwnFreeze', hits: [p(2,` | `[]` |
| content/components.ts:98 | BooleanLiteral | `F_freeze_combo: { capacity: 4, def: { kind: 'onOwnFreeze', hits: [p(2,` | `false` |
| content/components.ts:103 | ObjectLiteral | `R_posture: { cost: 0, capacity: 1, def: { kind: 'postureOnComplete', a` | `{}` |
| content/components.ts:103 | StringLiteral | `R_posture: { cost: 0, capacity: 1, def: { kind: 'postureOnComplete', a` | `""` |
| content/components.ts:110 | ConditionalExpression | `if (!action) return [`未知主招组件：${spec.action}`];` | `false` |
| content/components.ts:110 | ArrayDeclaration | `if (!action) return [`未知主招组件：${spec.action}`];` | `[]` |
| content/components.ts:110 | StringLiteral | `if (!action) return [`未知主招组件：${spec.action}`];` | ```` |
| content/components.ts:111 | StringLiteral | `if (!(spec.trigger in TRIGGER_COST)) problems.push(`未知起势组件：${spec.trig` | ```` |
| content/components.ts:111 | ConditionalExpression | `if (!(spec.trigger in TRIGGER_COST)) problems.push(`未知起势组件：${spec.trig` | `false` |
| content/components.ts:113 | StringLiteral | `if (!tier) problems.push(`${spec.action} 没有 ${spec.tier} 档`);` | ```` |
| content/components.ts:113 | ConditionalExpression | `if (!tier) problems.push(`${spec.action} 没有 ${spec.tier} 档`);` | `false` |
| content/components.ts:115 | ConditionalExpression | `if (spec.trigger === 'T_qi' && spec.triggerParam !== 8 && spec.trigger` | `false` |
| content/components.ts:115 | StringLiteral | `if (spec.trigger === 'T_qi' && spec.triggerParam !== 8 && spec.trigger` | `""` |
| content/components.ts:115 | ConditionalExpression | `if (spec.trigger === 'T_qi' && spec.triggerParam !== 8 && spec.trigger` | `true` |
| content/components.ts:115 | EqualityOperator | `if (spec.trigger === 'T_qi' && spec.triggerParam !== 8 && spec.trigger` | `spec.triggerParam === 10` |
| content/components.ts:115 | BlockStatement | `if (spec.trigger === 'T_qi' && spec.triggerParam !== 8 && spec.trigger` | `{}` |
| content/components.ts:116 | StringLiteral | `problems.push('T_qi 阈值只能是 8 或 10');` | `""` |
| content/components.ts:118 | ConditionalExpression | `if (spec.trigger === 'T_status' && spec.triggerParam !== 'cold2' && sp` | `false` |
| content/components.ts:118 | StringLiteral | `if (spec.trigger === 'T_status' && spec.triggerParam !== 'cold2' && sp` | `""` |
| content/components.ts:118 | EqualityOperator | `if (spec.trigger === 'T_status' && spec.triggerParam !== 'cold2' && sp` | `spec.triggerParam === 'cold2'` |
| content/components.ts:118 | ConditionalExpression | `if (spec.trigger === 'T_status' && spec.triggerParam !== 'cold2' && sp` | `true` |
| content/components.ts:118 | StringLiteral | `if (spec.trigger === 'T_status' && spec.triggerParam !== 'cold2' && sp` | `""` |
| content/components.ts:118 | BlockStatement | `if (spec.trigger === 'T_status' && spec.triggerParam !== 'cold2' && sp` | `{}` |
| content/components.ts:119 | StringLiteral | `problems.push('T_status 条件只能是“寒意跨 2”或“冻结出现”');` | `""` |
| content/components.ts:121 | ConditionalExpression | `if (spec.action === 'A_counter' && spec.trigger !== 'T_block' && spec.` | `true` |
| content/components.ts:121 | StringLiteral | `if (spec.action === 'A_counter' && spec.trigger !== 'T_block' && spec.` | `""` |
| content/components.ts:122 | StringLiteral | `problems.push('反击主招只接受格挡或闪避起势');` | `""` |
| content/components.ts:125 | ConditionalExpression | `if (!MODIFIERS[spec.modifier]) problems.push(`未知劲力组件：${spec.modifier}`` | `false` |
| content/components.ts:125 | StringLiteral | `if (!MODIFIERS[spec.modifier]) problems.push(`未知劲力组件：${spec.modifier}`` | ```` |
| content/components.ts:126 | StringLiteral | `else if (!isAttack) problems.push('劲力只能装在攻击主招上');` | `""` |
| content/components.ts:127 | ConditionalExpression | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `false` |
| content/components.ts:127 | ConditionalExpression | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `true` |
| content/components.ts:127 | LogicalOperator | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `spec.modifier === 'M_soft' \|\| spec.modif` |
| content/components.ts:127 | ConditionalExpression | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `true` |
| content/components.ts:127 | LogicalOperator | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `spec.modifier === 'M_soft' && spec.modif` |
| content/components.ts:127 | ConditionalExpression | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `false` |
| content/components.ts:127 | EqualityOperator | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `spec.modifier !== 'M_soft'` |
| content/components.ts:127 | StringLiteral | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `""` |
| content/components.ts:127 | ConditionalExpression | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `false` |
| content/components.ts:127 | EqualityOperator | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `spec.modifier !== 'M_shock'` |
| content/components.ts:127 | StringLiteral | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `""` |
| content/components.ts:127 | OptionalChaining | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `tier.hits` |
| content/components.ts:127 | OptionalChaining | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `tier.hits[0].hp` |
| content/components.ts:127 | BlockStatement | `else if ((spec.modifier === 'M_soft' \|\| spec.modifier === 'M_shock') &` | `{}` |
| content/components.ts:128 | StringLiteral | `problems.push('柔劲、震劲要求主招原始首次气血威力至少 2');` | `""` |
| content/components.ts:131 | ConditionalExpression | `if (spec.followup) {` | `false` |
| content/components.ts:131 | BlockStatement | `if (spec.followup) {` | `{}` |
| content/components.ts:132 | BooleanLiteral | `if (!FOLLOWUPS[spec.followup]) problems.push(`未知变化组件：${spec.followup}`` | `FOLLOWUPS[spec.followup]` |
| content/components.ts:132 | ConditionalExpression | `if (!FOLLOWUPS[spec.followup]) problems.push(`未知变化组件：${spec.followup}`` | `true` |
| content/components.ts:132 | StringLiteral | `if (!FOLLOWUPS[spec.followup]) problems.push(`未知变化组件：${spec.followup}`` | ```` |
| content/components.ts:132 | ConditionalExpression | `if (!FOLLOWUPS[spec.followup]) problems.push(`未知变化组件：${spec.followup}`` | `false` |
| content/components.ts:133 | BooleanLiteral | `else if (!isAttack) problems.push('变化只能装在攻击主招上');` | `isAttack` |
| content/components.ts:133 | ConditionalExpression | `else if (!isAttack) problems.push('变化只能装在攻击主招上');` | `true` |
| content/components.ts:133 | ConditionalExpression | `else if (!isAttack) problems.push('变化只能装在攻击主招上');` | `false` |
| content/components.ts:133 | StringLiteral | `else if (!isAttack) problems.push('变化只能装在攻击主招上');` | `""` |
| content/components.ts:134 | ConditionalExpression | `else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_co` | `true` |
| content/components.ts:134 | ConditionalExpression | `else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_co` | `false` |
| content/components.ts:134 | LogicalOperator | `else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_co` | `spec.followup === 'F_freeze_combo' \|\| sp` |
| content/components.ts:134 | ConditionalExpression | `else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_co` | `true` |
| content/components.ts:134 | EqualityOperator | `else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_co` | `spec.followup !== 'F_freeze_combo'` |
| content/components.ts:134 | StringLiteral | `else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_co` | `""` |
| content/components.ts:134 | ConditionalExpression | `else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_co` | `true` |
| content/components.ts:134 | EqualityOperator | `else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_co` | `spec.modifier === 'M_cold'` |
| content/components.ts:134 | StringLiteral | `else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_co` | `""` |
| content/components.ts:134 | BlockStatement | `else if (spec.followup === 'F_freeze_combo' && spec.modifier !== 'M_co` | `{}` |
| content/components.ts:135 | StringLiteral | `problems.push('冻结追击必须与本门寒劲共同装配');` | `""` |
| content/components.ts:139 | ConditionalExpression | `if (!RECOVERIES[spec.recovery]) problems.push(`未知收势组件：${spec.recovery}` | `false` |
| content/components.ts:139 | StringLiteral | `if (!RECOVERIES[spec.recovery]) problems.push(`未知收势组件：${spec.recovery}` | ```` |
| content/components.ts:140 | ConditionalExpression | `else if (spec.recovery === 'R_qi' && !isAttack) problems.push('伤血回气只兼容` | `false` |
| content/components.ts:140 | StringLiteral | `else if (spec.recovery === 'R_qi' && !isAttack) problems.push('伤血回气只兼容` | `""` |
| content/components.ts:140 | StringLiteral | `else if (spec.recovery === 'R_qi' && !isAttack) problems.push('伤血回气只兼容` | `""` |
| content/components.ts:141 | StringLiteral | `else if (spec.recovery === 'R_posture' && isAttack) problems.push('复架势` | `""` |
| content/components.ts:144 | OptionalChaining | `const swordOnly = spec.swordOnly \|\| action.swordOnly \|\| (spec.followup` | `FOLLOWUPS[spec.followup].def` |
| content/components.ts:145 | StringLiteral | `if (swordOnly) problems.push('该秘籍带剑专用组件，当前兵器不是剑');` | `""` |
| content/components.ts:153 | ConditionalExpression | `case 'T_dodge': return { kind: 'dodge' };` | `case 'T_dodge':` |
| content/components.ts:153 | ObjectLiteral | `case 'T_dodge': return { kind: 'dodge' };` | `{}` |
| content/components.ts:153 | StringLiteral | `case 'T_dodge': return { kind: 'dodge' };` | `""` |
| content/components.ts:157 | ObjectLiteral | `case 'T_status': return { kind: 'status', condition: spec.triggerParam` | `{}` |
| content/components.ts:157 | StringLiteral | `case 'T_status': return { kind: 'status', condition: spec.triggerParam` | `""` |
| content/components.ts:164 | ConditionalExpression | `if (problems.length > 0) throw new Error(`${spec.id} 不合法：${problems.jo` | `false` |
| content/components.ts:164 | StringLiteral | `if (problems.length > 0) throw new Error(`${spec.id} 不合法：${problems.jo` | `""` |
| content/components.ts:164 | StringLiteral | `if (problems.length > 0) throw new Error(`${spec.id} 不合法：${problems.jo` | ```` |
| content/components.ts:170 | ConditionalExpression | `const isAttack = action.kind === 'attack';` | `false` |
| content/components.ts:170 | StringLiteral | `const isAttack = action.kind === 'attack';` | `""` |
| content/components.ts:173 | ArithmeticOperator | `const capacity = tier.capacity + (mod?.capacity ?? 0) + (fol?.capacity` | `tier.capacity + (mod?.capacity ?? 0) - (` |
| content/components.ts:178 | StringLiteral | `actionDef = { kind: 'qi', amount: tier.amount! };` | `""` |
| content/components.ts:189 | ObjectLiteral | `followup: fol ? { ...fol.def, hits: fol.def.hits.map((h) => ({ ...h })` | `{}` |
| content/components.ts:189 | ArrowFunction | `followup: fol ? { ...fol.def, hits: fol.def.hits.map((h) => ({ ...h })` | `() => undefined` |
| content/components.ts:189 | ObjectLiteral | `followup: fol ? { ...fol.def, hits: fol.def.hits.map((h) => ({ ...h })` | `{}` |
| content/components.ts:193 | BooleanLiteral | `perRound: spec.perRound ?? false,` | `true` |
| engine/round.ts:63 | StringLiteral | `private phase: Phase = 'intent';` | `""` |
| engine/round.ts:84 | ConditionalExpression | `return side === 'player' ? (this.mods.reserve ?? this.s.player.reserve` | `true` |
| engine/round.ts:103 | UpdateOperator | `s.eventsThisRound++;` | `s.eventsThisRound--` |
| engine/round.ts:105 | ConditionalExpression | `if (this.root !== null) this.rootEvents++;` | `true` |
| engine/round.ts:104 | UpdateOperator | `s.eventsThisBattle++;` | `s.eventsThisBattle--` |
| engine/round.ts:106 | ConditionalExpression | `if (type !== 'battleEnd') {` | `true` |
| engine/round.ts:106 | StringLiteral | `if (type !== 'battleEnd') {` | `""` |
| engine/round.ts:108 | ConditionalExpression | `if (this.root !== null && this.rootEvents > l.eventsPerRoot) this.halt` | `true` |
| engine/round.ts:108 | EqualityOperator | `if (this.root !== null && this.rootEvents > l.eventsPerRoot) this.halt` | `this.root === null` |
| engine/round.ts:108 | EqualityOperator | `if (this.root !== null && this.rootEvents > l.eventsPerRoot) this.halt` | `this.rootEvents >= l.eventsPerRoot` |
| engine/round.ts:108 | StringLiteral | `if (this.root !== null && this.rootEvents > l.eventsPerRoot) this.halt` | ```` |
| engine/round.ts:109 | ConditionalExpression | `if (s.eventsThisRound > l.eventsPerRound) this.halt('safetyLimit', nul` | `false` |
| engine/round.ts:109 | EqualityOperator | `if (s.eventsThisRound > l.eventsPerRound) this.halt('safetyLimit', nul` | `s.eventsThisRound >= l.eventsPerRound` |
| engine/round.ts:109 | StringLiteral | `if (s.eventsThisRound > l.eventsPerRound) this.halt('safetyLimit', nul` | `""` |
| engine/round.ts:109 | StringLiteral | `if (s.eventsThisRound > l.eventsPerRound) this.halt('safetyLimit', nul` | ```` |
| engine/round.ts:110 | ConditionalExpression | `if (s.eventsThisBattle > l.eventsPerBattle) this.halt('safetyLimit', n` | `false` |
| engine/round.ts:110 | EqualityOperator | `if (s.eventsThisBattle > l.eventsPerBattle) this.halt('safetyLimit', n` | `s.eventsThisBattle >= l.eventsPerBattle` |
| engine/round.ts:110 | StringLiteral | `if (s.eventsThisBattle > l.eventsPerBattle) this.halt('safetyLimit', n` | ```` |
| engine/round.ts:110 | StringLiteral | `if (s.eventsThisBattle > l.eventsPerBattle) this.halt('safetyLimit', n` | `""` |
| engine/round.ts:116 | ConditionalExpression | `if (!this.s.over) {` | `true` |
| engine/round.ts:118 | ObjectLiteral | `this.emit('battleEnd', winner, null, { reason, detail });` | `{}` |
| engine/round.ts:124 | UpdateOperator | `this.root = this.s.nextRootId++;` | `this.s.nextRootId--` |
| engine/round.ts:133 | ConditionalExpression | `if (w && this.root !== null && w.lockedRoot === this.root) {` | `true` |
| engine/round.ts:135 | ObjectLiteral | `this.emit('wardConsumed', side, null, { scope: 'chain' });` | `{}` |
| engine/round.ts:135 | StringLiteral | `this.emit('wardConsumed', side, null, { scope: 'chain' });` | `""` |
| engine/round.ts:141 | BlockStatement | `private wasOffered(ev: BattleEvent, side: Side): boolean {` | `{}` |
| engine/round.ts:142 | LogicalOperator | `return this.offered.get(ev.seq)?.has(side) ?? false;` | `this.offered.get(ev.seq)?.has(side) && f` |
| engine/round.ts:145 | BlockStatement | `private markOffered(ev: BattleEvent, side: Side): void {` | `{}` |
| engine/round.ts:147 | ConditionalExpression | `if (!set) this.offered.set(ev.seq, (set = new Set()));` | `true` |
| engine/round.ts:152 | MethodExpression | `return this.events.slice(mark);` | `this.events` |
| engine/round.ts:159 | ConditionalExpression | `if (f.qi > before) this.emit('qi', side, null, { before, after: f.qi, ` | `true` |
| engine/round.ts:159 | EqualityOperator | `if (f.qi > before) this.emit('qi', side, null, { before, after: f.qi, ` | `f.qi >= before` |
| engine/round.ts:166 | ConditionalExpression | `if (f.posture > before) this.emit('posture', side, null, { before, aft` | `true` |
| engine/round.ts:166 | EqualityOperator | `if (f.posture > before) this.emit('posture', side, null, { before, aft` | `f.posture >= before` |
| engine/round.ts:177 | ConditionalExpression | `if (f.status.freezePending && f.status.protectedSeq !== seq) {` | `true` |
| engine/round.ts:178 | BooleanLiteral | `f.status.freezePending = false;` | `true` |
| engine/round.ts:180 | ObjectLiteral | `this.emit('freezeSkip', side, null, { seq, stance });` | `{}` |
| engine/round.ts:184 | StringLiteral | `return 'go';` | `""` |
| engine/round.ts:193 | ObjectLiteral | `this.emit('openingExpired', side, null, { seq: f.actionSeq });` | `{}` |
| engine/round.ts:195 | ConditionalExpression | `if (f.status.protectedSeq !== null && f.actionSeq >= f.status.protecte` | `false` |
| engine/round.ts:195 | ConditionalExpression | `if (f.status.protectedSeq !== null && f.actionSeq >= f.status.protecte` | `true` |
| engine/round.ts:195 | EqualityOperator | `if (f.status.protectedSeq !== null && f.actionSeq >= f.status.protecte` | `f.status.protectedSeq === null` |
| engine/round.ts:195 | EqualityOperator | `if (f.status.protectedSeq !== null && f.actionSeq >= f.status.protecte` | `f.actionSeq > f.status.protectedSeq` |
| engine/round.ts:197 | BooleanLiteral | `f.status.coldCapReduced = false;` | `true` |
| engine/round.ts:195 | BlockStatement | `if (f.status.protectedSeq !== null && f.actionSeq >= f.status.protecte` | `{}` |
| engine/round.ts:206 | ConditionalExpression | `if (after === before) return false;` | `false` |
| engine/round.ts:206 | BooleanLiteral | `if (after === before) return false;` | `true` |
| engine/round.ts:216 | BooleanLiteral | `return false;` | `true` |
| engine/round.ts:214 | BooleanLiteral | `return true;` | `false` |
| engine/round.ts:228 | BooleanLiteral | `let froze = false;` | `true` |
| engine/round.ts:235 | ConditionalExpression | `const first = contacts === 0;` | `true` |
| engine/round.ts:238 | ConditionalExpression | `if (first) {` | `true` |
| engine/round.ts:242 | ObjectLiteral | `this.emit('openingConsumed', side, o.artId, { bonus: OPENING_BONUS }, ` | `{}` |
| engine/round.ts:246 | AssignmentOperator | `posture += 4;` | `posture -= 4` |
| engine/round.ts:254 | ConditionalExpression | `const chain = ward.source === 'basic' && this.s.rules.wardScope === 'c` | `true` |
| engine/round.ts:256 | ConditionalExpression | `? ward.lockedRoot === null \|\| ward.lockedRoot === this.root` | `true` |
| engine/round.ts:257 | ConditionalExpression | `: ward.lockedCast === null \|\| ward.lockedCast === o.castId;` | `true` |
| engine/round.ts:257 | ConditionalExpression | `: ward.lockedCast === null \|\| ward.lockedCast === o.castId;` | `false` |
| engine/round.ts:257 | EqualityOperator | `: ward.lockedCast === null \|\| ward.lockedCast === o.castId;` | `ward.lockedCast !== o.castId` |
| engine/round.ts:258 | ConditionalExpression | `if (free) {` | `true` |
| engine/round.ts:261 | LogicalOperator | `blocked = t.posture > 0 && !t.status.crashedThisRound;` | `t.posture > 0 \|\| !t.status.crashedThisRo` |
| engine/round.ts:261 | ConditionalExpression | `blocked = t.posture > 0 && !t.status.crashedThisRound;` | `true` |
| engine/round.ts:261 | EqualityOperator | `blocked = t.posture > 0 && !t.status.crashedThisRound;` | `t.posture >= 0` |
| engine/round.ts:276 | ObjectLiteral | `if (blocked) this.emit('block', targetSide, null, { attacker: side }, ` | `{}` |
| engine/round.ts:278 | StringLiteral | `this.emit('death', targetSide, null, {}, o.castId, o.depth);` | `""` |
| engine/round.ts:279 | StringLiteral | `this.halt(side === 'player' ? 'victory' : 'defeat', side, `${t.name}气血` | ```` |
| engine/round.ts:281 | ConditionalExpression | `if (postureBefore > 0 && t.posture === 0 && !t.status.crashedThisRound` | `true` |
| engine/round.ts:281 | EqualityOperator | `if (postureBefore > 0 && t.posture === 0 && !t.status.crashedThisRound` | `postureBefore >= 0` |
| engine/round.ts:283 | ObjectLiteral | `this.emit('crash', targetSide, null, { by: side }, o.castId, o.depth);` | `{}` |
| engine/round.ts:284 | ConditionalExpression | `if (!a.status.opening) {` | `true` |
| engine/round.ts:286 | StringLiteral | `this.emit('opening', side, null, { expiresAfterSeq: a.actionSeq + 1 },` | `""` |
| engine/round.ts:286 | ObjectLiteral | `this.emit('opening', side, null, { expiresAfterSeq: a.actionSeq + 1 },` | `{}` |
| engine/round.ts:286 | ArithmeticOperator | `this.emit('opening', side, null, { expiresAfterSeq: a.actionSeq + 1 },` | `a.actionSeq - 1` |
| engine/round.ts:289 | ConditionalExpression | `if (first && o.modifier === 'soft') this.gainPosture(side, 2, 'soft', ` | `false` |
| engine/round.ts:289 | StringLiteral | `if (first && o.modifier === 'soft') this.gainPosture(side, 2, 'soft', ` | `""` |
| engine/round.ts:289 | StringLiteral | `if (first && o.modifier === 'soft') this.gainPosture(side, 2, 'soft', ` | `""` |
| engine/round.ts:290 | BooleanLiteral | `if (o.modifier === 'cold' && this.applyCold(targetSide, 1, o.castId, o` | `false` |
| engine/round.ts:294 | StringLiteral | `this.emit('wardConsumed', targetSide, null, {}, o.castId, o.depth);` | `""` |
| engine/round.ts:306 | ConditionalExpression | `return ev.type === 'hit' && ev.side === side && ev.data.basic === true` | `true` |
| engine/round.ts:306 | ConditionalExpression | `return ev.type === 'hit' && ev.side === side && ev.data.basic === true` | `true` |
| engine/round.ts:307 | ConditionalExpression | `case 'dodge':` | `case 'dodge':` |
| engine/round.ts:307 | StringLiteral | `case 'dodge':` | `""` |
| engine/round.ts:308 | ConditionalExpression | `return ev.type === 'dodge' && ev.side === side;` | `false` |
| engine/round.ts:308 | StringLiteral | `return ev.type === 'dodge' && ev.side === side;` | `""` |
| engine/round.ts:308 | ConditionalExpression | `return ev.type === 'dodge' && ev.side === side;` | `true` |
| engine/round.ts:308 | EqualityOperator | `return ev.type === 'dodge' && ev.side === side;` | `ev.side !== side` |
| engine/round.ts:312 | ConditionalExpression | `return ev.type === 'crash' && ev.side === opp;` | `true` |
| engine/round.ts:314 | ConditionalExpression | `if (ev.type !== 'qi' \|\| ev.side !== side) return false;` | `false` |
| engine/round.ts:314 | LogicalOperator | `if (ev.type !== 'qi' \|\| ev.side !== side) return false;` | `ev.type !== 'qi' && ev.side !== side` |
| engine/round.ts:314 | ConditionalExpression | `if (ev.type !== 'qi' \|\| ev.side !== side) return false;` | `false` |
| engine/round.ts:314 | ConditionalExpression | `if (ev.type !== 'qi' \|\| ev.side !== side) return false;` | `false` |
| engine/round.ts:317 | ConditionalExpression | `return before < trigger.threshold && after >= trigger.threshold;` | `true` |
| engine/round.ts:317 | LogicalOperator | `return before < trigger.threshold && after >= trigger.threshold;` | `before < trigger.threshold \|\| after >= t` |
| engine/round.ts:317 | ConditionalExpression | `return before < trigger.threshold && after >= trigger.threshold;` | `true` |
| engine/round.ts:317 | EqualityOperator | `return before < trigger.threshold && after >= trigger.threshold;` | `before <= trigger.threshold` |
| engine/round.ts:317 | ConditionalExpression | `return before < trigger.threshold && after >= trigger.threshold;` | `true` |
| engine/round.ts:319 | StringLiteral | `case 'status':` | `""` |
| engine/round.ts:320 | ConditionalExpression | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `true` |
| engine/round.ts:319 | ConditionalExpression | `case 'status':` | `case 'status':` |
| engine/round.ts:320 | ConditionalExpression | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `false` |
| engine/round.ts:320 | EqualityOperator | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `trigger.condition !== 'freeze'` |
| engine/round.ts:320 | StringLiteral | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `""` |
| engine/round.ts:320 | LogicalOperator | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `ev.type === 'freeze' \|\| ev.side === opp` |
| engine/round.ts:320 | ConditionalExpression | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `false` |
| engine/round.ts:320 | ConditionalExpression | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `true` |
| engine/round.ts:320 | EqualityOperator | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `ev.type !== 'freeze'` |
| engine/round.ts:320 | ConditionalExpression | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `true` |
| engine/round.ts:320 | StringLiteral | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `""` |
| engine/round.ts:320 | EqualityOperator | `if (trigger.condition === 'freeze') return ev.type === 'freeze' && ev.` | `ev.side !== opp` |
| engine/round.ts:321 | ConditionalExpression | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `false` |
| engine/round.ts:321 | ConditionalExpression | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `true` |
| engine/round.ts:321 | LogicalOperator | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `ev.type === 'cold' && ev.side === opp &&` |
| engine/round.ts:321 | ConditionalExpression | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `true` |
| engine/round.ts:321 | ConditionalExpression | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `true` |
| engine/round.ts:321 | LogicalOperator | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `ev.type === 'cold' && ev.side === opp \|\|` |
| engine/round.ts:321 | LogicalOperator | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `ev.type === 'cold' \|\| ev.side === opp` |
| engine/round.ts:321 | ConditionalExpression | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `true` |
| engine/round.ts:321 | EqualityOperator | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `ev.type !== 'cold'` |
| engine/round.ts:321 | StringLiteral | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `""` |
| engine/round.ts:321 | ConditionalExpression | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `true` |
| engine/round.ts:321 | ConditionalExpression | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `true` |
| engine/round.ts:321 | EqualityOperator | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `ev.data.before as number <= 2` |
| engine/round.ts:321 | EqualityOperator | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `ev.side !== opp` |
| engine/round.ts:321 | EqualityOperator | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `ev.data.before as number >= 2` |
| engine/round.ts:321 | ConditionalExpression | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `true` |
| engine/round.ts:321 | EqualityOperator | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `ev.data.after as number > 2` |
| engine/round.ts:321 | EqualityOperator | `return ev.type === 'cold' && ev.side === opp && (ev.data.before as num` | `ev.data.after as number < 2` |
| engine/round.ts:323 | LogicalOperator | `return ev.type === 'mainEnd' && ev.side === opp && ev.data.target === ` | `ev.type === 'mainEnd' && ev.side === opp` |
| engine/round.ts:323 | ConditionalExpression | `return ev.type === 'mainEnd' && ev.side === opp && ev.data.target === ` | `true` |
| engine/round.ts:323 | ConditionalExpression | `return ev.type === 'mainEnd' && ev.side === opp && ev.data.target === ` | `true` |
| engine/round.ts:323 | LogicalOperator | `return ev.type === 'mainEnd' && ev.side === opp && ev.data.target === ` | `ev.type === 'mainEnd' \|\| ev.side === opp` |
| engine/round.ts:323 | ConditionalExpression | `return ev.type === 'mainEnd' && ev.side === opp && ev.data.target === ` | `true` |
| engine/round.ts:323 | ConditionalExpression | `return ev.type === 'mainEnd' && ev.side === opp && ev.data.target === ` | `true` |
| engine/round.ts:323 | ConditionalExpression | `return ev.type === 'mainEnd' && ev.side === opp && ev.data.target === ` | `true` |
| engine/round.ts:329 | ConditionalExpression | `if (side !== 'player' \|\| !this.mods.priority) return arts;` | `false` |
| engine/round.ts:334 | ConditionalExpression | `return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) \|\| x.slot - y.slot;` | `false` |
| engine/round.ts:334 | ConditionalExpression | `return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) \|\| x.slot - y.slot;` | `true` |
| engine/round.ts:334 | ConditionalExpression | `return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) \|\| x.slot - y.slot;` | `false` |
| engine/round.ts:334 | EqualityOperator | `return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) \|\| x.slot - y.slot;` | `iy <= 0` |
| engine/round.ts:334 | EqualityOperator | `return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) \|\| x.slot - y.slot;` | `iy >= 0` |
| engine/round.ts:334 | ArithmeticOperator | `return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) \|\| x.slot - y.slot;` | `x.slot + y.slot` |
| engine/round.ts:339 | ConditionalExpression | `const blocked = side === 'player' ? this.mods.paused : this.s.intent?.` | `true` |
| engine/round.ts:339 | OptionalChaining | `const blocked = side === 'player' ? this.mods.paused : this.s.intent?.` | `this.s.intent.disabled` |
| engine/round.ts:339 | LogicalOperator | `const blocked = side === 'player' ? this.mods.paused : this.s.intent?.` | `this.s.intent?.disabled && []` |
| engine/round.ts:339 | ArrayDeclaration | `const blocked = side === 'player' ? this.mods.paused : this.s.intent?.` | `["Stryker was here"]` |
| engine/round.ts:354 | MethodExpression | `let pending = facts.filter((ev) => !this.wasOffered(ev, side));` | `facts` |
| engine/round.ts:355 | EqualityOperator | `while (pending.length > 0) {` | `pending.length >= 0` |
| engine/round.ts:358 | ConditionalExpression | `if (cands.length === 0) return;` | `false` |
| engine/round.ts:361 | MethodExpression | `pending = this.since(mark).filter((ev) => !this.wasOffered(ev, side));` | `this.since(mark)` |
| engine/round.ts:372 | ConditionalExpression | `if (f.hp <= 0) return;` | `false` |
| engine/round.ts:372 | EqualityOperator | `if (f.hp <= 0) return;` | `f.hp < 0` |
| engine/round.ts:373 | EqualityOperator | `if (depth > this.s.limits.maxDepth) this.halt('safetyLimit', null, `连锁` | `depth >= this.s.limits.maxDepth` |
| engine/round.ts:373 | ConditionalExpression | `if (depth > this.s.limits.maxDepth) this.halt('safetyLimit', null, `连锁` | `false` |
| engine/round.ts:373 | StringLiteral | `if (depth > this.s.limits.maxDepth) this.halt('safetyLimit', null, `连锁` | `""` |
| engine/round.ts:373 | StringLiteral | `if (depth > this.s.limits.maxDepth) this.halt('safetyLimit', null, `连锁` | ```` |
| engine/round.ts:376 | ConditionalExpression | `if (art.perRound && this.s.roundUsage.includes(key)) return this.skip(` | `false` |
| engine/round.ts:376 | StringLiteral | `if (art.perRound && this.s.roundUsage.includes(key)) return this.skip(` | `""` |
| engine/round.ts:378 | ConditionalExpression | `if (act.kind === 'ward' && f.status.ward) return this.skip(side, art.i` | `false` |
| engine/round.ts:378 | StringLiteral | `if (act.kind === 'ward' && f.status.ward) return this.skip(side, art.i` | `""` |
| engine/round.ts:378 | StringLiteral | `if (act.kind === 'ward' && f.status.ward) return this.skip(side, art.i` | `""` |
| engine/round.ts:379 | ConditionalExpression | `if (act.kind === 'step' && f.status.step) return this.skip(side, art.i` | `true` |
| engine/round.ts:379 | ConditionalExpression | `if (act.kind === 'step' && f.status.step) return this.skip(side, art.i` | `false` |
| engine/round.ts:379 | EqualityOperator | `if (act.kind === 'step' && f.status.step) return this.skip(side, art.i` | `act.kind !== 'step'` |
| engine/round.ts:379 | StringLiteral | `if (act.kind === 'step' && f.status.step) return this.skip(side, art.i` | `""` |
| engine/round.ts:379 | StringLiteral | `if (act.kind === 'step' && f.status.step) return this.skip(side, art.i` | `""` |
| engine/round.ts:380 | ConditionalExpression | `if (act.kind === 'qi') {` | `false` |
| engine/round.ts:380 | StringLiteral | `if (act.kind === 'qi') {` | `""` |
| engine/round.ts:380 | BlockStatement | `if (act.kind === 'qi') {` | `{}` |
| engine/round.ts:381 | ConditionalExpression | `const postureGain = art.recovery?.kind === 'postureOnComplete' && f.po` | `true` |
| engine/round.ts:381 | ConditionalExpression | `const postureGain = art.recovery?.kind === 'postureOnComplete' && f.po` | `false` |
| engine/round.ts:381 | LogicalOperator | `const postureGain = art.recovery?.kind === 'postureOnComplete' && f.po` | `art.recovery?.kind === 'postureOnComplet` |
| engine/round.ts:381 | ConditionalExpression | `const postureGain = art.recovery?.kind === 'postureOnComplete' && f.po` | `true` |
| engine/round.ts:381 | EqualityOperator | `const postureGain = art.recovery?.kind === 'postureOnComplete' && f.po` | `art.recovery?.kind !== 'postureOnComplet` |
| engine/round.ts:381 | StringLiteral | `const postureGain = art.recovery?.kind === 'postureOnComplete' && f.po` | `""` |
| engine/round.ts:381 | ConditionalExpression | `const postureGain = art.recovery?.kind === 'postureOnComplete' && f.po` | `true` |
| engine/round.ts:381 | EqualityOperator | `const postureGain = art.recovery?.kind === 'postureOnComplete' && f.po` | `f.posture <= f.postureMax` |
| engine/round.ts:381 | EqualityOperator | `const postureGain = art.recovery?.kind === 'postureOnComplete' && f.po` | `f.posture >= f.postureMax` |
| engine/round.ts:382 | ConditionalExpression | `if (f.qi >= f.qiMax && !postureGain) return this.skip(side, art.id, 'n` | `false` |
| engine/round.ts:382 | EqualityOperator | `if (f.qi >= f.qiMax && !postureGain) return this.skip(side, art.id, 'n` | `f.qi > f.qiMax` |
| engine/round.ts:382 | BooleanLiteral | `if (f.qi >= f.qiMax && !postureGain) return this.skip(side, art.id, 'n` | `postureGain` |
| engine/round.ts:382 | StringLiteral | `if (f.qi >= f.qiMax && !postureGain) return this.skip(side, art.id, 'n` | `""` |
| engine/round.ts:384 | ConditionalExpression | `const isAttack = act.kind === 'attack';` | `true` |
| engine/round.ts:385 | EqualityOperator | `if (f.qi < art.cost) return this.skip(side, art.id, 'insufficientQi', ` | `f.qi <= art.cost` |
| engine/round.ts:385 | ObjectLiteral | `if (f.qi < art.cost) return this.skip(side, art.id, 'insufficientQi', ` | `{}` |
| engine/round.ts:386 | EqualityOperator | `if (isAttack && f.qi - art.cost < this.reserve(side)) {` | `f.qi - art.cost <= this.reserve(side)` |
| engine/round.ts:387 | ObjectLiteral | `return this.skip(side, art.id, 'reserve', depth, { cost: art.cost, qi:` | `{}` |
| engine/round.ts:391 | ConditionalExpression | `if (art.perRound) this.s.roundUsage.push(key);` | `true` |
| engine/round.ts:389 | UpdateOperator | `const castId = this.s.nextCastId++;` | `this.s.nextCastId--` |
| engine/round.ts:391 | ConditionalExpression | `if (art.perRound) this.s.roundUsage.push(key);` | `false` |
| engine/round.ts:392 | ObjectLiteral | `this.emit('cast', side, art.id, { trigger: c.fact.seq, cost: art.cost ` | `{}` |
| engine/round.ts:393 | ConditionalExpression | `if (art.cost > 0) {` | `true` |
| engine/round.ts:393 | EqualityOperator | `if (art.cost > 0) {` | `art.cost >= 0` |
| engine/round.ts:413 | ArithmeticOperator | `this.processBatches(target, this.since(mark), depth + 1);` | `depth - 1` |
| engine/round.ts:414 | EqualityOperator | `if (f.hp <= 0) return;` | `f.hp < 0` |
| engine/round.ts:414 | ConditionalExpression | `if (f.hp <= 0) return;` | `false` |
| engine/round.ts:416 | ConditionalExpression | `if (fu && (fu.kind === 'onHpDamage' ? res.hpDamage > 0 : res.froze)) t` | `false` |
| engine/round.ts:416 | ConditionalExpression | `if (fu && (fu.kind === 'onHpDamage' ? res.hpDamage > 0 : res.froze)) t` | `false` |
| engine/round.ts:416 | ConditionalExpression | `if (fu && (fu.kind === 'onHpDamage' ? res.hpDamage > 0 : res.froze)) t` | `true` |
| engine/round.ts:416 | StringLiteral | `if (fu && (fu.kind === 'onHpDamage' ? res.hpDamage > 0 : res.froze)) t` | `""` |
| engine/round.ts:416 | EqualityOperator | `if (fu && (fu.kind === 'onHpDamage' ? res.hpDamage > 0 : res.froze)) t` | `fu.kind !== 'onHpDamage'` |
| engine/round.ts:416 | ConditionalExpression | `if (fu && (fu.kind === 'onHpDamage' ? res.hpDamage > 0 : res.froze)) t` | `true` |
| engine/round.ts:416 | ConditionalExpression | `if (fu && (fu.kind === 'onHpDamage' ? res.hpDamage > 0 : res.froze)) t` | `false` |
| engine/round.ts:416 | EqualityOperator | `if (fu && (fu.kind === 'onHpDamage' ? res.hpDamage > 0 : res.froze)) t` | `res.hpDamage >= 0` |
| engine/round.ts:416 | EqualityOperator | `if (fu && (fu.kind === 'onHpDamage' ? res.hpDamage > 0 : res.froze)) t` | `res.hpDamage <= 0` |
| engine/round.ts:417 | ConditionalExpression | `if (art.recovery?.kind === 'qiOnHpDamage' && res.hpDamage > 0) this.ga` | `true` |
| engine/round.ts:417 | EqualityOperator | `if (art.recovery?.kind === 'qiOnHpDamage' && res.hpDamage > 0) this.ga` | `res.hpDamage >= 0` |
| engine/round.ts:419 | StringLiteral | `f.status.ward = { source: 'skill', expiresRound: this.s.round + 1, loc` | `""` |
| engine/round.ts:419 | ArithmeticOperator | `f.status.ward = { source: 'skill', expiresRound: this.s.round + 1, loc` | `this.s.round - 1` |
| engine/round.ts:420 | StringLiteral | `this.emit('ward', side, art.id, { source: 'skill', expiresRound: this.` | `""` |
| engine/round.ts:420 | ObjectLiteral | `this.emit('ward', side, art.id, { source: 'skill', expiresRound: this.` | `{}` |
| engine/round.ts:420 | ArithmeticOperator | `this.emit('ward', side, art.id, { source: 'skill', expiresRound: this.` | `this.s.round - 1` |
| engine/round.ts:420 | StringLiteral | `this.emit('ward', side, art.id, { source: 'skill', expiresRound: this.` | `""` |
| engine/round.ts:422 | ObjectLiteral | `f.status.step = { expiresRound: this.s.round + 1 };` | `{}` |
| engine/round.ts:422 | ArithmeticOperator | `f.status.step = { expiresRound: this.s.round + 1 };` | `this.s.round - 1` |
| engine/round.ts:423 | StringLiteral | `this.emit('step', side, art.id, { expiresRound: this.s.round + 1 }, ca` | `""` |
| engine/round.ts:423 | ObjectLiteral | `this.emit('step', side, art.id, { expiresRound: this.s.round + 1 }, ca` | `{}` |
| engine/round.ts:423 | ArithmeticOperator | `this.emit('step', side, art.id, { expiresRound: this.s.round + 1 }, ca` | `this.s.round - 1` |
| engine/round.ts:427 | ConditionalExpression | `if (art.recovery?.kind === 'postureOnComplete') this.gainPosture(side,` | `false` |
| engine/round.ts:427 | StringLiteral | `if (art.recovery?.kind === 'postureOnComplete') this.gainPosture(side,` | `""` |
| engine/round.ts:428 | StringLiteral | `this.emit('complete', side, art.id, {}, castId, depth);` | `""` |
| engine/round.ts:434 | StringLiteral | `const id = `${inst.art.id}:followup`;` | ```` |
| engine/round.ts:435 | StringLiteral | `const key = `${side}:${inst.instanceId}:followup`;` | ```` |
| engine/round.ts:432 | BlockStatement | `private followup(side: Side, inst: ArtInstance, hits: Power[], cost: n` | `{}` |
| engine/round.ts:436 | ConditionalExpression | `if (this.rootUsage.has(key)) return this.skip(side, id, 'rootLimit', d` | `true` |
| engine/round.ts:436 | ConditionalExpression | `if (this.rootUsage.has(key)) return this.skip(side, id, 'rootLimit', d` | `false` |
| engine/round.ts:437 | ConditionalExpression | `if (f.qi < cost) return this.skip(side, id, 'insufficientQi', depth, {` | `true` |
| engine/round.ts:436 | StringLiteral | `if (this.rootUsage.has(key)) return this.skip(side, id, 'rootLimit', d` | `""` |
| engine/round.ts:437 | ConditionalExpression | `if (f.qi < cost) return this.skip(side, id, 'insufficientQi', depth, {` | `false` |
| engine/round.ts:437 | EqualityOperator | `if (f.qi < cost) return this.skip(side, id, 'insufficientQi', depth, {` | `f.qi <= cost` |
| engine/round.ts:437 | EqualityOperator | `if (f.qi < cost) return this.skip(side, id, 'insufficientQi', depth, {` | `f.qi >= cost` |
| engine/round.ts:437 | ObjectLiteral | `if (f.qi < cost) return this.skip(side, id, 'insufficientQi', depth, {` | `{}` |
| engine/round.ts:437 | StringLiteral | `if (f.qi < cost) return this.skip(side, id, 'insufficientQi', depth, {` | `""` |
| engine/round.ts:438 | EqualityOperator | `if (f.qi - cost < this.reserve(side)) return this.skip(side, id, 'rese` | `f.qi - cost <= this.reserve(side)` |
| engine/round.ts:438 | ConditionalExpression | `if (f.qi - cost < this.reserve(side)) return this.skip(side, id, 'rese` | `false` |
| engine/round.ts:438 | ConditionalExpression | `if (f.qi - cost < this.reserve(side)) return this.skip(side, id, 'rese` | `true` |
| engine/round.ts:438 | EqualityOperator | `if (f.qi - cost < this.reserve(side)) return this.skip(side, id, 'rese` | `f.qi - cost >= this.reserve(side)` |
| engine/round.ts:438 | ArithmeticOperator | `if (f.qi - cost < this.reserve(side)) return this.skip(side, id, 'rese` | `f.qi + cost` |
| engine/round.ts:438 | StringLiteral | `if (f.qi - cost < this.reserve(side)) return this.skip(side, id, 'rese` | `""` |
| engine/round.ts:439 | UpdateOperator | `const castId = this.s.nextCastId++;` | `this.s.nextCastId--` |
| engine/round.ts:438 | ObjectLiteral | `if (f.qi - cost < this.reserve(side)) return this.skip(side, id, 'rese` | `{}` |
| engine/round.ts:441 | StringLiteral | `this.emit('cast', side, id, { cost }, castId, depth);` | `""` |
| engine/round.ts:441 | ObjectLiteral | `this.emit('cast', side, id, { cost }, castId, depth);` | `{}` |
| engine/round.ts:443 | AssignmentOperator | `f.qi -= cost;` | `f.qi += cost` |
| engine/round.ts:446 | BooleanLiteral | `this.executeHits(side, hits, { castId, artId: id, basic: false, modifi` | `true` |
| engine/round.ts:444 | StringLiteral | `this.emit('pay', side, id, { cost, before, after: f.qi }, castId, dept` | `""` |
| engine/round.ts:446 | ObjectLiteral | `this.executeHits(side, hits, { castId, artId: id, basic: false, modifi` | `{}` |
| engine/round.ts:444 | ObjectLiteral | `this.emit('pay', side, id, { cost, before, after: f.qi }, castId, dept` | `{}` |
| engine/round.ts:447 | ArithmeticOperator | `this.processBatches(other(side), this.since(mark), depth + 1);` | `depth - 1` |
| engine/round.ts:461 | StringLiteral | `this.emit('segmentDraw', 'enemy', null, { from: r.intent.segmentId, ne` | `""` |
| engine/round.ts:465 | StringLiteral | `this.emit('intent', 'enemy', null, { stance: r.intent.stance, segment:` | `""` |
| engine/round.ts:465 | StringLiteral | `this.emit('intent', 'enemy', null, { stance: r.intent.stance, segment:` | `""` |
| engine/round.ts:471 | ConditionalExpression | `if (s.round > s.limits.maxRounds) this.halt('roundLimit', null, `超过 ${` | `false` |
| engine/round.ts:471 | EqualityOperator | `if (s.round > s.limits.maxRounds) this.halt('roundLimit', null, `超过 ${` | `s.round >= s.limits.maxRounds` |
| engine/round.ts:471 | StringLiteral | `if (s.round > s.limits.maxRounds) this.halt('roundLimit', null, `超过 ${` | `""` |
| engine/round.ts:471 | StringLiteral | `if (s.round > s.limits.maxRounds) this.halt('roundLimit', null, `超过 ${` | ```` |
| engine/round.ts:473 | StringLiteral | `this.emit('decision', 'player', null, { stance: decision.stance });` | `""` |
| engine/round.ts:473 | StringLiteral | `this.emit('decision', 'player', null, { stance: decision.stance });` | `""` |
| engine/round.ts:473 | ObjectLiteral | `this.emit('decision', 'player', null, { stance: decision.stance });` | `{}` |
| engine/round.ts:475 | BlockStatement | `if (c) {` | `{}` |
| engine/round.ts:475 | ConditionalExpression | `if (c) {` | `false` |
| engine/round.ts:476 | StringLiteral | `const adjust = c.pause ? 'pause' : c.priority ? 'priority' : 'reserve'` | `""` |
| engine/round.ts:476 | StringLiteral | `const adjust = c.pause ? 'pause' : c.priority ? 'priority' : 'reserve'` | `""` |
| engine/round.ts:476 | StringLiteral | `const adjust = c.pause ? 'pause' : c.priority ? 'priority' : 'reserve'` | `""` |
| engine/round.ts:478 | StringLiteral | `this.emit('change', 'player', null, { changesLeft: s.changesLeft, adju` | `""` |
| engine/round.ts:477 | StringLiteral | `const value = c.pause ? c.pause[0]! : c.priority ? c.priority.join(','` | `""` |
| engine/round.ts:478 | StringLiteral | `this.emit('change', 'player', null, { changesLeft: s.changesLeft, adju` | `""` |
| engine/round.ts:478 | ObjectLiteral | `this.emit('change', 'player', null, { changesLeft: s.changesLeft, adju` | `{}` |
| engine/round.ts:483 | ArrayDeclaration | `const guards: { side: Side; before: number }[] = [];` | `["Stryker was here"]` |
| engine/round.ts:486 | StringLiteral | `if (this.takeOpportunity(side, 'guard') === 'skipped') continue;` | `""` |
| engine/round.ts:490 | ConditionalExpression | `if (!f.status.ward) f.status.ward = { source: 'basic', expiresRound: s` | `true` |
| engine/round.ts:497 | StringLiteral | `this.emit('guard', side, null, { postureBefore: before, postureAfter: ` | `""` |
| engine/round.ts:497 | ObjectLiteral | `this.emit('guard', side, null, { postureBefore: before, postureAfter: ` | `{}` |
| engine/round.ts:498 | ConditionalExpression | `if (f.posture > before) this.emit('posture', side, null, { before, aft` | `true` |
| engine/round.ts:498 | EqualityOperator | `if (f.posture > before) this.emit('posture', side, null, { before, aft` | `f.posture >= before` |
| engine/round.ts:498 | StringLiteral | `if (f.posture > before) this.emit('posture', side, null, { before, aft` | `""` |
| engine/round.ts:514 | ConditionalExpression | `if (after === before) continue;` | `false` |
| engine/round.ts:517 | StringLiteral | `this.emit('qi', side, null, { before, after, source: 'regen' });` | `""` |
| engine/round.ts:524 | StringLiteral | `this.phase = 'action';` | `""` |
| engine/round.ts:525 | ConditionalExpression | `const order: Side[] = s.rules.initiative === 'enemyOnAttack' && s.inte` | `true` |
| engine/round.ts:534 | UpdateOperator | `const castId = s.nextCastId++;` | `s.nextCastId--` |
| engine/round.ts:535 | ObjectLiteral | `this.emit('basicAttack', side, null, { weapon: f.weapon.id }, castId);` | `{}` |
| engine/round.ts:538 | ConditionalExpression | `if (f.hp > 0) this.processBatches(side, this.since(mark), 1);` | `true` |
| engine/round.ts:538 | EqualityOperator | `if (f.hp > 0) this.processBatches(side, this.since(mark), 1);` | `f.hp >= 0` |
| engine/round.ts:549 | StringLiteral | `this.phase = 'roundEnd';` | `""` |
| engine/round.ts:552 | ConditionalExpression | `if (f.status.ward && f.status.ward.expiresRound <= s.round) {` | `true` |
| engine/round.ts:552 | ConditionalExpression | `if (f.status.ward && f.status.ward.expiresRound <= s.round) {` | `false` |
| engine/round.ts:552 | ConditionalExpression | `if (f.status.ward && f.status.ward.expiresRound <= s.round) {` | `true` |
| engine/round.ts:552 | EqualityOperator | `if (f.status.ward && f.status.ward.expiresRound <= s.round) {` | `f.status.ward.expiresRound < s.round` |
| engine/round.ts:552 | EqualityOperator | `if (f.status.ward && f.status.ward.expiresRound <= s.round) {` | `f.status.ward.expiresRound > s.round` |
| engine/round.ts:552 | BlockStatement | `if (f.status.ward && f.status.ward.expiresRound <= s.round) {` | `{}` |
| engine/round.ts:554 | StringLiteral | `this.emit('expire', side, null, { status: 'ward' });` | `""` |
| engine/round.ts:554 | ObjectLiteral | `this.emit('expire', side, null, { status: 'ward' });` | `{}` |
| engine/round.ts:554 | StringLiteral | `this.emit('expire', side, null, { status: 'ward' });` | `""` |
| engine/round.ts:556 | ConditionalExpression | `if (f.status.step && f.status.step.expiresRound <= s.round) {` | `true` |
| engine/round.ts:556 | ConditionalExpression | `if (f.status.step && f.status.step.expiresRound <= s.round) {` | `true` |
| engine/round.ts:558 | ObjectLiteral | `this.emit('expire', side, null, { status: 'step' });` | `{}` |
| engine/round.ts:558 | StringLiteral | `this.emit('expire', side, null, { status: 'step' });` | `""` |
| engine/round.ts:558 | StringLiteral | `this.emit('expire', side, null, { status: 'step' });` | `""` |
| engine/round.ts:562 | ConditionalExpression | `if (f.posture < floor) this.gainPosture(side, floor - f.posture, 'cras` | `true` |
| engine/round.ts:562 | EqualityOperator | `if (f.posture < floor) this.gainPosture(side, floor - f.posture, 'cras` | `f.posture <= floor` |
| engine/round.ts:562 | StringLiteral | `if (f.posture < floor) this.gainPosture(side, floor - f.posture, 'cras` | `""` |
| engine/round.ts:562 | ArithmeticOperator | `if (f.posture < floor) this.gainPosture(side, floor - f.posture, 'cras` | `floor + f.posture` |
| engine/round.ts:570 | LogicalOperator | `sc.segIndex = sc.nextSegIndex ?? 0;` | `sc.nextSegIndex && 0` |
| engine/round.ts:575 | StringLiteral | `this.emit('roundEnd', null, null, { round: s.round });` | `""` |
| engine/round.ts:574 | ArrayDeclaration | `s.roundUsage = [];` | `["Stryker was here"]` |
| engine/round.ts:575 | ObjectLiteral | `this.emit('roundEnd', null, null, { round: s.round });` | `{}` |
| engine/round.ts:576 | AssignmentOperator | `s.round += 1;` | `s.round -= 1` |
| engine/round.ts:594 | ConditionalExpression | `if (last && nextSegIndex === null) {` | `true` |
| engine/round.ts:603 | ArithmeticOperator | `const next = last ? sc.segments[nextSegIndex!]!.items[0]! : segment.it` | `sc.itemIndex - 1` |
| engine/round.ts:607 | ArrayDeclaration | `disabled: [...item.disabled],` | `[]` |
| engine/round.ts:631 | StringLiteral | `if (kinds.length !== 1) problems.push('一次变招只能做一项调整：本轮优先级、暂停一门武学或本轮留力')` | `""` |
| engine/round.ts:634 | StringLiteral | `problems.push('变招只能暂停一门已装备的武学');` | `""` |
| engine/round.ts:639 | StringLiteral | `problems.push('本轮优先级必须是已装备武学的重新排列');` | `""` |
| engine/round.ts:642 | StringLiteral | `if (change.reserve !== undefined && (!Number.isInteger(change.reserve)` | `""` |
| engine/round.ts:651 | ConditionalExpression | `if (state.over) throw new ValidationError(['战斗已经结束']);` | `false` |
| engine/round.ts:651 | ArrayDeclaration | `if (state.over) throw new ValidationError(['战斗已经结束']);` | `[]` |
| engine/round.ts:651 | StringLiteral | `if (state.over) throw new ValidationError(['战斗已经结束']);` | `""` |
| engine/round.ts:653 | ArrayDeclaration | `let mods: RoundModifiers = { paused: [], priority: null, reserve: null` | `["Stryker was here"]` |
| engine/round.ts:655 | ArrayDeclaration | `if (s.changesLeft <= 0) throw new ValidationError(['本场变招次数已用完']);` | `[]` |
| engine/round.ts:655 | StringLiteral | `if (s.changesLeft <= 0) throw new ValidationError(['本场变招次数已用完']);` | `""` |
| engine/round.ts:660 | ArrayDeclaration | `paused: decision.change.pause ?? [],` | `["Stryker was here"]` |
| engine/round.ts:668 | BlockStatement | `} catch (e) {` | `{}` |
| engine/round.ts:669 | ConditionalExpression | `if (!(e instanceof Halt)) throw e;` | `false` |
| engine/round.ts:693 | StringLiteral | `state.over = { reason: 'noDecision', winner: null, detail: '没有提供下一轮决策'` | `""` |
| engine/setup.ts:9 | StringLiteral | `export const RULES_VERSION = 'rules-v1.9-phase1';` | `""` |
| engine/setup.ts:14 | ObjectLiteral | `export const DEFAULT_LIMITS: Limits = {` | `{}` |
| engine/setup.ts:31 | StringLiteral | `wardScope: 'main',` | `""` |
| engine/setup.ts:32 | StringLiteral | `initiative: 'player',` | `""` |
| engine/setup.ts:94 | StringLiteral | `super(`输入不合法：${problems.join('；')}`);` | ```` |
| engine/setup.ts:94 | StringLiteral | `super(`输入不合法：${problems.join('；')}`);` | `""` |
| engine/setup.ts:95 | StringLiteral | `this.name = 'ValidationError';` | `""` |
| engine/setup.ts:114 | StringLiteral | `const pairs: [string, number, number][] = [['气血', r.hp, r.hpMax], ['内力` | `""` |
| engine/setup.ts:114 | StringLiteral | `const pairs: [string, number, number][] = [['气血', r.hp, r.hpMax], ['内力` | `""` |
| engine/setup.ts:114 | StringLiteral | `const pairs: [string, number, number][] = [['气血', r.hp, r.hpMax], ['内力` | `""` |
| engine/setup.ts:116 | ConditionalExpression | `if (!Number.isInteger(cur) \|\| !Number.isInteger(max)) problems.push(`$` | `false` |
| engine/setup.ts:116 | LogicalOperator | `if (!Number.isInteger(cur) \|\| !Number.isInteger(max)) problems.push(`$` | `!Number.isInteger(cur) && !Number.isInte` |
| engine/setup.ts:116 | StringLiteral | `if (!Number.isInteger(cur) \|\| !Number.isInteger(max)) problems.push(`$` | ```` |
| engine/setup.ts:117 | ConditionalExpression | `else if (max <= 0) problems.push(`${label}${name}上限必须大于 0`);` | `false` |
| engine/setup.ts:117 | EqualityOperator | `else if (max <= 0) problems.push(`${label}${name}上限必须大于 0`);` | `max < 0` |
| engine/setup.ts:117 | StringLiteral | `else if (max <= 0) problems.push(`${label}${name}上限必须大于 0`);` | ```` |
| engine/setup.ts:118 | StringLiteral | `else if (cur < 0) problems.push(`${label}${name}不能为负数`);` | ```` |
| engine/setup.ts:119 | ConditionalExpression | `else if (cur > max) problems.push(`${label}${name}超过上限`);` | `false` |
| engine/setup.ts:119 | StringLiteral | `else if (cur > max) problems.push(`${label}${name}超过上限`);` | ```` |
| engine/setup.ts:121 | ConditionalExpression | `if (r.hp === 0) problems.push(`${label}开场气血不能为 0`);` | `false` |
| engine/setup.ts:121 | StringLiteral | `if (r.hp === 0) problems.push(`${label}开场气血不能为 0`);` | ```` |
| engine/setup.ts:125 | ConditionalExpression | `return (art.action.kind === 'attack' && art.action.swordOnly) \|\| (art.` | `true` |
| engine/setup.ts:125 | LogicalOperator | `return (art.action.kind === 'attack' && art.action.swordOnly) \|\| (art.` | `art.followup?.swordOnly && false` |
| engine/setup.ts:130 | ConditionalExpression | `if (entries.length > MAX_ARTS) problems.push(`${label}最多装备 ${MAX_ARTS}` | `false` |
| engine/setup.ts:130 | StringLiteral | `if (entries.length > MAX_ARTS) problems.push(`${label}最多装备 ${MAX_ARTS}` | ```` |
| engine/setup.ts:136 | StringLiteral | `if (!art) problems.push(`${label}未知内容 ID：${entry}`);` | ```` |
| engine/setup.ts:137 | ConditionalExpression | `else if (overrides[entry]) art = { ...art, ...structuredClone(override` | `true` |
| engine/setup.ts:139 | OptionalChaining | `const ps = specProblems(entry, weapon?.weaponClass);` | `weapon.weaponClass` |
| engine/setup.ts:140 | ArrowFunction | `if (ps.length > 0) problems.push(...ps.map((x) => `${label}${entry.nam` | `() => undefined` |
| engine/setup.ts:140 | StringLiteral | `if (ps.length > 0) problems.push(...ps.map((x) => `${label}${entry.nam` | ```` |
| engine/setup.ts:144 | StringLiteral | `if (seen.has(art.id)) problems.push(`${label}同一武学不能重复装备：${art.name}`);` | ```` |
| engine/setup.ts:146 | StringLiteral | `if (weapon && weapon.weaponClass !== 'sword' && isSwordOnly(art)) prob` | ```` |
| engine/setup.ts:147 | ConditionalExpression | `out.push({ instanceId: `${label === '玩家' ? 'p' : 'e'}${slot}:${art.id}` | `true` |
| engine/setup.ts:147 | ConditionalExpression | `out.push({ instanceId: `${label === '玩家' ? 'p' : 'e'}${slot}:${art.id}` | `false` |
| engine/setup.ts:147 | EqualityOperator | `out.push({ instanceId: `${label === '玩家' ? 'p' : 'e'}${slot}:${art.id}` | `label !== '玩家'` |
| engine/setup.ts:147 | StringLiteral | `out.push({ instanceId: `${label === '玩家' ? 'p' : 'e'}${slot}:${art.id}` | `""` |
| engine/setup.ts:147 | StringLiteral | `out.push({ instanceId: `${label === '玩家' ? 'p' : 'e'}${slot}:${art.id}` | `""` |
| engine/setup.ts:147 | StringLiteral | `out.push({ instanceId: `${label === '玩家' ? 'p' : 'e'}${slot}:${art.id}` | `""` |
| engine/setup.ts:149 | ArithmeticOperator | `const capacity = out.reduce((sum, a) => sum + a.art.capacity, 0) + (we` | `out.reduce((sum, a) => sum + a.art.capac` |
| engine/setup.ts:149 | LogicalOperator | `const capacity = out.reduce((sum, a) => sum + a.art.capacity, 0) + (we` | `weapon?.capacity && 0` |
| engine/setup.ts:149 | OptionalChaining | `const capacity = out.reduce((sum, a) => sum + a.art.capacity, 0) + (we` | `weapon.capacity` |
| engine/setup.ts:150 | StringLiteral | `if (capacity > MAX_CAPACITY) problems.push(`${label}总容量 ${capacity} 超过` | ```` |
| engine/setup.ts:187 | StringLiteral | `if (affixes.length > MAX_AFFIXES) problems.push(`每个敌人最多 ${MAX_AFFIXES}` | ```` |
| engine/setup.ts:188 | StringLiteral | `if (new Set(affixes).size !== affixes.length) problems.push('同名词缀不叠加')` | `""` |
| engine/setup.ts:189 | StringLiteral | `if (config.fixedSegment) problems.push(`${config.name}是引导或教学配置，不带词缀`);` | ```` |
| engine/setup.ts:192 | StringLiteral | `if (!a) problems.push(`未知词缀：${id}`);` | ```` |
| engine/setup.ts:193 | StringLiteral | `else if (!a.templates.includes(config.templateId)) problems.push(`${a.` | ```` |
| engine/setup.ts:201 | StringLiteral | `for (const id of Object.keys(overrides)) if (!findArt(id)) problems.pu` | ```` |
| engine/setup.ts:201 | ConditionalExpression | `for (const id of Object.keys(overrides)) if (!findArt(id)) problems.pu` | `false` |
| engine/setup.ts:202 | ConditionalExpression | `if (!Number.isInteger(input.seed) \|\| input.seed < 0 \|\| input.seed > 0x` | `false` |
| engine/setup.ts:202 | LogicalOperator | `if (!Number.isInteger(input.seed) \|\| input.seed < 0 \|\| input.seed > 0x` | `(!Number.isInteger(input.seed) \|\| input.` |
| engine/setup.ts:202 | ConditionalExpression | `if (!Number.isInteger(input.seed) \|\| input.seed < 0 \|\| input.seed > 0x` | `false` |
| engine/setup.ts:202 | ConditionalExpression | `if (!Number.isInteger(input.seed) \|\| input.seed < 0 \|\| input.seed > 0x` | `false` |
| engine/setup.ts:202 | LogicalOperator | `if (!Number.isInteger(input.seed) \|\| input.seed < 0 \|\| input.seed > 0x` | `!Number.isInteger(input.seed) && input.s` |
| engine/setup.ts:202 | ConditionalExpression | `if (!Number.isInteger(input.seed) \|\| input.seed < 0 \|\| input.seed > 0x` | `false` |
| engine/setup.ts:202 | EqualityOperator | `if (!Number.isInteger(input.seed) \|\| input.seed < 0 \|\| input.seed > 0x` | `input.seed >= 0xffffffff` |
| engine/setup.ts:202 | StringLiteral | `if (!Number.isInteger(input.seed) \|\| input.seed < 0 \|\| input.seed > 0x` | `""` |
| engine/setup.ts:207 | ConditionalExpression | `if (!pWeapon) problems.push(`玩家未知兵器 ID：${pi.weaponId}`);` | `false` |
| engine/setup.ts:207 | StringLiteral | `if (!pWeapon) problems.push(`玩家未知兵器 ID：${pi.weaponId}`);` | ```` |
| engine/setup.ts:208 | StringLiteral | `checkResources('玩家', pi, problems);` | `""` |
| engine/setup.ts:210 | ConditionalExpression | `if (!Number.isInteger(reserve) \|\| reserve < 0) problems.push('留力必须是非负整` | `false` |
| engine/setup.ts:210 | LogicalOperator | `if (!Number.isInteger(reserve) \|\| reserve < 0) problems.push('留力必须是非负整` | `!Number.isInteger(reserve) && reserve < ` |
| engine/setup.ts:210 | ConditionalExpression | `if (!Number.isInteger(reserve) \|\| reserve < 0) problems.push('留力必须是非负整` | `false` |
| engine/setup.ts:210 | StringLiteral | `if (!Number.isInteger(reserve) \|\| reserve < 0) problems.push('留力必须是非负整` | `""` |
| engine/setup.ts:211 | StringLiteral | `const pArts = resolveArts('玩家', pi.arts, pWeapon, problems, overrides)` | `""` |
| engine/setup.ts:217 | StringLiteral | `if (!config) problems.push(`未知敌人配置 ID：${String(ei.config)}`);` | ```` |
| engine/setup.ts:219 | ArrayDeclaration | `let eArts: ArtInstance[] = [];` | `["Stryker was here"]` |
| engine/setup.ts:220 | ObjectLiteral | `let eRes = { hp: 1, hpMax: 1, qi: 0, qiMax: 1, posture: 1, postureMax:` | `{}` |
| engine/setup.ts:223 | ConditionalExpression | `if (!eWeapon) problems.push(`敌人未知兵器 ID：${config.weaponId}`);` | `false` |
| engine/setup.ts:223 | StringLiteral | `if (!eWeapon) problems.push(`敌人未知兵器 ID：${config.weaponId}`);` | ```` |
| engine/setup.ts:225 | ArithmeticOperator | `eWeapon.base = { hp: eWeapon.base.hp + config.basePowerBonus.hp, postu` | `eWeapon.base.posture - config.basePowerB` |
| engine/setup.ts:227 | StringLiteral | `eArts = resolveArts('敌人', config.artIds, eWeapon, problems, overrides)` | `""` |
| engine/setup.ts:234 | ConditionalExpression | `if (affixes.includes('AFX_WEARY') && ei.hp === undefined) ei.hp = Math` | `true` |
| engine/setup.ts:243 | StringLiteral | `checkResources('敌人', eRes, problems);` | `""` |
| engine/setup.ts:245 | ConditionalExpression | `if (!first \|\| config.segments.some((sg) => sg.items.length === 0)) pro` | `false` |
| engine/setup.ts:245 | LogicalOperator | `if (!first \|\| config.segments.some((sg) => sg.items.length === 0)) pro` | `!first && config.segments.some(sg => sg.` |
| engine/setup.ts:245 | ArrowFunction | `if (!first \|\| config.segments.some((sg) => sg.items.length === 0)) pro` | `() => undefined` |
| engine/setup.ts:245 | MethodExpression | `if (!first \|\| config.segments.some((sg) => sg.items.length === 0)) pro` | `config.segments.every(sg => sg.items.len` |
| engine/setup.ts:245 | ConditionalExpression | `if (!first \|\| config.segments.some((sg) => sg.items.length === 0)) pro` | `false` |
| engine/setup.ts:245 | StringLiteral | `if (!first \|\| config.segments.some((sg) => sg.items.length === 0)) pro` | `""` |
| engine/setup.ts:247 | ConditionalExpression | `if (first && (!Number.isInteger(startItem) \|\| startItem < 0 \|\| startIt` | `false` |
| engine/setup.ts:247 | LogicalOperator | `if (first && (!Number.isInteger(startItem) \|\| startItem < 0 \|\| startIt` | `(!Number.isInteger(startItem) \|\| startIt` |
| engine/setup.ts:247 | ConditionalExpression | `if (first && (!Number.isInteger(startItem) \|\| startItem < 0 \|\| startIt` | `false` |
| engine/setup.ts:247 | LogicalOperator | `if (first && (!Number.isInteger(startItem) \|\| startItem < 0 \|\| startIt` | `!Number.isInteger(startItem) && startIte` |
| engine/setup.ts:247 | ConditionalExpression | `if (first && (!Number.isInteger(startItem) \|\| startItem < 0 \|\| startIt` | `false` |
| engine/setup.ts:247 | EqualityOperator | `if (first && (!Number.isInteger(startItem) \|\| startItem < 0 \|\| startIt` | `startItem > first.items.length` |
| engine/setup.ts:247 | ConditionalExpression | `if (first && (!Number.isInteger(startItem) \|\| startItem < 0 \|\| startIt` | `false` |
| engine/setup.ts:247 | StringLiteral | `if (first && (!Number.isInteger(startItem) \|\| startItem < 0 \|\| startIt` | `""` |
| engine/setup.ts:251 | ConditionalExpression | `if (!Number.isInteger(rules.freezeThreshold) \|\| rules.freezeThreshold ` | `false` |
| engine/setup.ts:251 | LogicalOperator | `if (!Number.isInteger(rules.freezeThreshold) \|\| rules.freezeThreshold ` | `!Number.isInteger(rules.freezeThreshold)` |
| engine/setup.ts:251 | EqualityOperator | `if (!Number.isInteger(rules.freezeThreshold) \|\| rules.freezeThreshold ` | `rules.freezeThreshold <= 2` |
| engine/setup.ts:251 | ConditionalExpression | `if (!Number.isInteger(rules.freezeThreshold) \|\| rules.freezeThreshold ` | `false` |
| engine/setup.ts:251 | StringLiteral | `if (!Number.isInteger(rules.freezeThreshold) \|\| rules.freezeThreshold ` | `""` |
| engine/setup.ts:261 | StringLiteral | `battleId: input.battleId ?? `battle-${input.seed}`,` | ```` |
| engine/setup.ts:263 | StringLiteral | `player: fighter('player', pi.name ?? '玩家', pi, pWeapon, pArts, reserve` | `""` |
| engine/setup.ts:263 | StringLiteral | `player: fighter('player', pi.name ?? '玩家', pi, pWeapon, pArts, reserve` | `""` |
| engine/setup.ts:263 | ArrayDeclaration | `player: fighter('player', pi.name ?? '玩家', pi, pWeapon, pArts, reserve` | `["Stryker was here"]` |
| engine/setup.ts:264 | StringLiteral | `enemy: fighter('enemy', config.name, eRes, eWeapon, eArts, 0, enemySta` | `""` |
| engine/setup.ts:284 | ArrayDeclaration | `roundUsage: [],` | `["Stryker was here"]` |
