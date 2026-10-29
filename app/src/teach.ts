// 课程的界面文字与提示。课程的固定输入与完成判定在 src/teach/lessons.ts；这里只负责说明。
// 依据：教学细则 V1.2 第三章各课的“玩家行为”一栏；动态提示来自 M3 走查报告第二节（F1、F2）。

import type { BattleState } from '../../src/rules/types.ts';
import type { LessonId } from '../../src/teach/progress.ts';

export interface LessonText {
  title: string;
  /** 进入本课前的说明。 */
  brief: string;
  /** 本课当前局面下的额外提示；没有则为 null。 */
  hint?: (s: BattleState) => string | null;
  /** 战斗课以外、尚未接入界面的课。 */
  later?: boolean;
}

export const LESSON_TEXT: Record<LessonId, LessonText> = {
  teach_intro_v1: {
    title: '认识三资源与四个武学位',
    brief: '看一眼气血、内力、架势，四个武学位和容量 12。然后选一件“我这次想验证的事”，之后随时可以改。',
  },
  teach_first_clash_v1: {
    title: '首战：出招与接招',
    brief: '三种姿态都可以选，建议先出招。你的基础出招打中对手后，断势击会自己接上。用已有手段打崩对手的架势，本课就完成，不要求打赢。',
  },
  teach_guard_return_v1: {
    title: '架招与归息',
    brief: '建议在对手出招的那一轮架招：基础攻击被护势减半，归息诀在格挡后回气。回气必须真的回上来，内力已满时不算。',
    hint: (s) => (s.player.qi >= s.player.qiMax ? '内力已满，归息诀格挡后没有可回的内力。先出招花掉一些，在对手出招那一轮架招。' : null),
  },
  teach_breath_v1: {
    title: '调息',
    brief: '同一课里，出招和调息都要真的做一次，顺序随你。注意内力的两笔变化：每轮开始自然 +2，调息再 +4。',
  },
  teach_cold_chain_v1: {
    title: '寒霜连锁',
    brief: '叠寒剑 → 崩势追击 → 归息诀。建议出招，看三次接触怎样积满寒意冻结对手、打崩架势取得破绽，再由崩势追击消费破绽。',
  },
  teach_resonance_v1: {
    title: '蓄震守卫',
    brief: '对手装着蓄震诀：费用 2 内力；当你的一门主招对它接触至少两次后，它按接触次数反击，每次 2 气血。三连会触发它，单次打击不会。读完后自由选择，打完一整轮即可，不要求受伤或打赢。',
  },
  teach_edit_one_v1: { title: '首份改良：替换一个槽', brief: '把叠寒剑的三连换成你已知的破势主招，保留寒劲，看费用、容量和效果的变化。' },
  teach_compare_versions_v1: { title: '版本对照', brief: '原版与改良版各打一轮蓄震守卫，并列比较，命名保存新版本。' },
  teach_lab_graduation_v1: { title: '结业', brief: '回顾学到的武学、精通与残页，然后进入自由实验室：自己组构筑、改良、对照，挑战带词缀的对手。' },
  teach_manuscript_page_v1: { title: '卷首残页', brief: '从刚劲、震劲、柔劲中选一个补全残页，命名保存，再演练一轮。' },
};

/** “我这次想验证的事”（教学细则 teach_intro_v1）。 */
export const INTRO_GOALS = ['看懂对手每轮要做什么', '弄清一门武学为什么发动或没发动', '试着改一处武学再打一次'];
