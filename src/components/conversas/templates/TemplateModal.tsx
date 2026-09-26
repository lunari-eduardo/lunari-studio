import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import type { ConversasTemplate } from '@/hooks/useConversasTemplates';

export interface TemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateToEdit?: ConversasTemplate | null;
  onSave: (data: { nome: string; conteudo: string; categoria?: string }) => Promise<void>;
  isLoading?: boolean;
}

const AVAILABLE_VARIABLES = [
  { tag: '{nome}', label: 'Primeiro Nome', desc: 'Nome do cliente' },
  { tag: '{saudacao}', label: 'Saudação', desc: 'Bom dia/Boa tarde/Boa noite' },
  { tag: '{estudio}', label: 'Estúdio/Empresa', desc: 'Nome do seu estúdio' },
  { tag: '{pix}', label: 'Chave Pix', desc: 'Sua chave cadastrada' },
  { tag: '{nome_completo}', label: 'Nome Completo', desc: 'Nome completo' },
];

import { useCategorias } from '@/hooks/useCategorias';

export function TemplateModal({
  open,
  onOpenChange,
  templateToEdit,
  onSave,
  isLoading = false,
}: TemplateModalProps) {
  const [nome, setNome] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [categoria, setCategoria] = useState('');
  const { categorias = [] } = useCategorias();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (templateToEdit) {
      setNome(templateToEdit.nome);
      setConteudo(templateToEdit.conteudo);
      setCategoria(templateToEdit.categoria || '');
    } else {
      setNome('');
      setConteudo('');
      setCategoria('');
    }
  }, [templateToEdit, open]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !conteudo.trim() || isLoading) return;
    await onSave({ 
      nome: nome.trim(), 
      conteudo: conteudo.trim(),
      categoria: categoria || undefined
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-[#1A1A1A] border-black/[0.08] dark:border-white/[0.08] p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#C9A87C]" />
            {templateToEdit ? 'Editar Modelo de Mensagem' : 'Novo Modelo de Mensagem'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
              Título do Modelo *
            </label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Chave Pix, Orientações de Ensaio, Boas-vindas"
              className="text-xs h-9 bg-zinc-50 dark:bg-zinc-900 border-black/[0.06] dark:border-white/[0.08]"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
              Categoria / Contexto <span className="text-zinc-400 font-normal">(Opcional)</span>
            </label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="w-full text-xs h-9 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] px-3 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
            >
              <option value="">Geral / Sem Categoria</option>
              <option value="Financeiro">Financeiro / Pagamentos</option>
              <option value="Pré-Ensaio">Pré-Ensaio / Recomendações</option>
              <option value="Pós-Venda">Pós-Venda / Entregas</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.nome}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Conteúdo da Mensagem *
              </label>
              <span className="text-[10px] text-zinc-400">Variáveis dinâmicas abaixo</span>
            </div>

            <Textarea
              ref={textareaRef}
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
              placeholder="Digite o texto da mensagem. Use as tags dinâmicas abaixo para personalizar com os dados do cliente..."
              rows={6}
              className="resize-none text-xs bg-zinc-50 dark:bg-zinc-900 border-black/[0.06] dark:border-white/[0.08] leading-relaxed"
              required
            />

            {/* Pílulas de tags dinâmicas clicáveis */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 font-medium mr-1">Inserir:</span>
              {AVAILABLE_VARIABLES.map(v => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => handleInsertTag(v.tag)}
                  title={v.desc}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#C9A87C]/10 hover:bg-[#C9A87C]/20 text-[#A58253] dark:text-[#E2C366] border border-[#C9A87C]/30 transition-colors active:scale-95"
                >
                  +{v.tag}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 border-black/[0.08] dark:border-white/[0.08]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!nome.trim() || !conteudo.trim() || isLoading}
              className="text-xs h-8 bg-[#C9A87C] hover:bg-[#b89567] text-white"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : templateToEdit ? (
                'Salvar Alterações'
              ) : (
                'Criar Modelo'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
