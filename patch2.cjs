const fs = require('fs');
let content = fs.readFileSync('src/components/workflow/WorkflowCard.tsx', 'utf-8');
const startStr = 'className={cn(';
const endStr = ')}\n      >';
const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  const newClass = `className={cn(
          "group relative rounded-2xl transition-all duration-200 ease-in-out w-full",
          !isExpanded ? "bg-transparent border border-transparent" : "bg-card border border-border/60 shadow-[0_4px_30px_rgba(0,0,0,0.06)] z-10"
        )}`;
  content = content.substring(0, startIdx) + newClass + content.substring(endIdx + 2);
  fs.writeFileSync('src/components/workflow/WorkflowCard.tsx', content);
  console.log('Sucesso!');
} else {
  console.log('Nao achou');
}
