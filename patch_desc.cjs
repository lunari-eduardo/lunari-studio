const fs = require('fs');
let content = fs.readFileSync('src/components/workflow/WorkflowCardCollapsed.tsx', 'utf-8');

const packageStart = content.indexOf('<div className="w-48 shrink-0 hidden md:block" onClick={e => e.stopPropagation()}>\n          <WorkflowPackageCombobox');

if (packageStart !== -1) {
  const descInput = `<div className="w-48 xl:w-56 shrink-0 hidden md:flex items-center px-1" onClick={e => e.stopPropagation()}>
          <input
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Adicionar descrição..."
            className="w-full text-[13px] bg-transparent border border-transparent hover:border-border/60 hover:bg-muted/30 focus:border-border focus:bg-background focus:ring-2 focus:ring-accent-gold/40 rounded-lg px-3 py-1.5 transition-all text-muted-foreground focus:text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
        </div>

        `;
  content = content.substring(0, packageStart) + descInput + content.substring(packageStart);
  
  content = content.replace(/description=\{descriptionValue\}\s*/, '');
  
  fs.writeFileSync('src/components/workflow/WorkflowCardCollapsed.tsx', content);
  console.log('Sucesso!');
} else {
  console.log('Nao achou o combobox');
}
