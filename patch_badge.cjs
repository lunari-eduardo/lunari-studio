const fs = require('fs');
let content = fs.readFileSync('src/components/workflow/ColoredStatusBadge.tsx', 'utf-8');

// I will just replace the whole variant="soft" block to be safe!
const regex = /if \(actualVariant === "soft"\) \{[\s\S]*?return \([\s\S]*?<div[\s\S]*?>[\s\S]*?<span[\s\S]*?\/>[\s\S]*?<span className="truncate">\{displayText\}<\/span>[\s\S]*?<\/div>[\s\S]*?\);[\s\S]*?\}/;

const newBlock = `if (actualVariant === "soft") {
    const tone = getStatusTone(statusColor);
    
    return (
      <div 
        className={cn(
          "px-2.5 h-8 rounded-full border flex items-center gap-2 text-xs font-semibold whitespace-nowrap",
          "bg-[var(--bg-light)] dark:bg-[var(--bg-dark)]",
          "border-[var(--border-light)] dark:border-[var(--border-dark)]",
          "text-[var(--text-light)] dark:text-[var(--text-dark)]",
          className
        )}
        title={displayText}
        style={{ 
          '--bg-light': tone.bgLight,
          '--bg-dark': tone.bgDark,
          '--border-light': tone.borderLight,
          '--border-dark': tone.borderDark,
          '--text-light': tone.textLight,
          '--text-dark': '#FFFFFF',
        } as React.CSSProperties}
      >
        <span 
          className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white/60 dark:ring-black/20" 
          style={{ backgroundColor: statusColor }}
        />
        <span className="truncate">{displayText}</span>
      </div>
    );
  }`;

content = content.replace(regex, newBlock);

// Clean up unused imports if I left them
content = content.replace(/import \{ useTheme \} from "next-themes";\n?/, '');

fs.writeFileSync('src/components/workflow/ColoredStatusBadge.tsx', content);
console.log('Fixed ColoredStatusBadge.tsx');
