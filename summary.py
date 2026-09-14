import json
from collections import Counter

with open('semgrep_results.json', encoding='utf-16') as f:
    d = json.load(f)

print(f"Total findings: {len(d['results'])}")

print("\nFiles with most findings:")
file_counter = Counter(r['path'] for r in d['results'])
for k, v in file_counter.most_common(20):
    print(f"  {v}: {k}")

print("\nMost common rules:")
rule_counter = Counter(r['check_id'] for r in d['results'])
for k, v in rule_counter.most_common(20):
    print(f"  {v}: {k}")
