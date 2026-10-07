const fs = require('fs');
const path = 'D:\\Users\\Eduardo\\Documents\\00- LUNARI\\00- Antigravity\\lunari-studio\\src\\components\\leads\\LeadCard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add image error state
const stateMatch = 'const [isStartingChat, setIsStartingChat] = useState(false);';
content = content.replace(stateMatch, `${stateMatch}\n  const [avatarError, setAvatarError] = useState(false);`);

// 2. Add useEffect for avatar error reset
const avatarUrlMatch = 'const avatarUrl = useMemo(() => {';
content = content.replace(avatarUrlMatch, `useEffect(() => { setAvatarError(false); }, [lead.whatsapp, lead.telefone, client]);\n\n  ${avatarUrlMatch}`);

// 3. Update img tag
const imgMatch = '<img src={avatarUrl} alt={lead.nome} className="w-full h-full object-cover" />';
content = content.replace(imgMatch, '<img src={avatarUrl} alt={lead.nome} className="w-full h-full object-cover" onError={() => setAvatarError(true)} />');
content = content.replace('{avatarUrl ? (', '{avatarUrl && !avatarError ? (');

// 4. Update category colors
const hashColorFunction = `function getCategoryColor(categoryName: string) {
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16'];
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}`;
if (!content.includes('getCategoryColor(')) {
  content = content.replace('export default function LeadCard({', `${hashColorFunction}\n\nexport default function LeadCard({`);
}

content = content.replace(
  'backgroundColor: leadCategoria.cor ? `${leadCategoria.cor}15` : \'rgba(156, 163, 175, 0.15)\',',
  'backgroundColor: (leadCategoria.cor || getCategoryColor(leadCategoria.nome)) + \'15\','
);
content = content.replace(
  'color: leadCategoria.cor || \'#9ca3af\',',
  'color: leadCategoria.cor || getCategoryColor(leadCategoria.nome),'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed lead card');
