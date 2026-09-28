import { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useConversasTemplates, renderTemplateText, type ConversasTemplate } from '@/hooks/useConversasTemplates';
import { useCategorias } from '@/hooks/useCategorias';
import { useUserProfile } from '@/hooks/useUserProfile';
import { TemplateEditor } from './TemplateEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Search, Plus, MessageCircle, Briefcase, Calendar, Zap, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chat, EnrichedChat } from '@/modules/conversas/types';

export interface LibraryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat?: Chat | EnrichedChat;
  suggestedCategory?: string;
  suggestedStep?: string;
  onInsertToComposer: (text: string) => void;
}

export function LibraryPanel({ open, onOpenChange, chat, suggestedCategory, suggestedStep, onInsertToComposer }: LibraryPanelProps) {
  const { profile } = useUserProfile();
  const { categorias = [] } = useCategorias();
  const { templates, isLoading, createTemplate, updateTemplate } = useConversasTemplates();

  const [search, setSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<ConversasTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const studioName = profile?.empresa?.trim() || profile?.nome?.trim() || 'Estúdio';
  const pixKey = (profile as any)?.pix_key || '';

  const templateContext = useMemo(
    () => ({
      contactName: chat?.contato_nome,
      studioName,
      pixKey,
    }),
    [chat?.contato_nome, studioName, pixKey],
  );

  const filtered = useMemo(() => {
    let result = templates;
    
    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        t => t.nome.toLowerCase().includes(q) || 
             t.conteudo.toLowerCase().includes(q) || 
             (t.categoria && t.categoria.toLowerCase().includes(q))
      );
    }
    
    // Auto order: if suggested category or step exists, bump those to top
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
    
    return result;
  }, [templates, search, suggestedCategory, suggestedStep, categorias]);

  const handleEdit = (template: ConversasTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleSaveEditor = async (data: Partial<ConversasTemplate>) => {
    if (editingTemplate) {
      await updateTemplate({ id: editingTemplate.id, ...data });
    } else {
      await createTemplate(data as any);
    }
    setIsEditorOpen(false);
  };

  const handleInsert = (template: ConversasTemplate) => {
    const rendered = renderTemplateText(template.conteudo, templateContext);
    onInsertToComposer(rendered);
    onOpenChange(false);
  };

  const getStepLabel = (step?: string | null) => {
    const steps: Record<string, string> = {
      'primeiro_contato': 'Primeiro Contato',
      'orcamento': 'Orçamento',
      'follow_up': 'Follow-up',
      'pre_ensaio': 'Pré-ensaio',
      'financeiro': 'Financeiro',
      'pos_venda': 'Pós-venda',
      'entrega': 'Entrega',
      'geral': 'Geral'
    };
    return step && steps[step] ? steps[step] : 'Geral';
  };

  const getCategoryName = (id?: string | null, fallback?: string | null) => {
    if (id) {
      const cat = categorias.find(c => c.id === id);
      if (cat) return cat.nome;
    }
    return fallback || 'Geral';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[620px] p-0 border-l border-border/50 bg-zinc-50/50 dark:bg-[#121212] flex flex-col hide-close-button">
        {isEditorOpen ? (
          <TemplateEditor 
            template={editingTemplate}
            onSave={handleSaveEditor}
            onCancel={() => setIsEditorOpen(false)}
          />
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex flex-col px-6 py-5 border-b border-border/50 bg-white dark:bg-[#1A1A1A] shrink-0 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#D4AF37]" />
                    Biblioteca de Modelos
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    {templates.length} modelo{templates.length !== 1 && 's'} cadastrados
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleNew} className="h-8 rounded-lg bg-[#C9A87C] hover:bg-[#b89567] text-white text-xs px-3 shadow-sm">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Novo Modelo
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar por título, conteúdo, categoria ou intenção..."
                  className="h-10 pl-9 bg-zinc-50 dark:bg-zinc-900/50 border-black/[0.06] dark:border-white/[0.08] rounded-xl text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm font-medium">Carregando biblioteca...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                    <MessageCircle className="h-6 w-6 text-zinc-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Nenhum modelo encontrado</h3>
                  <p className="text-xs text-zinc-500">
                    A sua biblioteca está vazia ou não há resultados para a sua busca.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filtered.map((template, idx) => {
                    const isSuggested = suggestedCategory && (
                      template.categoria_id === categorias.find(c => c.nome.toLowerCase() === suggestedCategory.toLowerCase())?.id ||
                      template.categoria?.toLowerCase() === suggestedCategory.toLowerCase()
                    );
                    
                    const icons = [
                      { icon: <MessageCircle className="h-4 w-4 text-blue-500" />, bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30" },
                      { icon: <Briefcase className="h-4 w-4 text-amber-500" />, bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30" },
                      { icon: <Calendar className="h-4 w-4 text-emerald-500" />, bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30" },
                      { icon: <Zap className="h-4 w-4 text-purple-500" />, bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/30" }
                    ];
                    const visual = icons[idx % icons.length];

                    return (
                      <div
                        key={template.id}
                        className={cn(
                          "group relative flex flex-col p-4 rounded-2xl border transition-all bg-white dark:bg-[#1A1A1A] shadow-sm hover:shadow-md cursor-pointer",
                          isSuggested && !search
                            ? "border-[#D4AF37]/40 shadow-[0_4px_16px_rgba(212,175,55,0.06)] bg-gradient-to-r from-[#D4AF37]/[0.02] to-transparent"
                            : "border-black/[0.04] dark:border-white/[0.06] hover:border-black/[0.1] dark:hover:border-white/[0.1]"
                        )}
                        onClick={() => handleInsert(template)}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border", visual.bg)}>
                              {visual.icon}
                            </div>
                            <div className="flex flex-col">
                              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {template.nome}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-medium px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full">
                                  {getCategoryName(template.categoria_id, template.categoria)}
                                </span>
                                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                                  &bull; {getStepLabel(template.etapa)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(template);
                              }}
                            >
                              Editar
                            </Button>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 pl-[52px] leading-relaxed">
                          {template.conteudo}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
