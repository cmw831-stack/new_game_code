"""参考实现的验收测试。

预期值只取自策划文档里的手算例子或规则原文中写明的结果，测试名与 docstring 注明出处。
文档标明按 V1.8 写成的算例，用 run.V18 参数显式复现（V1.9 修订说明第三节的处理方式）。

运行： python3 -m unittest discover -s oracle -v
"""
import json
import os
import subprocess
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import run  # noqa: E402
from run import V18, V19, catalog, simulate  # noqa: E402


def side(hp=30, hp_max=None, qi=8, qi_max=20, posture=20, posture_max=None,
         weapon=(4, 4, "sword"), arts=(), reserve=None):
    d = {
        "hp": hp, "hpMax": hp_max if hp_max is not None else hp,
        "qi": qi, "qiMax": qi_max,
        "posture": posture, "postureMax": posture_max if posture_max is not None else posture,
        "weapon": {"hp": weapon[0], "posture": weapon[1], "class": weapon[2]},
        "arts": list(arts),
    }
    if reserve is not None:
        d["reserve"] = reserve
    return d


def case(player, enemy, cycle, decisions, start=0):
    enemy = dict(enemy)
    enemy["cycle"] = [{"stance": c, "disabled": []} if isinstance(c, str) else c for c in cycle]
    enemy["startItem"] = start
    return {"player": player, "enemy": enemy,
            "decisions": [{"stance": d} if isinstance(d, str) else d for d in decisions]}


def cold_chain_v18_case(reserve=0, player_hp=30, enemy_arts=(), decisions=("attack",), cycle=("attack",)):
    """战斗细则 11.1 的输入：玩家朴剑、叠寒剑＋崩势追击、内力 10（已含轮初恢复，故输入 8）；
    敌方气血 30、架势 10／10，本轮准备普通出招。"""
    return case(
        side(hp=player_hp, hp_max=30, qi=8, arts=["叠寒剑", "崩势追击"], reserve=reserve),
        side(hp=30, qi=8, posture=10, arts=list(enemy_arts)),
        list(cycle), list(decisions))


class TestCatalog(unittest.TestCase):
    def test_components_ch6_twelve_presets_cost_and_capacity(self):
        """组件细则 V1.2 第六章：十二门预设逐项复算的内力与容量。"""
        expected = {
            "叠寒剑": (5, 6), "断势击": (3, 4), "崩势追击": (3, 4), "逐影刺": (2, 3),
            "归息诀": (0, 2), "通脉诀": (0, 2), "蓄元诀": (0, 2), "养元功": (0, 3),
            "踏风步": (3, 3), "回身步": (2, 3), "借力诀": (3, 3), "守拙诀": (2, 3),
        }
        cat = catalog(V19)
        for name, (cost, cap) in expected.items():
            with self.subTest(name=name):
                self.assertEqual((cat[name].cost, cat[name].cap), (cost, cap))

    def test_combat_11_header_v18_prices(self):
        """战斗细则 11 节开头：V1.8 叠寒剑三段 3／2、费用 4；V1.9 修订说明表 #5：V1.8 踏风 2、回身 1。"""
        cat = catalog(V18)
        self.assertEqual(cat["叠寒剑"].cost, 4)
        self.assertEqual(cat["叠寒剑"].action.hits, ((3, 2),) * 3)
        self.assertEqual(cat["踏风步"].cost, 2)
        self.assertEqual(cat["回身步"].cost, 1)

    def test_enemies_ch3_enemy_arts(self):
        """敌人细则 V1.3 第三章：蓄震诀 2／4，沉刃斩 5／5，论艺 6／6。"""
        cat = catalog(V19)
        self.assertEqual((cat["蓄震诀"].cost, cat["蓄震诀"].cap), (2, 4))
        self.assertEqual((cat["沉刃斩"].cost, cat["沉刃斩"].cap), (5, 5))
        self.assertEqual((cat["沉刃斩·论艺"].cost, cat["沉刃斩·论艺"].cap), (6, 6))


class TestHandCalcV18(unittest.TestCase):
    """战斗细则 11.1–11.4 与执行契约第四章（按 V1.8 规则写成）。"""

    def test_combat_11_1_cold_and_break_same_root(self):
        """战斗细则 11.1／执行契约第四章“寒霜破势同根”：伤血 19，玩家内力 5，敌方行动被冻结跳过，轮末架势 4。"""
        out = simulate(cold_chain_v18_case(), V18)
        r = out["rounds"][0]
        self.assertEqual(r["enemy"]["hp"], 11)        # 30 - 19
        self.assertEqual(r["player"]["qi"], 5)
        self.assertEqual(r["player"]["hp"], 30)       # 敌方基础出招被跳过
        self.assertEqual(r["enemy"]["posture"], 4)    # 轮末恢复到 4
        self.assertFalse(r["enemy"]["frozen"])        # 冻结已用于跳过本轮行动
        self.assertEqual(r["enemy"]["cold"], 0)       # 积满寒意后清空
        self.assertFalse(r["player"]["opening"])      # 破绽已被崩势追击消费
        self.assertIsNone(r["over"])

    def test_combat_11_2_reserve_4_skips_chase(self):
        """战斗细则 11.2／执行契约“留力阻止追击”：敌气血 17，玩家内力 6，破绽保留；
        次轮单计自然恢复，两案内力分别为 7 与 8；留力案的破绽在其下一行动（此处为架招）结束时过期。"""
        decisions = ["attack", "guard"]
        cyc = ["attack", "guard"]
        base = simulate(cold_chain_v18_case(reserve=0, decisions=decisions, cycle=cyc), V18)
        kept = simulate(cold_chain_v18_case(reserve=4, decisions=decisions, cycle=cyc), V18)
        r1 = kept["rounds"][0]
        self.assertEqual(r1["enemy"]["hp"], 17)
        self.assertEqual(r1["player"]["qi"], 6)
        self.assertTrue(r1["player"]["opening"])
        self.assertEqual(base["rounds"][1]["player"]["qi"], 7)
        self.assertEqual(kept["rounds"][1]["player"]["qi"], 8)
        # 战斗细则第六章：制造者下次选择架招，窗口在共同准备阶段完成自身架招后结束
        self.assertFalse(kept["rounds"][1]["player"]["opening"])

    def test_main_4_2_opening_makes_base_attack_6(self):
        """主计划 4.2：出招合格时消费破绽使气血威力变为 6（接 11.2 留力案，次轮敌方调息、玩家出招，
        以变招把留力提到 20 使其他武学不发动）。"""
        c = cold_chain_v18_case(reserve=4, decisions=["attack", {"stance": "attack", "change": {"reserve": 20}}],
                                cycle=["attack", "breathe"])
        out = simulate(c, V18)
        self.assertEqual(out["rounds"][0]["enemy"]["hp"], 17)
        self.assertEqual(out["rounds"][1]["enemy"]["hp"], 11)

    def test_combat_11_3_resonance_before_chase(self):
        """战斗细则 11.3／执行契约“受击反震优先”：三连三次接触，守卫付 2 反震 6，玩家 30→24，
        再轮到玩家的崩势追击（其余数值同 11.1）。"""
        out = simulate(cold_chain_v18_case(enemy_arts=["蓄震诀"]), V18)
        r = out["rounds"][0]
        self.assertEqual(r["player"]["hp"], 24)
        self.assertEqual(r["enemy"]["qi"], 8)          # 10 - 2
        self.assertEqual(r["enemy"]["hp"], 11)         # 崩势追击照常执行
        self.assertEqual(r["player"]["qi"], 5)

    def test_combat_11_3_resonance_kills_before_chase(self):
        """战斗细则 11.3：玩家只剩 6 气血时先败退，崩势追击不再付款或执行。"""
        out = simulate(cold_chain_v18_case(player_hp=6, enemy_arts=["蓄震诀"]), V18)
        r = out["rounds"][0]
        self.assertEqual(r["over"], "defeat")
        self.assertEqual(r["player"]["hp"], 0)
        self.assertEqual(r["player"]["qi"], 6)         # 只付了叠寒剑 4
        self.assertEqual(r["enemy"]["hp"], 17)
        self.assertEqual(len(out["rounds"]), 1)

    def test_combat_11_4_guard_return_then_counter(self):
        """战斗细则 11.4／执行契约“同批回气再反击”：玩家气血 26、内力 1、架势 14；敌气血 24／架势 8。"""
        c = case(side(hp=30, qi=0, posture=20, arts=["归息诀", "借力诀"]),
                 side(hp=30, qi=8, posture=10, weapon=(8, 6, "sword")),
                 ["attack"], ["guard"])
        for rules in (V18, V19):
            with self.subTest(rules=rules.name):
                r = simulate(c, rules)["rounds"][0]
                self.assertEqual((r["player"]["hp"], r["player"]["qi"], r["player"]["posture"]), (26, 1, 14))
                self.assertEqual((r["enemy"]["hp"], r["enemy"]["posture"]), (24, 8))

    def test_combat_8_3_new_candidate_does_not_jump_batch(self):
        """战斗细则 8.3：归息回气产生守拙的新机会，守拙放入下一批，不插到本批尚未处理的借力前面。
        以 11.4 的数值加守拙、留力 4 构造：若守拙插队，借力付款后会低于留力而跳过。"""
        c = case(side(hp=30, qi=4, posture=20, arts=["归息诀", "守拙诀", "借力诀"], reserve=4),
                 side(hp=30, qi=8, posture=10, weapon=(8, 6, "sword")),
                 ["attack"], ["guard"])
        r = simulate(c, V18)["rounds"][0]
        self.assertEqual(r["enemy"]["hp"], 24)      # 借力照常反击
        self.assertEqual(r["player"]["qi"], 3)      # 6+2-3-2
        self.assertTrue(r["player"]["ward"])        # 守拙的技能护势到下一轮末

    def test_enemies_8_1_blade_guard_v18(self):
        """敌人细则 8.1 第四项（V1.8 原文）：满架势 20 架招承受刀客基础＋沉刃，总损血 15，剩架势 12。"""
        c = case(side(hp=30, qi=8, posture=20),
                 side(hp=36, qi=10, posture=18, weapon=(6, 2, "blade"), arts=["沉刃斩"]),
                 ["attack"], ["guard"])
        r = simulate(c, V18)["rounds"][0]
        self.assertEqual(r["player"]["hp"], 15)
        self.assertEqual(r["player"]["posture"], 12)


class TestHandCalcV19(unittest.TestCase):
    def _c115(self, decisions=("attack",), cycle=("guard",)):
        """战斗细则 11.5 输入：铁剑、叠寒剑＋崩势追击、留力 0、内力 10（已含轮初恢复，故输入 8）；
        对手气血 30、架势 10／10，本轮意图架招。"""
        return case(side(hp=30, qi=8, arts=["叠寒剑", "崩势追击"], reserve=0),
                    side(hp=30, qi=8, posture=10),
                    list(cycle), list(decisions))

    def test_combat_11_5_cold_into_guard(self):
        """战斗细则 11.5（V1.9）：敌气血 19，玩家内力 4；护势在攻击链结束后消费；冻结作用于下一次行动；轮末架势 4。"""
        r = simulate(self._c115())["rounds"][0]
        self.assertEqual(r["enemy"]["hp"], 19)
        self.assertEqual(r["player"]["qi"], 4)
        self.assertEqual(r["enemy"]["posture"], 4)
        self.assertFalse(r["enemy"]["ward"])
        self.assertTrue(r["enemy"]["frozen"])
        self.assertEqual(r["enemy"]["cold"], 0)
        self.assertFalse(r["player"]["opening"])
        self.assertEqual(r["player"]["hp"], 30)

    def test_contract_freeze_skips_next_guard(self):
        """执行契约第四章“冻结与架招”＋主计划 4.3：架招已提交后冻结不撤销（11.5），
        冻结跳过下一次尚未使用的基础行动：次轮的架招被跳过，不回架势、不建护势，也不额外送行动。"""
        r = simulate(self._c115(decisions=("attack", "guard"), cycle=("guard", "guard")))["rounds"]
        self.assertEqual(r[1]["enemy"]["posture"], 4)
        self.assertFalse(r[1]["enemy"]["ward"])
        self.assertFalse(r[1]["enemy"]["frozen"])
        self.assertEqual(r[1]["player"]["hp"], 30)

    def test_main_4_3_cold_cap_2_during_protection(self):
        """主计划 4.3／战斗细则第七章：从冻结施加到保护窗口结束，寒意上限为 2。
        11.5 之后敌方架招被跳过；保护行动尚未执行时玩家叠寒剑三次接触，寒意只到 2，不再冻结。"""
        r = simulate(self._c115(decisions=("attack", "attack"), cycle=("guard", "guard")))["rounds"]
        self.assertEqual(r[1]["enemy"]["cold"], 2)
        self.assertFalse(r[1]["enemy"]["frozen"])

    def test_enemies_8_1_blade_guard_v19_note(self):
        """敌人细则 8.1 的 V1.2 注（V1.9）：基础减伤为 3、架势减 2，沉刃斩也减半为 6、架势减 6；总损血 9，剩架势 12。"""
        c = case(side(hp=30, qi=8, posture=20),
                 side(hp=36, qi=10, posture=18, weapon=(6, 2, "blade"), arts=["沉刃斩"]),
                 ["attack"], ["guard"])
        r = simulate(c)["rounds"][0]
        self.assertEqual(r["player"]["hp"], 21)
        self.assertEqual(r["player"]["posture"], 12)
        self.assertEqual(r["enemy"]["qi"], 7)   # 10+2-5

    def test_enemies_8_1_two_contacts_resonance_4(self):
        """敌人细则 8.1 第二项／执行契约“只有两次接触”：三连第一击被身法闪避，另两击接触，反震 4。
        身法由守卫的回身步在基础出招被格挡后取得。"""
        c = case(side(hp=30, qi=8, arts=["叠寒剑"]),
                 side(hp=48, qi=8, posture=20, arts=["回身步", "蓄震诀"]),
                 ["guard"], ["attack"])
        r = simulate(c)["rounds"][0]
        self.assertEqual(r["player"]["hp"], 26)
        self.assertFalse(r["enemy"]["step"])

    def test_contract_dodged_base_attack_no_contact_skill(self):
        """执行契约“完全闪避基础出招”／敌人细则 8.1 第三项：目标有一份身法，
        基础出招被完全闪避，接触起势的技能不发动、不付款。"""
        c = case(side(hp=30, qi=8, arts=["叠寒剑"]),
                 side(hp=30, qi=8, posture=20, arts=["踏风步"]),
                 ["attack"], ["attack"])
        r = simulate(c)["rounds"][0]
        self.assertEqual(r["player"]["qi"], 10)        # 8+2，叠寒剑未付款
        self.assertEqual(r["enemy"]["hp"], 30)
        self.assertEqual(r["enemy"]["cold"], 0)
        self.assertFalse(r["enemy"]["step"])           # 身法已被消费

    def test_enemies_8_1_blade_base_dodged_no_heavy(self):
        """敌人细则 8.1 第三项：刀客基础 6／2 被玩家已有身法闪避，没有基础接触；通脉、沉刃不由该动作发动。"""
        c = case(side(hp=30, qi=8, arts=["踏风步"]),
                 side(hp=36, qi=10, posture=18, weapon=(6, 2, "blade"), arts=["通脉诀", "沉刃斩"]),
                 ["breathe", "attack"], ["attack", "breathe"])
        r = simulate(c)["rounds"]
        self.assertTrue(r[0]["player"]["step"])
        self.assertEqual(r[1]["player"]["hp"], 30)
        self.assertFalse(r[1]["player"]["step"])
        self.assertEqual(r[1]["enemy"]["qi"], r[0]["enemy"]["qi"] + 2)  # 只有轮初恢复

    def test_combat_14_2_combo_kill_stops(self):
        """战斗细则 14.2／5.3 第 5 步：三连致死时停止后续打击，不再叠状态。"""
        c = case(side(hp=30, qi=8, arts=["叠寒剑", "崩势追击"]),
                 side(hp=6, qi=8, posture=20),
                 ["breathe"], ["attack", "attack"])
        out = simulate(c)
        self.assertEqual(len(out["rounds"]), 1)
        r = out["rounds"][0]
        self.assertEqual(r["over"], "victory")
        self.assertEqual(r["enemy"]["hp"], 0)
        self.assertEqual(r["enemy"]["cold"], 0)
        self.assertEqual(r["player"]["qi"], 5)

    def test_main_4_2_enemy_first_on_attack(self):
        """主计划 4.2／V1.9 修订 #2：敌方本轮意图为出招时敌方先手；V1.8 为玩家先手。"""
        c = case(side(hp=4, hp_max=30, qi=8), side(hp=4, hp_max=30, qi=8, posture=10), ["attack"], ["attack"])
        self.assertEqual(simulate(c)["rounds"][0]["over"], "defeat")
        self.assertEqual(simulate(c, V18)["rounds"][0]["over"], "victory")

    def test_main_4_2_recovery_and_breathe_capped(self):
        """主计划 4.2：轮初恢复 2、调息恢复 4，均不超过上限 20。"""
        c = case(side(qi=15), side(qi=8, posture=10), ["guard"], ["breathe", "breathe"])
        r = simulate(c)["rounds"]
        self.assertEqual(r[0]["player"]["qi"], 20)   # 15+2+4 → 20
        self.assertEqual(r[0]["enemy"]["qi"], 10)
        self.assertEqual(r[1]["player"]["qi"], 20)

    def test_io_example_runs(self):
        """oracle-io.md 第二节示例输入能完整结算四轮且字段齐全（不检查数值：示例输出只示意格式）。"""
        c = {
            "player": {"hp": 30, "hpMax": 30, "qi": 10, "qiMax": 20, "posture": 20, "postureMax": 20,
                       "reserve": 0, "weapon": {"hp": 4, "posture": 4, "class": "sword"},
                       "arts": ["叠寒剑", "崩势追击", "归息诀"]},
            "enemy": {"hp": 30, "hpMax": 30, "qi": 8, "qiMax": 20, "posture": 10, "postureMax": 10,
                      "weapon": {"hp": 4, "posture": 4, "class": "sword"}, "arts": ["归息诀", "蓄震诀"],
                      "cycle": [{"stance": "guard", "disabled": []},
                                {"stance": "attack", "disabled": ["蓄震诀"]},
                                {"stance": "breathe", "disabled": []}], "startItem": 0},
            "decisions": [{"stance": "attack"},
                          {"stance": "guard", "change": {"pause": ["崩势追击"]}},
                          {"stance": "attack", "change": {"priority": ["崩势追击", "叠寒剑", "归息诀"]}},
                          {"stance": "breathe", "change": {"reserve": 4}}],
        }
        out = simulate(c)
        self.assertIn("error", out)   # 示例用了三次变招，超过每战两次
        c["decisions"][3] = {"stance": "breathe"}
        out = simulate(c)
        self.assertNotIn("error", out)
        keys = {"hp", "qi", "posture", "ward", "step", "cold", "frozen", "opening"}
        for r in out["rounds"]:
            self.assertEqual(set(r["player"]), keys)
            self.assertEqual(set(r["enemy"]), keys)
            self.assertIn(r["over"], (None, "victory", "defeat", "safetyLimit"))


class TestInvalidInput(unittest.TestCase):
    """oracle-io.md 第三节、执行契约第四章“非法构筑”、组件细则第九章。"""

    def _base(self, **kw):
        return case(side(**kw), side(qi=8, posture=10), ["attack"], ["attack"])

    def test_more_than_four_arts(self):
        c = self._base(arts=["归息诀", "通脉诀", "蓄元诀", "养元功", "守拙诀"])
        self.assertIn("error", simulate(c))

    def test_capacity_over_12(self):
        c = self._base(arts=["叠寒剑", "崩势追击", "借力诀"])  # 6+4+3=13
        self.assertIn("error", simulate(c))

    def test_capacity_12_ok(self):
        """执行契约 5.1：cold_chain 叠寒剑、崩势追击、归息诀 容量 12 合法。"""
        c = self._base(arts=["叠寒剑", "崩势追击", "归息诀"])
        self.assertNotIn("error", simulate(c))

    def test_sword_only_on_blade(self):
        """组件细则第九章：刀或棍装备剑专用连击不合法。"""
        c = self._base(arts=["叠寒剑"], weapon=(4, 4, "blade"))
        self.assertIn("error", simulate(c))
        c = self._base(arts=["逐影刺"], weapon=(4, 4, "staff"))
        self.assertIn("error", simulate(c))

    def test_unknown_art(self):
        self.assertIn("error", simulate(self._base(arts=["不存在的武学"])))

    def test_player_cannot_use_enemy_art(self):
        self.assertIn("error", simulate(self._base(arts=["蓄震诀"])))

    def test_negative_resource(self):
        self.assertIn("error", simulate(self._base(qi=-1)))

    def test_change_rules(self):
        """主计划 4.1：每战两次变招，每次只做一项调整。"""
        base = self._base(arts=["叠寒剑", "崩势追击"])
        for bad in ({"pause": ["叠寒剑"], "reserve": 2}, {"pause": ["归息诀"]},
                    {"priority": ["叠寒剑"]}, {"reserve": -1}, {}):
            with self.subTest(change=bad):
                c = json.loads(json.dumps(base))
                c["decisions"] = [{"stance": "attack", "change": bad}]
                self.assertIn("error", simulate(c))
        c = json.loads(json.dumps(base))
        c["decisions"] = [{"stance": "attack", "change": {"reserve": 1}}] * 3
        self.assertIn("error", simulate(c))
        c["decisions"] = [{"stance": "attack", "change": {"reserve": 1}}] * 2
        self.assertNotIn("error", simulate(c))


class TestCli(unittest.TestCase):
    def test_stdin_stdout(self):
        c = case(side(), side(qi=8, posture=10), ["breathe"], ["attack"])
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "run.py")
        p = subprocess.run([sys.executable, path], input=json.dumps(c), capture_output=True,
                           text=True, check=True)
        out = json.loads(p.stdout)
        self.assertEqual(out["rounds"][0]["enemy"]["hp"], 26)


if __name__ == "__main__":
    unittest.main()
