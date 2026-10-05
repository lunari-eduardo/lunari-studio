import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Send,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  FileText,
  MessageCircle,
  Briefcase,
  Calendar,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useConversasTemplates,
  renderTemplateText,
  type ConversasTemplate,
} from '@/hooks/useConversasTemplates';
import { LibraryPanel } from './LibraryPanel';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCategorias } from '@/hooks/useCategorias';
import type { Chat, EnrichedChat } from '@/modules/conversas/types';

export interface TemplatesListTabProps {
  chat: Chat | EnrichedChat;
  messages?: any[];
  suggestedCategory?: string;
  suggestedStep?: string;
  onInsertToComposer: (text: string) => void;
}

export function TemplatesListTab({
  chat,
  messages = [],
  suggestedCategory,
  suggestedStep,
  onInsertToComposer,
}: TemplatesListTabProps) {
  const { profile } = useUserProfile();
  const { categorias = [] } = useCategorias();
  const {
    templates,
    isLoading,
    seedDefaultTemplates,
    isSeeding,
  } = useConversasTemplates();

  const [search, setSearch] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);

  const studioName = profile?.empresa?.trim() || profile?.nome?.trim() || 'EstÃºdio';
  const pixKey = (profile as any)?.pix_key || '';

  const templateContext = useMemo(
    () => ({
      contactName: chat.contato_nome,
      studioName,
      pixKey,
    }),
    [chat.contato_nome, studioName, pixKey],
  );

  const filtered = useMemo(() => {
    let result = templates;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        t => t.nome.toLowerCase().includes(q) || t.conteudo.toLowerCase().includes(q) || (t.categoria && t.categoria.toLowerCase().includes(q))
      );
    }
    
    // Auto order based on suggested category, step, and recent message intents
    if (!search) {
      const suggestedCatLower = suggestedCategory?.toLowerCase() || '';
      const matchedCat = categorias.find(c => c.nome.toLowerCase() === suggestedCatLower);
      
      // Extract intent from the last 3 user messages
      const recentUserMessages = messages
        .filter(m => m.direction === 'inbound')
        .slice(-3)
        .map(m => ((m.content || '') + ' ' + (m.audio_transcript || '')).toLowerCase())
        .join(' ');
        
      const hasPixIntent = recentUserMessages.includes('pix') || recentUserMessages.includes('chave');
      const hasBudgetIntent = recentUserMessages.includes('valor') || recentUserMessages.includes('orÃ§ament') || recentUserMessages.includes('pacote');
      const hasDateIntent = recentUserMessages.includes('dia') || recentUserMessages.includes('data') || recentUserMessages.includes('agenda');
      
      result = [...result].sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        
        // Context Match Score (Category + Step)
        if (suggestedCategory && ((a.categoria_id === matchedCat?.id) || (a.categoria?.toLowerCase() === suggestedCatLower))) scoreA += 2;
        if (suggestedCategory && ((b.categoria_id === matchedCat?.id) || (b.categoria?.toLowerCase() === suggestedCatLower))) scoreB += 2;
        
        if (suggestedStep && a.etapa === suggestedStep) scoreA += 1;
        if (suggestedStep && b.etapa === suggestedStep) scoreB += 1;
        
        // Intent Match Score (Keywords)
        const checkTags = (template: ConversasTemplate, checkPix: boolean, checkBudget: boolean, checkDate: boolean) => {
          let score = 0;
          const tTags = Array.isArray(template.palavras_chave) ? template.palavras_chave as string[] : [];
          const tText = (template.nome + ' ' + template.conteudo).toLowerCase();
          
          if (checkPix && (tTags.includes('pix') || tTags.includes('pagamento') || tText.includes('pix'))) score += 3;
          if (checkBudget && (tTags.includes('orÃ§amento') || tTags.includes('valores') || tText.includes('orÃ§ament'))) score += 3;
          if (checkDate && (tTags.includes('agendamento') || tTags.includes('data') || tText.includes('agendament'))) score += 3;
          
          return score;
        };
        
        scoreA += checkTags(a, hasPixIntent, hasBudgetIntent, hasDateIntent);
        scoreB += checkTags(b, hasPixIntent, hasBudgetIntent, hasDateIntent);
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (a.ordem || 0) - (b.ordem || 0);
      });
    }
    // Quick panel only shows top 3
    return result.slice(0, 3);
  }, [templates, search, suggestedCategory, suggestedStep, categorias, messages]);

  const handleOpenLibrary = () => {
    setLibraryOpen(true);
  };

  const handleInsert = (template: ConversasTemplate) => {
    const rendered = renderTemplateText(template.conteudo, templateContext);
    onInsertToComposer(rendered);
  };

  return (
    <div className="flex flex-col h-full bg-transparent mt-2">
      {/* Header: Templates */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#D4AF37]" />
          Templates
        </h3>
        <button 
          onClick={handleOpenLibrary}
          className="text-[11px] font-medium text-[#B8925F] hover:text-[#C9A87C] transition-colors"
        >
          Ver todos
        </button>
      </div>

      <div className="relative mb-3 px-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar mensagens ou modelos..."
          className="h-8 pl-8 text-[11px] bg-zinc-50 dark:bg-zinc-900/50 border-black/[0.06] dark:border-white/[0.08] rounded-lg shadow-sm"
        />
      </div>

      {/* Lista Compacta de Templates */}
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[260px] px-1 pb-1">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin mb-2" />
            <span className="text-[11px]">Carregando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[11px] text-zinc-500">VocÃªï¿½ ainda nï¿½o possui modelos salvos.</p>
            {!search && (
              <Button
                variant="link"
                onClick={() => seedDefaultTemplates()}
                disabled={isSeeding}
                className="text-[11px] text-[#C9A87C] h-auto p-0 mt-1"
              >
                {isSeeding ? 'Carregando...' : 'Carregar biblioteca da Lua'}
              </Button>
            )}
          </div>
        ) : (
          filtered.map((template, idx) => {
            const isSuggested = suggestedCategory && (
              template.categoria_id === categorias.find(c => c.nome.toLowerCase() === suggestedCategory.toLowerCase())?.id ||
              template.categoria?.toLowerCase() === suggestedCategory.toLowerCase()
            );
            
            // Ãcones aleatÃ³rios limpos baseados nÃ£o ID ou index para a UI
            const icons = [
               { icon: <MessageCircle className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />, bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30" },
               { icon: <Briefcase className="h-3.5 w-3.5 text-[#D4AF37]" />, bg: "bg-[#D4AF37]/10 border-[#D4AF37]/20" },
               { icon: <Calendar className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />, bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30" },
               { icon: <Zap className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />, bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/30" }
            ];
            const visual = icons[idx % icons.length];

            return (
              <div
                key={template.id}
                className={cn(
                  "group flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer bg-white dark:bg-[#1A1A1A]",
                  isSuggested
                    ? "border-[#D4AF37]/30 shadow-[0_1px_4px_rgba(212,175,55,0.05)] bg-gradient-to-r from-[#D4AF37]/[0.02] to-transparent"
                    : "border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
                )}
                onClick={() => handleInsert(template)}
              >
                <div className="flex items-center gap-3 min-w-0 pl-1">
                  <div className="flex items-center justify-center shrink-0">
                    {visual.icon}
                  </div>
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                      {template.nome}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[200px]">
                      {template.conteudo}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center pr-1 text-zinc-400 shrink-0">
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })
        )}
      </div>

      <LibraryPanel 
        open={libraryOpen} 
        onOpenChange={setLibraryOpen}
        chat={chat}
        suggestedCategory={suggestedCategory}
        suggestedStep={suggestedStep}
        onInsertToComposer={onInsertToComposer}
      />
    </div>
  );
}
