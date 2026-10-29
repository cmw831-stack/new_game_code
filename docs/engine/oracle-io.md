# 参考实现的输入输出格式（E1 对拍用）

**日期：2026-10-29**

**用途：** 目标 V2 的 E1 要求一份**独立参考实现**：只读策划文档写成，看不到 `src/`。本文件只规定两边交换数据的格式，**不规定任何规则含义**；规则一律以 `docs/design/` 当前版本为准。

## 一、运行方式

```bash
python3 oracle/run.py < case.json > result.json
```

一次读入一个对局，按决策序列逐轮结算，输出每轮结束后的快照。对局在某一轮结束（胜、负、安全上限）后不再结算后面的决策。

## 二、输入

```json
{
  "player": {
    "hp": 30, "hpMax": 30, "qi": 10, "qiMax": 20, "posture": 20, "postureMax": 20,
    "reserve": 0,
    "weapon": { "hp": 4, "posture": 4, "class": "sword" },
    "arts": ["叠寒剑", "崩势追击", "归息诀"]
  },
  "enemy": {
    "hp": 30, "hpMax": 30, "qi": 8, "qiMax": 20, "posture": 10, "postureMax": 10,
    "weapon": { "hp": 4, "posture": 4, "class": "sword" },
    "arts": ["归息诀", "蓄震诀"],
    "cycle": [
      { "stance": "guard", "disabled": [] },
      { "stance": "attack", "disabled": ["蓄震诀"] },
      { "stance": "breathe", "disabled": [] }
    ],
    "startItem": 0
  },
  "decisions": [
    { "stance": "attack" },
    { "stance": "guard", "change": { "pause": ["崩势追击"] } },
    { "stance": "attack", "change": { "priority": ["崩势追击", "叠寒剑", "归息诀"] } },
    { "stance": "breathe", "change": { "reserve": 4 } }
  ]
}
```

- 资源都是**本场开始、第一轮轮初恢复之前**的当前值。
- `weapon` 是基础出招的气血／架势威力与兵器类别（`sword`、`blade`、`staff`）。威力已经包含敌人配置的加成，参考实现不再另加。
- `arts` 按**优先级顺序**列出武学名称：
  - 玩家与敌人都可以用组件细则 V1.2 第六章十二门预设的名称（如“叠寒剑”“归息诀”“借力诀”）。
  - 敌人还可以用敌人细则 V1.3 中敌方专用武学的名称（如“蓄震诀”）。
  - 武学的组件、费用、威力、限次都由参考实现自己从文档得出。
- `cycle` 是敌人意图的循环，从 `startItem` 开始，到末尾回到第 0 项，不抽段落。`disabled` 是这一项中被禁用的敌方武学名称。
- `decisions[i]` 是第 i+1 轮玩家的选择。`change` 是变招，每个对象只含 `pause`、`priority`、`reserve` 之一。
- 词缀、历练题目、药品不在本格式范围内。

## 三、输出

```json
{
  "rounds": [
    {
      "player": { "hp": 24, "qi": 7, "posture": 20, "ward": false, "step": false, "cold": 0, "frozen": false, "opening": false },
      "enemy":  { "hp": 27, "qi": 8, "posture": 10, "ward": false, "step": false, "cold": 0, "frozen": true, "opening": false },
      "over": null
    }
  ]
}
```

- 每一项是该轮**全部结算完毕后**的状态；对局在该轮结束时，这一项就是最后一项。
- `ward`：此刻是否还持有护势。`step`：是否还持有身法准备。`cold`：当前寒意层数。`frozen`：是否已被冻结、正等待跳过下一次基础行动。`opening`：是否持有尚未消费的破绽。
- `over`：`null`（继续）、`"victory"`（玩家胜）、`"defeat"`（玩家败）、`"safetyLimit"`（触发连锁安全上限，不算胜负）。
- 输入不合法（超过四门、容量超过 12、剑专用武学配非剑兵器、变招不合法等）时输出 `{"error": "原因"}`。

## 四、对拍规则

- 两边对同一输入逐轮比较全部字段。
- 不一致时回到文档裁决：写明文档章节与原文，裁决结果写进实现说明第四节；**不许为了对上而修改参考实现**，除非裁决认定参考实现读错了文档。
- 参考实现遇到文档没写清的地方，记入 `oracle/AMBIGUITIES.md`（章节、原文、两种读法、它选了哪种）。
