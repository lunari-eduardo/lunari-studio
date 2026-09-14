import json
import re
import os

with open('semgrep_results.json', encoding='utf-16') as f:
    data = json.load(f)

# Group findings by file
findings_by_file = {}
for r in data['results']:
    if r['check_id'] == 'javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring':
        path = r['path']
        if path not in findings_by_file:
            findings_by_file[path] = []
        findings_by_file[path].append(r)

def fix_unsafe_formatstring(content, findings):
    # Sort findings in reverse order so we don't mess up offsets
    findings.sort(key=lambda x: x['start']['offset'], reverse=True)
    for f in findings:
        start = f['start']['offset']
        end = f['end']['offset']
        
        # The finding points to the arguments inside the function call, or the string concatenation.
        # Actually, Semgrep's start and end for this rule usually points to the whole function call or the argument.
        # Let's do a simple regex replace if it's a console.log/warn/error
        
        line_num = f['start']['line'] - 1
        
        # Instead of offset which might be tricky due to CRLF, we use line number.
        # We will just prepend `"%s", ` to the first argument of console.log/warn/error/info on that line.
        
        lines = content.split('\n')
        line = lines[line_num]
        
        # Find console.log( or console.error( etc
        match = re.search(r'(console\.(?:log|error|warn|info|debug)\s*\()', line)
        if match:
            # check if it already has "%s"
            if '"%s"' not in line and "'%s'" not in line:
                pos = match.end()
                # Insert "%s",
                new_line = line[:pos] + '"%s", ' + line[pos:]
                lines[line_num] = new_line
        
        content = '\n'.join(lines)
    return content

for path, findings in findings_by_file.items():
    print(f"Fixing {len(findings)} formatstring issues in {path}")
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = fix_unsafe_formatstring(content, findings)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
