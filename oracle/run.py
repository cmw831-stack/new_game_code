#!/usr/bin/env python3
"""《武林·自创绝学》战斗规则独立参考实现（对拍用）。

只依据 docs/design/ 当前生效版本（主计划 V1.9.1、战斗细则 V1.2、组件细则 V1.2、
敌人细则 V1.3、执行契约 V1.2、V1.9／V1.9.1 修订说明）写成。
输入输出格式见 docs/engine/oracle-io.md。

用法： python3 oracle/run.py < case.json > result.json

文档没写清、需要二选一的地方见 oracle/AMBIGUITIES.md，代码里用 [Axx] 标注编号。
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field, replace
from typing import Optional

# ---------------------------------------------------------------------------
# 规则参数
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Rules:
    """规则版本参数。默认 V1.9（V1.9.1 只改敌人数值，规则不变）。

    V1.8 参数只给单元测试复现战斗细则 11.1–11.4 等旧算例用，不暴露在 IO 格式里。
    """

    name: str = "v1.9"
    enemy_first_on_attack: bool = True      # 主计划 4.2：敌方意图为出招时敌方先手
    basic_ward_whole_chain: bool = True     # 主计划 4.3：基础架招护势覆盖整条攻击链
    combo_b_hit: tuple = (2, 2)             # 组件细则 3：连击乙每击 2／2
    combo_b_cost: int = 4                   # 连击乙费用 4
    step_cost: int = 3                      # 身法准备费用 3
    cold_threshold: int = 3                 # 寒意阈值／正常上限
    cold_protect_cap: int = 2               # 冻结保护期间上限
    crash_recover_pct: int = 40             # 崩溃者轮末恢复下限百分比
    max_rounds: int = 100                   # 主计划 5.3 诊断上限
    max_events_root: int = 128
    max_events_round: int = 512
    max_events_battle: int = 32768
    max_depth: int = 16


V19 = Rules()
V18 = Rules(
    name="v1.8",
    enemy_first_on_attack=False,
    basic_ward_whole_chain=False,
    combo_b_hit=(3, 2),
    combo_b_cost=3,
    step_cost=2,
)


class InvalidInput(Exception):
    pass


class SafetyStop(Exception):
    pass


# ---------------------------------------------------------------------------
# 组件价表（组件细则 V1.2 第二至五章）与十二门预设（第六章）
# ---------------------------------------------------------------------------

TRIGGER_COST = {  # 起势费用修正；容量都为 0
    "T_contact": 0,
    "T_dodge": -1,
    "T_block": -1,
    "T_break": -1,
    "T_qi": 0,
    "T_status": 0,
}

MODIFIER = {  # 劲力：费用、容量
    None: (0, 0),
    "M_gang": (1, 1),
    "M_soft": (0, 1),
    "M_cold": (1, 2),
    "M_shock": (1, 1),
}

RECOVERY = {  # 收势：费用、容量
    None: (0, 0),
    "R_qi": (1, 1),
    "R_posture": (0, 1),
}


@dataclass(frozen=True)
class Action:
    """主招。kind: attack / counter / qi / step / ward。"""

    rule_id: str
    kind: str
    cost: int
    cap: int
    hits: tuple = ()          # ((气血, 架势), ...)
    qi_amount: int = 0
    sword_only: bool = False


def actions_for(rules: Rules) -> dict:
    cb = rules.combo_b_hit
    return {
        "A_single_a": Action("A_single", "attack", 2, 2, ((4, 0),)),
        "A_single_b": Action("A_single", "attack", 2, 2, ((3, 2),)),
        "A_combo_a": Action("A_combo", "attack", 2, 3, ((2, 1), (2, 1)), sword_only=True),
        "A_combo_b": Action("A_combo", "attack", rules.combo_b_cost, 4, (cb, cb, cb), sword_only=True),
        "A_heavy_a": Action("A_heavy", "attack", 4, 4, ((8, 2),)),
        "A_heavy_b": Action("A_heavy", "attack", 4, 4, ((6, 5),)),
        "A_break_a": Action("A_break", "attack", 3, 4, ((2, 8),)),
        "A_break_b": Action("A_break", "attack", 3, 4, ((3, 6),)),
        "A_ward": Action("A_ward", "ward", 2, 3),
        "A_step": Action("A_step", "step", rules.step_cost, 3),
        "A_qi_a": Action("A_qi", "qi", 0, 2, qi_amount=1),
        "A_qi_b": Action("A_qi", "qi", 1, 2, qi_amount=2),
        "A_counter_a": Action("A_counter", "counter", 4, 3, ((6, 2),)),
        "A_counter_b": Action("A_counter", "counter", 4, 3, ((4, 5),)),
    }


@dataclass(frozen=True)
class Art:
    name: str
    trigger: str              # T_contact / T_dodge / T_block / T_break / T_qi / T_status / resonance
    trigger_param: object     # T_qi: 阈值；T_status: "freeze"
    action: Action
    modifier: Optional[str]
    recovery: Optional[str]
    cost: int
    cap: int
    sword_only: bool
    per_round: bool           # 每轮最多成功一次 [A04]
    enemy_only: bool = False
    is_attack: bool = True    # 是否“追加攻击”（受留力约束）

    @property
    def kind(self) -> str:
        return self.action.kind


def compose(name, trigger, action, modifier=None, recovery=None, *, trigger_param=None,
            per_round=False) -> Art:
    """组件细则 1.1：先相加，再应用攻击最低 1／其他最低 0（本参考实现没有兵器费用修正）。"""
    raw = TRIGGER_COST[trigger] + action.cost + MODIFIER[modifier][0] + RECOVERY[recovery][0]
    is_attack = action.kind in ("attack", "counter")
    cost = max(raw, 1 if is_attack else 0)
    cap = action.cap + MODIFIER[modifier][1] + RECOVERY[recovery][1]
    # 回气主招“每轮一次”（组件细则 1.2）；战斗细则 9.2 另把踏风、回身、守拙也标为每轮一次 [A04]
    pr = per_round or action.kind == "qi"
    return Art(name, trigger, trigger_param, action, modifier, recovery, cost, cap,
               action.sword_only, pr, False, is_attack)


def catalog(rules: Rules) -> dict:
    A = actions_for(rules)
    arts = [
        compose("叠寒剑", "T_contact", A["A_combo_b"], "M_cold"),
        compose("断势击", "T_contact", A["A_break_a"]),
        compose("崩势追击", "T_break", A["A_single_a"], "M_gang", "R_qi"),
        compose("逐影刺", "T_status", A["A_combo_a"], trigger_param="freeze"),
        compose("归息诀", "T_block", A["A_qi_b"]),
        compose("通脉诀", "T_contact", A["A_qi_a"]),
        compose("蓄元诀", "T_break", A["A_qi_b"]),
        compose("养元功", "T_dodge", A["A_qi_b"], None, "R_posture"),
        compose("踏风步", "T_contact", A["A_step"], per_round=True),
        compose("回身步", "T_block", A["A_step"], per_round=True),
        compose("借力诀", "T_block", A["A_counter_a"]),
        compose("守拙诀", "T_qi", A["A_ward"], trigger_param=8, per_round=True),
    ]
    out = {a.name: a for a in arts}
    # 敌方专用武学（敌人细则 V1.3 第三章），直接按表定价
    out["蓄震诀"] = Art("蓄震诀", "resonance", None, Action("npc_resonance", "counter", 2, 4),
                       None, None, 2, 4, False, False, True, True)
    heavy = Action("npc_heavy", "attack", 5, 5, ((12, 6),))
    out["沉刃斩"] = Art("沉刃斩", "T_contact", None, heavy, None, None, 5, 5, False, False, True, True)
    heavy_e = Action("npc_heavy_elite", "attack", 6, 6, ((14, 8),))
    elite = Art("沉刃斩·论艺", "T_contact", None, heavy_e, None, None, 6, 6, False, False, True, True)
    out["沉刃斩·论艺"] = elite
    out["沉刃斩·论艺参数"] = replace(elite, name="沉刃斩·论艺参数")  # [A30] 两种写法都接受
    return out


# ---------------------------------------------------------------------------
# 战斗状态
# ---------------------------------------------------------------------------


@dataclass
class Ward:
    kind: str                 # "basic"（基础架招）/ "skill"（技能）
    expires_round: int
    locked_root: Optional[int] = None
    locked_move: Optional[int] = None


@dataclass
class Side:
    key: str                  # "player" / "enemy"
    hp: int
    hp_max: int
    qi: int
    qi_max: int
    posture: int
    posture_max: int
    w_hp: int
    w_posture: int
    w_class: str
    arts: list
    reserve: int = 0
    ward: Optional[Ward] = None
    step_expires: Optional[int] = None        # 持有身法准备时为到期轮次
    cold: int = 0
    freeze_pending: bool = False
    protection_active: bool = False
    protect_action_id: Optional[int] = None
    action_seq: int = 0                       # 单调递增的基础行动 ID（执行契约 3.7）
    crashed: bool = False                     # 本轮已崩溃
    opening_expires_after: Optional[int] = None  # 持有破绽时：在该基础行动 ID 及其连锁结束后过期
    round_used: set = field(default_factory=set)

    @property
    def has_step(self) -> bool:
        return self.step_expires is not None

    @property
    def has_opening(self) -> bool:
        return self.opening_expires_after is not None

    def cold_cap(self, rules: Rules) -> int:
        if self.freeze_pending or self.protection_active:
            return rules.cold_protect_cap
        return rules.cold_threshold


@dataclass
class Fact:
    type: str                 # contact_base / block / dodge / crash / freeze / qi_cross / multi_contacts
    who: str                  # 事实主体（见 gather）
    n: int = 0                # multi_contacts 的有效接触数；qi_cross 的前后值编码


@dataclass
class MoveCtx:
    move_id: int
    is_base: bool
    modifier: Optional[str]
    contacted: bool = False
    contacts: int = 0
    hp_damage: int = 0
    facts: list = field(default_factory=list)


# ---------------------------------------------------------------------------
# 引擎
# ---------------------------------------------------------------------------

STANCES = ("attack", "guard", "breathe")


class Battle:
    def __init__(self, case: dict, rules: Rules = V19):
        self.rules = rules
        self.cat = catalog(rules)
        self.case = case
        self._validate_and_build()
        self.round = 0
        self.over: Optional[str] = None
        self.next_id = 0
        self.events_battle = 0
        self.events_round = 0
        self.root_events: dict = {}
        self.root_used: set = set()       # (root, side, art)
        # 本轮生效的玩家编排
        self.cur_priority: dict = {}
        self.cur_paused: dict = {"player": set(), "enemy": set()}
        self.cur_reserve: dict = {}

    # ---------------- 输入校验 ----------------

    def _err(self, msg):
        raise InvalidInput(msg)

    @staticmethod
    def _is_int(v):
        return isinstance(v, int) and not isinstance(v, bool)

    def _side(self, key: str, d) -> Side:
        if not isinstance(d, dict):
            self._err(f"{key} 缺失或不是对象")
        for f in ("hp", "hpMax", "qi", "qiMax", "posture", "postureMax"):
            if f not in d or not self._is_int(d[f]):
                self._err(f"{key}.{f} 缺失或不是整数")
        if d["hpMax"] <= 0 or d["qiMax"] < 0 or d["postureMax"] <= 0:
            self._err(f"{key} 资源上限不合法")
        if not (1 <= d["hp"] <= d["hpMax"]):
            self._err(f"{key}.hp 必须在 1..hpMax 之间")  # [A27]
        if not (0 <= d["qi"] <= d["qiMax"]):
            self._err(f"{key}.qi 必须在 0..qiMax 之间")
        if not (0 <= d["posture"] <= d["postureMax"]):
            self._err(f"{key}.posture 必须在 0..postureMax 之间")
        reserve = 0
        if key == "player":
            reserve = d.get("reserve", 0)
            if not self._is_int(reserve) or reserve < 0:
                self._err("player.reserve 必须是非负整数")
        w = d.get("weapon")
        if not isinstance(w, dict):
            self._err(f"{key}.weapon 缺失")
        for f in ("hp", "posture"):
            if not self._is_int(w.get(f)) or w[f] < 0:
                self._err(f"{key}.weapon.{f} 必须是非负整数")
        if w.get("class") not in ("sword", "blade", "staff"):
            self._err(f"{key}.weapon.class 必须是 sword/blade/staff")
        names = d.get("arts")
        if not isinstance(names, list):
            self._err(f"{key}.arts 必须是列表")
        if len(names) > 4:
            self._err(f"{key} 武学超过四门")
        if len(set(names)) != len(names):
            self._err(f"{key} 武学重复")  # [A26]
        arts = []
        for n in names:
            if n not in self.cat:
                self._err(f"{key} 未知武学：{n}")
            a = self.cat[n]
            if a.enemy_only and key == "player":
                self._err(f"玩家不能装备敌方专用武学：{n}")
            if a.sword_only and w["class"] != "sword":
                self._err(f"剑专用武学 {n} 不能配 {w['class']}")
            arts.append(a)
        cap = sum(a.cap for a in arts)  # 输入兵器无容量字段，按 0 计 [A28]
        if cap > 12:
            self._err(f"{key} 武学容量 {cap} 超过 12")
        return Side(key, d["hp"], d["hpMax"], d["qi"], d["qiMax"], d["posture"], d["postureMax"],
                    w["hp"], w["posture"], w["class"], arts, reserve)

    def _validate_and_build(self):
        c = self.case
        if not isinstance(c, dict):
            self._err("输入不是对象")
        self.p = self._side("player", c.get("player"))
        e = c.get("enemy")
        self.e = self._side("enemy", e)
        cyc = e.get("cycle")
        if not isinstance(cyc, list) or not cyc:
            self._err("enemy.cycle 必须是非空列表")
        enames = {a.name for a in self.e.arts}
        self.cycle = []
        for i, item in enumerate(cyc):
            if not isinstance(item, dict) or item.get("stance") not in STANCES:
                self._err(f"enemy.cycle[{i}].stance 不合法")
            dis = item.get("disabled", [])
            if not isinstance(dis, list):
                self._err(f"enemy.cycle[{i}].disabled 必须是列表")
            for n in dis:
                if n not in enames:
                    self._err(f"enemy.cycle[{i}].disabled 含未装备武学：{n}")  # [A15]
            self.cycle.append((item["stance"], set(dis)))
        si = e.get("startItem", 0)
        if not self._is_int(si) or not (0 <= si < len(cyc)):
            self._err("enemy.startItem 越界")
        self.cycle_idx = si
        decs = c.get("decisions")
        if not isinstance(decs, list):
            self._err("decisions 必须是列表")
        pnames = [a.name for a in self.p.arts]
        changes = 0
        self.decisions = []
        for i, d in enumerate(decs):
            if not isinstance(d, dict) or d.get("stance") not in STANCES:
                self._err(f"decisions[{i}].stance 不合法")
            ch = d.get("change")
            if ch is not None:
                if not isinstance(ch, dict) or len(ch) != 1:
                    self._err(f"decisions[{i}].change 必须只含 pause/priority/reserve 之一")
                (k, v), = ch.items()
                if k == "pause":
                    if not isinstance(v, list) or len(v) != 1 or v[0] not in pnames:
                        self._err(f"decisions[{i}].change.pause 必须恰好列出一门已装备武学")  # [A16]
                elif k == "priority":
                    if not isinstance(v, list) or sorted(v) != sorted(pnames) or len(v) != len(pnames):
                        self._err(f"decisions[{i}].change.priority 必须是已装备武学的完整排列")
                elif k == "reserve":
                    if not self._is_int(v) or v < 0:
                        self._err(f"decisions[{i}].change.reserve 必须是非负整数")
                else:
                    self._err(f"decisions[{i}].change 含未知键 {k}")
                changes += 1
                if changes > 2:
                    self._err(f"decisions[{i}]：每战最多两次变招")  # [A17]
            self.decisions.append(d)

    # ---------------- 记账 ----------------

    def _new_id(self):
        self.next_id += 1
        return self.next_id

    def _event(self, root: int, n: int = 1):
        self.events_battle += n
        self.events_round += n
        self.root_events[root] = self.root_events.get(root, 0) + n
        r = self.rules
        if (self.root_events[root] > r.max_events_root or self.events_round > r.max_events_round
                or self.events_battle > r.max_events_battle):
            raise SafetyStop()

    def opp(self, s: Side) -> Side:
        return self.e if s is self.p else self.p

    def _end(self, loser: Side):
        if self.over is None:
            self.over = "defeat" if loser is self.p else "victory"

    def _gain_qi(self, s: Side, amt: int, root: int) -> list:
        before = s.qi
        s.qi = min(s.qi_max, s.qi + amt)
        facts = []
        if s.qi > before:
            self._event(root)
            facts.append(Fact("qi_gain", s.key, before * 1000 + s.qi))
        return facts

    # ---------------- 基础行动 ID、破绽、冻结保护 ----------------

    def _start_action(self, s: Side) -> int:
        s.action_seq += 1
        return s.action_seq

    def _finish_action(self, s: Side, aid: int):
        if s.opening_expires_after is not None and s.opening_expires_after <= aid:
            s.opening_expires_after = None
        if s.protection_active and s.protect_action_id == aid:
            s.protection_active = False
            s.protect_action_id = None

    def _skip(self, s: Side, aid: int):
        s.freeze_pending = False
        s.protection_active = True
        s.protect_action_id = aid + 1

    def _is_protected(self, s: Side, aid: int) -> bool:
        return s.protection_active and s.protect_action_id == aid

    def _end_root(self, root: int):
        for s in (self.p, self.e):
            if s.ward is not None and s.ward.locked_root == root:
                s.ward = None  # 基础架招护势：攻击链结束后消费

    # ---------------- 打击 ----------------

    def _hit(self, att: Side, tgt: Side, hp_pow: int, post_pow: int, ctx: MoveCtx, root: int):
        if self.over or att.hp <= 0 or tgt.hp <= 0:
            return
        self._event(root)
        # 2. 身法准备先闪避
        if tgt.has_step:
            tgt.step_expires = None
            ctx.facts.append(Fact("dodge", tgt.key))
            return
        # 3. 格挡判定（护势在首次未被闪避的打击时锁定）
        blocked = False
        w = tgt.ward
        if w is not None:
            if w.locked_root is None and w.locked_move is None:
                if w.kind == "basic" and self.rules.basic_ward_whole_chain:
                    w.locked_root = root
                else:
                    w.locked_move = ctx.move_id
            in_scope = (w.locked_root == root) if w.locked_root is not None else (w.locked_move == ctx.move_id)
            if in_scope and tgt.posture > 0 and not tgt.crashed:  # [A09]
                blocked = True
        hp, post = hp_pow, post_pow
        first = not ctx.contacted
        if first and ctx.modifier == "M_gang" and att.has_opening:
            att.opening_expires_after = None
            hp += 2
        if first and ctx.modifier == "M_shock":
            hp = max(0, hp - 2)
            post += 4
        if first and ctx.modifier == "M_soft":
            hp = max(0, hp - 2)
        if ctx.is_base and att.has_opening:
            att.opening_expires_after = None
            hp += 2
        dmg = hp // 2 if blocked else hp
        dmg = min(dmg, tgt.hp)
        pdmg = min(post, tgt.posture)
        before_post = tgt.posture
        # 4. 提交
        tgt.hp -= dmg
        tgt.posture -= pdmg
        ctx.contacted = True
        ctx.contacts += 1
        ctx.hp_damage += dmg
        if ctx.is_base:
            ctx.facts.append(Fact("contact_base", att.key))
        if blocked:
            ctx.facts.append(Fact("block", tgt.key))
        # 5. 气血为 0 立即收束
        if tgt.hp <= 0:
            self._end(tgt)
            return
        # 6. 崩溃、接触型劲力与阈值
        if before_post > 0 and tgt.posture == 0 and not tgt.crashed:
            tgt.crashed = True
            ctx.facts.append(Fact("crash", tgt.key))
            if not att.has_opening:
                att.opening_expires_after = att.action_seq + 1
        if first and ctx.modifier == "M_soft":
            att.posture = min(att.posture_max, att.posture + 2)
        if ctx.modifier == "M_cold":
            cap = tgt.cold_cap(self.rules)
            if tgt.cold < cap:
                tgt.cold += 1
            if not (tgt.freeze_pending or tgt.protection_active) and tgt.cold >= self.rules.cold_threshold:
                tgt.cold = 0
                tgt.freeze_pending = True
                ctx.facts.append(Fact("freeze", tgt.key))

    def _exec_move(self, caster: Side, hits, modifier, is_base: bool, root: int) -> MoveCtx:
        tgt = self.opp(caster)
        ctx = MoveCtx(self._new_id(), is_base, modifier)
        for hp, post in hits:
            if self.over:
                break
            self._hit(caster, tgt, hp, post, ctx, root)
        # 技能护势（及 V1.8 的基础护势）只锁定一门主招：主招结束后消费
        if tgt.ward is not None and tgt.ward.locked_move == ctx.move_id:
            tgt.ward = None
        if not is_base and len(hits) >= 2:
            ctx.facts.append(Fact("multi_contacts", tgt.key, ctx.contacts))
        return ctx

    # ---------------- 候选、批次与施放 ----------------

    def _usable(self, s: Side, art: Art, root: int) -> bool:
        if art.name in self.cur_paused[s.key]:
            return False
        if (root, s.key, art.name) in self.root_used:
            return False
        if art.per_round and art.name in s.round_used:
            return False
        return True

    def _gather(self, s: Side, facts: list, root: int) -> list:
        o = self.opp(s)
        out = []
        for art in self.cur_priority[s.key]:
            if not self._usable(s, art, root):
                continue
            param = None
            hit = False
            for f in facts:
                t = art.trigger
                if t == "T_contact" and f.type == "contact_base" and f.who == s.key:
                    hit = True
                elif t == "T_block" and f.type == "block" and f.who == s.key:
                    hit = True
                elif t == "T_dodge" and f.type == "dodge" and f.who == s.key:
                    hit = True
                elif t == "T_break" and f.type == "crash" and f.who == o.key:
                    hit = True
                elif t == "T_status" and f.type == "freeze" and f.who == o.key:
                    hit = True
                elif t == "T_qi" and f.type == "qi_gain" and f.who == s.key:
                    before, after = divmod(f.n, 1000)
                    if before < art.trigger_param <= after:
                        hit = True
                elif t == "resonance" and f.type == "multi_contacts" and f.who == s.key and f.n >= 2:
                    hit = True
                    param = max(param or 0, f.n)
            if hit:
                out.append((art, param))
        return out

    def _run_chain(self, s: Side, facts: list, root: int, depth: int):
        batch = self._gather(s, facts, root)
        while batch and not self.over:
            new = []
            for art, param in batch:
                if self.over:
                    return
                new += self._try_cast(s, art, param, root, depth + 1)
            batch = self._gather(s, new, root)

    def _try_cast(self, s: Side, art: Art, param, root: int, depth: int) -> list:
        if self.over or s.hp <= 0:
            return []
        if depth > self.rules.max_depth:
            raise SafetyStop()
        if not self._usable(s, art, root):
            return []
        o = self.opp(s)
        kind = art.kind
        # 状态已存在／无合法增量：支付前跳过
        if kind == "step" and s.has_step:
            return []
        if kind == "ward" and s.ward is not None:
            return []
        if kind == "qi":
            qi_full = s.qi >= s.qi_max
            post_full = art.recovery != "R_posture" or s.posture >= s.posture_max
            if qi_full and post_full:
                return []
        cost = art.cost
        if s.qi < cost:
            return []  # 内力不足
        if art.is_attack and s.qi - cost < self.cur_reserve[s.key]:
            return []  # 低于留力
        if art.is_attack and o.hp <= 0:
            return []
        # 付款并占限次
        s.qi -= cost
        self.root_used.add((root, s.key, art.name))
        if art.per_round:
            s.round_used.add(art.name)
        self._event(root)
        facts = []
        if art.is_attack:
            if art.trigger == "resonance":
                hits = ((2 * param, 0),)
            else:
                hits = art.action.hits
            ctx = self._exec_move(s, hits, art.modifier, False, root)
            if self.over:
                return []
            # 受击方防御响应窗口
            self._run_chain(o, ctx.facts, root, depth)
            if self.over or s.hp <= 0:
                return []
            facts += ctx.facts
            if art.recovery == "R_qi" and ctx.hp_damage > 0:
                facts += self._gain_qi(s, 2, root)
        elif kind == "qi":
            facts += self._gain_qi(s, art.action.qi_amount, root)
            if art.recovery == "R_posture":
                s.posture = min(s.posture_max, s.posture + 2)
        elif kind == "step":
            s.step_expires = self.round + 1   # [A05] 下一轮末到期
        elif kind == "ward":
            s.ward = Ward("skill", self.round + 1)
        return facts

    # ---------------- 基础行动 ----------------

    def _basic_attack(self, s: Side, root: int):
        ctx = self._exec_move(s, ((s.w_hp, s.w_posture),), None, True, root)
        if self.over:
            return
        self._run_chain(self.opp(s), ctx.facts, root, 0)   # 受击方先响应
        if self.over or s.hp <= 0:
            return
        self._run_chain(s, ctx.facts, root, 0)              # 出手方跨武学接招

    def _breathe(self, s: Side, root: int):
        facts = self._gain_qi(s, 4, root)
        self._run_chain(s, facts, root, 0)

    # ---------------- 一轮 ----------------

    def _snapshot(self, s: Side) -> dict:
        return {
            "hp": s.hp, "qi": s.qi, "posture": s.posture,
            "ward": s.ward is not None, "step": s.has_step, "cold": s.cold,
            "frozen": s.freeze_pending, "opening": s.has_opening,
        }

    def _play_round(self, decision: dict):
        self.round += 1
        self.events_round = 0
        e_stance, e_disabled = self.cycle[self.cycle_idx]
        stance = {"player": decision["stance"], "enemy": e_stance}
        # 本轮编排（变招只到轮末）
        self.cur_priority = {"player": list(self.p.arts), "enemy": list(self.e.arts)}
        self.cur_paused = {"player": set(), "enemy": set(e_disabled)}
        self.cur_reserve = {"player": self.p.reserve, "enemy": 0}
        ch = decision.get("change")
        if ch:
            if "pause" in ch:
                self.cur_paused["player"] = set(ch["pause"])
            elif "priority" in ch:
                self.cur_priority["player"] = [self.cat[n] for n in ch["priority"]]
            elif "reserve" in ch:
                self.cur_reserve["player"] = ch["reserve"]

        # 共同准备：先识别冻结跳过，再提交双方架招
        prepared = []
        for s in (self.p, self.e):
            if stance[s.key] != "guard":
                continue
            aid = self._start_action(s)
            if s.freeze_pending and not self._is_protected(s, aid):
                self._skip(s, aid)
            else:
                s.posture = min(s.posture_max, s.posture + 4)
                s.ward = Ward("basic", self.round)
            prepared.append((s, aid))
        for s, aid in prepared:  # 按玩家→敌人结清架招根（无可触发事实）
            root = self._new_id()
            self._end_root(root)
            self._finish_action(s, aid)

        # 轮初恢复：先同时更新数值，再按玩家→敌人建立边界根
        gains = {s.key: self._gain_qi(s, 2, 0) for s in (self.p, self.e)}
        for s in (self.p, self.e):
            if self.over:
                break
            root = self._new_id()
            self._run_chain(s, gains[s.key], root, 0)
            self._end_root(root)

        # 基础行动
        if self.rules.enemy_first_on_attack and e_stance == "attack":
            order = (self.e, self.p)
        else:
            order = (self.p, self.e)
        for s in order:
            if self.over:
                break
            if stance[s.key] == "guard":
                continue
            aid = self._start_action(s)
            if s.freeze_pending and not self._is_protected(s, aid):
                self._skip(s, aid)
                self._finish_action(s, aid)
                continue
            root = self._new_id()
            if stance[s.key] == "attack":
                self._basic_attack(s, root)
            else:
                self._breathe(s, root)
            self._end_root(root)
            self._finish_action(s, aid)

        if self.over:
            return
        # 轮末收束
        for s in (self.p, self.e):
            if s.ward is not None and (s.ward.kind == "basic" or s.ward.expires_round <= self.round):
                s.ward = None
            if s.step_expires is not None and s.step_expires <= self.round:
                s.step_expires = None
            if s.crashed:
                floor = s.posture_max * self.rules.crash_recover_pct // 100
                s.posture = max(s.posture, floor)
            s.crashed = False
            s.round_used.clear()
        self.cycle_idx = (self.cycle_idx + 1) % len(self.cycle)
        if self.round >= self.rules.max_rounds:
            self.over = "safetyLimit"  # [A18]

    def run(self) -> dict:
        rounds = []
        for d in self.decisions:
            try:
                self._play_round(d)
            except SafetyStop:
                self.over = "safetyLimit"
            rounds.append({"player": self._snapshot(self.p), "enemy": self._snapshot(self.e),
                           "over": self.over})
            if self.over:
                break
        return {"rounds": rounds}


def simulate(case: dict, rules: Rules = V19) -> dict:
    try:
        b = Battle(case, rules)
    except InvalidInput as ex:
        return {"error": str(ex)}
    except (AttributeError, TypeError, KeyError, ValueError) as ex:
        return {"error": f"输入格式不合法：{ex}"}
    return b.run()


def main():
    try:
        case = json.load(sys.stdin)
    except json.JSONDecodeError as ex:
        out = {"error": f"JSON 解析失败：{ex}"}
    else:
        out = simulate(case)
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
