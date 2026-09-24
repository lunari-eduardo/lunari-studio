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
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useConversasTemplates,
  renderTemplateText,
  type ConversasTemplate,
} from '@/hooks/useConversasTemplates';
import { TemplateModal } from './TemplateModal';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { Chat, EnrichedChat } from '@/modules/conversas/types';

export interface TemplatesListTabProps {
  chat: Chat | EnrichedChat;
  onInsertToComposer: (text: string) => void;
  onSendDirectly: (text: string) => Promise<void> | void;
}

export function TemplatesListTab({
  chat,
  onInsertToComposer,
  onSendDirectly,
}: TemplatesListTabProps) {
  const { profile } = useUserProfile();
  const {
    templates,
    isLoading,
    createTemplate,
    isCreating,
    updateTemplate,
    isUpdating,
    deleteTemplate,
    seedDefaultTemplates,
    isSeeding,
  } = useConversasTemplates();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ConversasTemplate | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

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
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      t => t.nome.toLowerCase().includes(q) || t.conteudo.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const handleEdit = (template: ConversasTemplate) => {
    setEditingTemplate(template);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const handleSaveModal = async (data: { nome: string; conteudo: string }) => {
    if (editingTemplate) {
      await updateTemplate({ id: editingTemplate.id, ...data });
    } else {
      await createTemplate(data);
    }
  };

  const handleSend = async (template: ConversasTemplate) => {
    const rendered = renderTemplateText(template.conteudo, templateContext);
    try {
      setSendingId(template.id);
      await onSendDirectly(rendered);
    } finally {
      setSendingId(null);
    }
  };

  const handleInsert = (template: ConversasTemplate) => {
    const rendered = renderTemplateText(template.conteudo, templateContext);
    onInsertToComposer(rendered);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ─── Top Toolbar: Busca e Botão + Novo ──────────────────────────── */}
      <div className="p-3 border-b border-black/[0.05] dark:border-white/[0.06] space-y-2 bg-white dark:bg-[#181818]">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar modelos..."
              className="pl-8 text-xs h-8 bg-zinc-50 dark:bg-zinc-900 border-black/[0.06] dark:border-white/[0.08]"
            />
          </div>
          <Button
            size="sm"
            onClick={handleNew}
            className="h-8 px-2.5 bg-[#C9A87C] hover:bg-[#b89567] text-white text-xs shrink-0"
            title="Criar novo modelo"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* ─── Lista de Templates ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin mb-2" />
            <span className="text-xs">Carregando modelos...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <FileText className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {search ? 'Nenhum modelo encontrado' : 'Nenhum modelo cadastrado'}
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 mb-4">
              {search
                ? 'Tente buscar por outro termo ou limpe o filtro.'
                : 'Crie respostas prontas para Pix, agendamentos e instruções recorrentes.'}
            </p>
            {!search && (
              <div className="space-y-2 max-w-[240px] mx-auto">
                <Button
                  size="sm"
                  onClick={handleNew}
                  className="w-full text-xs h-8 bg-[#C9A87C] hover:bg-[#b89567] text-white"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Criar Primeiro Modelo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => seedDefaultTemplates()}
                  disabled={isSeeding}
                  className="w-full text-[11px] h-7 border-dashed hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  {isSeeding ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1 text-[#C9A87C]" />
                  )}
                  Carregar Modelos Sugeridos
                </Button>
              </div>
            )}
          </div>
        ) : (
          filtered.map(template => {
            const preview = renderTemplateText(template.conteudo, templateContext);
            const isSending = sendingId === template.id;

            return (
              <div
                key={template.id}
                className="group rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-black/[0.12] dark:hover:border-white/[0.15] transition-all"
              >
                {/* Header do Card */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {template.nome}
                  </h4>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => handleEdit(template)} className="text-xs">
                          <Pencil className="h-3 w-3 mr-1.5 text-zinc-500" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Excluir o modelo "${template.nome}"?`)) {
                              deleteTemplate(template.id);
                            }
                          }}
                          className="text-xs text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-3 w-3 mr-1.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Prévia do Conteúdo Renderizado */}
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans bg-zinc-50/70 dark:bg-zinc-900/50 p-2 rounded-lg border border-black/[0.03] dark:border-white/[0.04] mb-2.5">
                  {preview}
                </p>

                {/* Ações do Card */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInsert(template)}
                    className="flex-1 text-[11px] h-7 border-black/[0.08] dark:border-white/[0.08] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    title="Inserir texto no campo de digitação para editar antes de enviar"
                  >
                    <CornerDownLeft className="h-3 w-3 mr-1 text-zinc-400" /> Inserir no campo
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSend(template)}
                    disabled={isSending}
                    className="text-[11px] h-7 px-3 bg-[#C9A87C] hover:bg-[#b89567] text-white shrink-0 shadow-sm"
                    title="Enviar agora para a conversa com um clique"
                  >
                    {isSending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <TemplateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        templateToEdit={editingTemplate}
        onSave={handleSaveModal}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
}
