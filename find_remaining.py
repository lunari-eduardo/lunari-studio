import json
with open('semgrep_results.json', encoding='utf-16') as f:
    d = json.load(f)
for r in d['results']:
    if 'prototype-pollution' in r['check_id']:
        print(f"[{r['check_id']}] {r['path']}:{r['start']['line']}")
    if 'incomplete-sanitization' in r['check_id']:
        print(f"[{r['check_id']}] {r['path']}:{r['start']['line']}")
    if 'react-unsanitized-method' in r['check_id']:
        print(f"[{r['check_id']}] {r['path']}:{r['start']['line']}")
    if 'detect-non-literal-regexp' in r['check_id']:
        print(f"[{r['check_id']}] {r['path']}:{r['start']['line']}")
