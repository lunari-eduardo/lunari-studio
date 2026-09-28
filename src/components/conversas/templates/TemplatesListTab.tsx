import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Send,
  CornerDownLeft,
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
  suggestedCategory?: string;
  suggestedStep?: string;
  onInsertToComposer: (text: string) => void;
}

export function TemplatesListTab({
  chat,
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

  const studioName = profile?.empresa?.trim() || profile?.nome?.trim() || 'Estúdio';
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
    
    // Auto order based on suggested category and step
    if (!search && (suggestedCategory || suggestedStep)) {
      const suggestedCatLower = suggestedCategory?.toLowerCase() || '';
      const matchedCat = categorias.find(c => c.nome.toLowerCase() === suggestedCatLower);
      
      result = [...result].sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        
        // Exact category match gets +2
        if (suggestedCategory && ((a.categoria_id === matchedCat?.id) || (a.categoria?.toLowerCase() === suggestedCatLower))) scoreA += 2;
        if (suggestedCategory && ((b.categoria_id === matchedCat?.id) || (b.categoria?.toLowerCase() === suggestedCatLower))) scoreB += 2;
        
        // Exact step match gets +1
        if (suggestedStep && a.etapa === suggestedStep) scoreA += 1;
        if (suggestedStep && b.etapa === suggestedStep) scoreB += 1;
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (a.ordem || 0) - (b.ordem || 0);
      });
    }
    
    // Quick panel only shows top 5
    return result.slice(0, 5);
  }, [templates, search, suggestedCategory, suggestedStep, categorias]);

  const handleOpenLibrary = () => {
    setLibraryOpen(true);
  };

  const handleInsert = (template: ConversasTemplate) => {
    const rendered = renderTemplateText(template.conteudo, templateContext);
    onInsertToComposer(rendered);
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header: Sugestões de mensagens */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
          Sugestões de mensagens
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
            <p className="text-[11px] text-zinc-500">Nenhum modelo encontrado.</p>
            {!search && (
              <Button
                variant="link"
                onClick={() => seedDefaultTemplates()}
                disabled={isSeeding}
                className="text-[11px] text-[#C9A87C] h-auto p-0 mt-1"
              >
                {isSeeding ? 'Carregando...' : 'Carregar modelos sugeridos'}
              </Button>
            )}
          </div>
        ) : (
          filtered.map((template, idx) => {
            const isSuggested = suggestedCategory && (
              template.categoria_id === categorias.find(c => c.nome.toLowerCase() === suggestedCategory.toLowerCase())?.id ||
              template.categoria?.toLowerCase() === suggestedCategory.toLowerCase()
            );
            
            // Ícones aleatórios limpos baseados no ID ou index para a UI
            const icons = [
               { icon: <MessageCircle className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />, bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30" },
               { icon: <Briefcase className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />, bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30" },
               { icon: <Calendar className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />, bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30" },
               { icon: <Zap className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />, bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/30" }
            ];
            const visual = icons[idx % icons.length];

            return (
              <div
                key={template.id}
                className={cn(
                  "group flex items-center justify-between gap-2 p-1.5 rounded-xl border transition-all cursor-pointer bg-white dark:bg-[#1A1A1A]",
                  isSuggested
                    ? "border-[#D4AF37]/40 shadow-[0_2px_8px_rgba(212,175,55,0.08)] bg-gradient-to-r from-[#D4AF37]/[0.02] to-transparent"
                    : "border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-black/[0.1] dark:hover:border-white/[0.1]"
                )}
                onClick={() => handleInsert(template)}
              >
                <div className="flex items-center gap-3 min-w-0 pl-1">
                  <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 border", visual.bg)}>
                    {visual.icon}
                  </div>
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                      {template.nome}
                      {isSuggested && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#D4AF37]/20 text-[#B8925F] rounded-md">
                          Sugerido
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[180px]">
                      {template.conteudo}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center pr-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:text-[#C9A87C]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInsert(template);
                    }}
                  >
                    <Send className="h-3 w-3" />
                  </Button>
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
