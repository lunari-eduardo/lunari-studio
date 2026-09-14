import json
with open('semgrep_results.json', encoding='utf-16') as f:
    d = json.load(f)

for r in d['results'][:15]:
    print(f"[{r['check_id']}] {r['path']}:{r['start']['line']} - {r['extra']['message'][:100]}")
