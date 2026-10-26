# 武林·自创绝学

> 习百家武学，悟万般变化。
> 不求天下第一秘籍，只创属于自己的绝世武功。

一款 PC 单机独立游戏：玩家继承一部写满失败的武学手稿，拆解百家招式，重组成自己的绝学，再用它救人、铸剑、被人记住。

**当前状态：** Phase 1 进行中。已有无界面的 TypeScript 规则引擎和验收测试，尚无可玩的界面。

## 运行测试

需要 Node 24 或更高版本。

```bash
npm install
```

```bash
npm run check
```

运行 27 格构筑矩阵并生成数据表：

```bash
npm run matrix
```

## 文档

- [策划书 V1.9](docs/design/wulin-self-created-arts-v1.9.md)：当前正式版本
- [V1.9 修订说明](docs/design/wulin-v1.9-changes.md)：按模拟结果修订的规则与数值、失效的旧算例、待验证事项
- [改进方案 V1.0](docs/proposals/wulin-improvement-proposal-v1.0.md)：对 V1.7 的评审与提案
- [V1.8 修订指令](docs/proposals/wulin-v1.8-revision-instructions.md)：已采纳的 D1–D3 规则修订
- [Phase 1 实现说明](docs/engine/phase1-implementation-notes.md)
- [Phase 1 构筑矩阵模拟报告](docs/reports/phase1-matrix-report.md)
- [Phase 1 调参实验 1 报告](docs/reports/phase1-experiment-1-report.md)
- [Phase 1 调参实验 2 报告](docs/reports/phase1-experiment-2-report.md)
- [Phase 2 构筑实验室：范围与技术方案](docs/plans/phase2-lab-plan.md)
- [进度与决策记录](PROGRESS.md)
