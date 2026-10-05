const fs = require('fs');
let content = fs.readFileSync('src/components/workflow/WorkflowCard.tsx', 'utf-8');
const regex = /className=\{cn\([\s\S]*?\}\s*\)\}/;
const newClass = `className={cn(
        "group relative rounded-2xl transition-all duration-200 ease-in-out w-full",
        !isExpanded ? "bg-transparent border border-transparent" : "bg-card border border-border/60 shadow-[0_4px_30px_rgba(0,0,0,0.06)] z-10"
      )}`;
content = content.replace(regex, newClass);
fs.writeFileSync('src/components/workflow/WorkflowCard.tsx', content);
console.log('Sucesso!');
