"""把 Stryker 的 JSON 报告（.stryker-tmp/mutation.json，体积大，不入库）压成可入库的摘要。
用法：python3 -I scripts/e1/mutation_summary.py > docs/reports/e1-mutation-summary.md"""
import json
from collections import Counter

d = json.load(open(".stryker-tmp/mutation.json", encoding="utf-8"))
rows, total = [], Counter()
for path, f in sorted(d["files"].items()):
    name = path.split("src/")[-1]
    src = f["source"].split("\n")
    for m in f["mutants"]:
        total[(name, m["status"])] += 1
        if m["status"] != "Survived":
            continue
        line = m["location"]["start"]["line"]
        code = src[line - 1].strip()[:70].replace("|", "\\|")
        rep = (m.get("replacement") or "").replace("\n", " ")[:40].replace("|", "\\|")
        rows.append((name, line, m["mutatorName"], code, rep))

files = sorted({n for n, _ in total})
print("# E1 变异测试摘要\n")
print("由 `npx stryker run` 后运行 `python3 -I scripts/e1/mutation_summary.py` 生成，请勿手改。原始报告体积大，不入库。\n")
print("| 文件 | 抓到 | 超时（算抓到） | 漏掉 | 分数 |\n| --- | ---: | ---: | ---: | ---: |")
for n in files:
    k, t, s = total[(n, "Killed")], total[(n, "Timeout")], total[(n, "Survived")]
    print(f"| {n} | {k} | {t} | {s} | {100 * (k + t) / (k + t + s):.2f}% |")
K = sum(v for (n, st), v in total.items() if st == "Killed"); T = sum(v for (n, st), v in total.items() if st == "Timeout"); S = len(rows)
print(f"| **合计** | {K} | {T} | {S} | **{100 * (K + T) / (K + T + S):.2f}%** |\n")
print("## 漏掉的变异按类型\n\n| 类型 | 个数 |\n| --- | ---: |")
for k, v in Counter(r[2] for r in rows).most_common():
    print(f"| {k} | {v} |")
print("\n## 全部漏掉的变异\n\n| 文件:行 | 类型 | 原代码 | 改成 |\n| --- | --- | --- | --- |")
for n, line, mut, code, rep in rows:
    print(f"| {n}:{line} | {mut} | `{code}` | `{rep}` |")
