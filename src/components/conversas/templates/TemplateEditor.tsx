import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCategorias } from '@/hooks/useCategorias';
import { renderTemplateText, type ConversasTemplate, type TemplateStep } from '@/hooks/useConversasTemplates';
import { MessageBubble } from '../chat/MessageBubble';
import type { Mensagem } from '@/modules/conversas/types';
import { Sparkles, ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

export interface TemplateEditorProps {
  template?: ConversasTemplate | null;
  onSave: (data: Partial<ConversasTemplate>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const TEMPLATE_STEPS: { value: TemplateStep; label: string }[] = [
  { value: 'primeiro_contato', label: 'Primeiro Contato' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'pre_ensaio', label: 'Pré-ensaio' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'pos_venda', label: 'Pós-venda' },
  { value: 'entrega', label: 'Entrega' },
  { value: 'geral', label: 'Geral' },
];

const AVAILABLE_VARIABLES = [
  { tag: '{nome}', label: 'Primeiro Nome' },
  { tag: '{nome_completo}', label: 'Nome Completo' },
  { tag: '{saudacao}', label: 'Saudação' },
  { tag: '{estudio}', label: 'Estúdio' },
  { tag: '{pix}', label: 'Chave Pix' },
];

export function TemplateEditor({ template, onSave, onCancel, isLoading }: TemplateEditorProps) {
  const { categorias = [] } = useCategorias();
  
  const [nome, setNome] = useState(template?.nome || '');
  const [conteudo, setConteudo] = useState(template?.conteudo || '');
  const [categoriaId, setCategoriaId] = useState<string>(template?.categoria_id || 'none');
  const [etapa, setEtapa] = useState<TemplateStep>(template?.etapa || 'geral');
  const [ordem, setOrdem] = useState<number>(template?.ordem || 0);
  const [ativo, setAtivo] = useState<boolean>(template?.ativo ?? true);
  
  const tagsStr = Array.isArray(template?.palavras_chave) ? template.palavras_chave.join(', ') : '';
  const [tagsInput, setTagsInput] = useState(tagsStr);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      setConteudo(prev => prev + tag);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const newText = text.substring(0, start) + tag + text.substring(end);
    setConteudo(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!nome.trim() || !conteudo.trim()) return;

    const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    await onSave({
      nome: nome.trim(),
      conteudo: conteudo.trim(),
      categoria_id: categoriaId === 'none' ? null : categoriaId,
      etapa,
      ordem,
      ativo,
      palavras_chave: tagsArray as Json,
    });
  };

  const previewMessage = useMemo(() => ({
    id: 'preview',
    chat_id: 'preview',
    direction: 'outbound',
    status: 'sent',
    content: renderTemplateText(conteudo || 'Digite algo para pré-visualizar', {
      contactName: 'Mariana Silva',
      studioName: 'Lunari Studio',
      pixKey: 'pix@lunaristudio.com'
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as Mensagem), [conteudo]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-zinc-50/30 dark:bg-black/20">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0 bg-white dark:bg-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 -ml-2 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
            {template ? 'Editar Modelo' : 'Novo Modelo'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="h-8 rounded-lg text-xs">
            Cancelar
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={!nome.trim() || !conteudo.trim() || isLoading}
            className="h-8 rounded-lg bg-[#C9A87C] hover:bg-[#b89567] text-white text-xs"
          >
            {isLoading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col md:flex-row gap-6 p-6">
          {/* Editor Area */}
          <div className="flex-1 flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Título do modelo</Label>
                <Input 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  placeholder="Ex: Orçamento Gestante Base"
                  className="bg-white dark:bg-[#121212] border-black/[0.08] dark:border-white/[0.08] rounded-xl h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Categoria</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger className="bg-white dark:bg-[#121212] border-black/[0.08] dark:border-white/[0.08] rounded-xl h-9 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geral (Todas)</SelectItem>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Etapa comercial</Label>
                <Select value={etapa} onValueChange={(v) => setEtapa(v as TemplateStep)}>
                  <SelectTrigger className="bg-white dark:bg-[#121212] border-black/[0.08] dark:border-white/[0.08] rounded-xl h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_STEPS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tags / Palavras-chave</Label>
                <Input 
                  value={tagsInput} 
                  onChange={e => setTagsInput(e.target.value)} 
                  placeholder="ex: valores, link, pacote"
                  className="bg-white dark:bg-[#121212] border-black/[0.08] dark:border-white/[0.08] rounded-xl h-9 text-xs"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Prioridade</Label>
                <Input 
                  type="number"
                  value={ordem} 
                  onChange={e => setOrdem(Number(e.target.value))} 
                  placeholder="0"
                  className="bg-white dark:bg-[#121212] border-black/[0.08] dark:border-white/[0.08] rounded-xl h-9 text-xs w-24"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Mensagem</Label>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[60%] scrollbar-hide">
                  {AVAILABLE_VARIABLES.map(v => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertTag(v.tag)}
                      className="shrink-0 px-2 py-1 text-[10px] font-medium bg-[#D4AF37]/10 text-[#B8925F] hover:bg-[#D4AF37]/20 rounded transition-colors whitespace-nowrap"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                ref={textareaRef}
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                placeholder="Escreva sua mensagem aqui..."
                className="min-h-[240px] resize-y bg-white dark:bg-[#121212] border-black/[0.08] dark:border-white/[0.08] rounded-xl text-sm leading-relaxed p-4"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch checked={ativo} onCheckedChange={setAtivo} id="ativo-switch" />
              <Label htmlFor="ativo-switch" className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                Modelo ativo (visível para uso)
              </Label>
            </div>
          </div>

          {/* Preview Area */}
          <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-3">
            <Label className="text-xs font-semibold text-zinc-500">Pré-visualização</Label>
            <div className="bg-[#E5DDD5] dark:bg-[#0B141A] rounded-2xl p-4 min-h-[300px] shadow-inner relative overflow-hidden flex flex-col">
              {/* Fake WhatsApp Background pattern */}
              <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/rS-A8O3aR_Y.png')] bg-repeat" />
              
              <div className="relative z-10 flex flex-col items-end gap-1">
                <MessageBubble 
                  mensagem={previewMessage}
                  isFirstInGroup={true}
                  isLastInGroup={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
