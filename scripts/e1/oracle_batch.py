"""E1 批量对拍驱动：逐行读入 JSON 对局，调用 oracle/run.py 的 simulate()，逐行输出结果。
只是驱动，不含规则；参考实现本身不改动。用法：python3 -I scripts/e1/oracle_batch.py < cases.jsonl > results.jsonl"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "oracle"))
import run  # noqa: E402

for line in sys.stdin:
    case = json.loads(line)
    try:
        out = run.simulate(case)
    except Exception as e:  # 参考实现自身出错也要如实报告
        out = {"crash": f"{type(e).__name__}: {e}"}
    sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
