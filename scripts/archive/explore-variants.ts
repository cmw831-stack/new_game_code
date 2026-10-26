// 历史脚本（策划书 V1.8 阶段的调参实验）。它依赖当时的默认规则与内容数值；
// 在 V1.9 之后直接运行会得到不同结果。复现原始数据请检出提交 0a98212 后运行。
// 探索性参数扫描：只在内存里临时改敌人数值，用来判断问题出在哪里；不修改内容目录。
// 结果写进模拟报告第三节。用法：npm run explore

import { createBattle } from '../../src/engine/setup.ts';
import { runBattle } from '../../src/engine/round.ts';
import { findEnemy, findWeapon } from '../../src/content/catalog.ts';
import { BUILDS, STRATEGIES } from '../../src/sim/strategies.ts';
import { MATRIX_ENEMIES, SEEDS } from '../../src/sim/matrix.ts';

interface Variant {
  name: string;
  hpMul: number;
  atkHp: number;
  atkPosture: number;
  freezeThreshold: number;
}

const VARIANTS: Variant[] = [
  { name: '基线', hpMul: 1, atkHp: 0, atkPosture: 0, freezeThreshold: 3 },
  { name: '敌气血×2', hpMul: 2, atkHp: 0, atkPosture: 0, freezeThreshold: 3 },
  { name: '敌气血×1.5，冻结阈值 4', hpMul: 1.5, atkHp: 0, atkPosture: 0, freezeThreshold: 4 },
  { name: '敌气血×1.5，冻结阈值 4，敌基础出招 +3／+2', hpMul: 1.5, atkHp: 3, atkPosture: 2, freezeThreshold: 4 },
];

for (const v of VARIANTS) {
  console.log(`\n## ${v.name}\n`);
  console.log('| 敌人 | 构筑 | 始终出招 | 读窗口 | 守反为主 |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const enemy of MATRIX_ENEMIES) {
    const cfg = findEnemy(enemy)!;
    cfg.hpMax = Math.round(cfg.hpMax * v.hpMul);
    const weapon = findWeapon(cfg.weaponId)!;
    weapon.base.hp += v.atkHp;
    weapon.base.posture += v.atkPosture;
    for (const b of BUILDS) {
      const cells = STRATEGIES.map((st) => {
        let wins = 0;
        let rounds = 0;
        let hp = 0;
        for (const seed of SEEDS) {
          const s0 = createBattle({
            seed,
            player: { hp: 30, hpMax: 30, qi: 20, qiMax: 20, posture: 20, postureMax: 20, weaponId: 'iron_sword', arts: b.arts },
            enemy: { config: cfg, weapon },
          });
          s0.enemy.coldThreshold = v.freezeThreshold;
          s0.enemy.coldCapProtected = v.freezeThreshold - 1;
          const r = runBattle(s0, st.decide);
          if (r.state.over!.reason === 'victory') {
            wins += 1;
            rounds += r.rounds;
            hp += r.state.player.hp;
          }
        }
        return wins ? `${wins}/20，${(rounds / wins).toFixed(1)} 轮，剩 ${(hp / wins).toFixed(0)}` : '0/20';
      });
      console.log(`| ${cfg.name}（${cfg.hpMax}） | ${b.name} | ${cells.join(' | ')} |`);
    }
  }
}
