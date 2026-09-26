import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLeads } from '@/hooks/useLeads';
import { useCategorias } from '@/hooks/useCategorias';
import { useLeadStatuses } from '@/hooks/useLeadStatuses';
import { toast } from 'sonner';
import { Loader2, Sparkles, Briefcase, Phone } from 'lucide-react';
import type { Chat, EnrichedChat } from '@/modules/conversas/types';

export interface FastLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | EnrichedChat;
  onLeadCreated: (leadId: string, clienteId?: string) => Promise<void>;
  defaultCategory?: string;
}

const ORIGENS_COMUNS = [
  'WhatsApp',
  'Instagram',
  'Google',
  'Indicação',
  'Site',
  'Outro',
];

export function FastLeadModal({ isOpen, onClose, chat, onLeadCreated, defaultCategory }: FastLeadModalProps) {
  const { addLead, convertToClient } = useLeads();
  const { categorias } = useCategorias();
  const { statuses, getDefaultOpenKey } = useLeadStatuses();

  const [nome, setNome] = useState(chat.contato_nome || '');
  const [categoria, setCategoria] = useState<string>('');
  const [origem, setOrigem] = useState<string>('WhatsApp');
  const [valorEstimado, setValorEstimado] = useState<string>('');
  const [detalhes, setDetalhes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincroniza campos e categoria quando o modal abre ou os dados mudam
  useEffect(() => {
    if (isOpen) {
      setNome(chat.contato_nome || '');
      setValorEstimado('');
      setOrigem('WhatsApp');
      setDetalhes('');

      if (defaultCategory && categorias.length > 0) {
        const target = defaultCategory.toLowerCase().trim();
        // 1. Tenta correspondência exata
        let matched = categorias.find(c => c.nome.toLowerCase().trim() === target);
        // 2. Tenta correspondência parcial (ex: "Ensaio Gestante" contendo "Gestante")
        if (!matched) {
          matched = categorias.find(c => {
            const catName = c.nome.toLowerCase().trim();
            return catName.includes(target) || target.includes(catName);
          });
        }
        if (matched) {
          setCategoria(matched.id);
          // Pre-fill detalhes com a sugestão
          setDetalhes(`Detectado interesse inicial via IA para o ensaio: ${matched.nome}.`);
        } else {
          setCategoria('');
        }
      } else {
        setCategoria('');
      }
    }
  }, [isOpen, chat.contato_nome, defaultCategory, categorias]);

  // Status inicial padrão é o primeiro da fila (ex: "novo_interessado")
  const statusInicial = getDefaultOpenKey() || 'novo_interessado';
  const statusDef = statuses.find(s => s.key === statusInicial);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('O nome do lead é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Monta as observações com categoria, valor estimado e detalhes
      const obsParts: string[] = [];
      if (categoria) {
        const catNome = categorias.find(c => c.id === categoria)?.nome || categoria;
        obsParts.push(`Interesse: ${catNome}`);
      }
      if (valorEstimado.trim()) {
        obsParts.push(`Valor Estimado: R$ ${valorEstimado.trim()}`);
      }
      if (detalhes.trim()) {
        obsParts.push(`Detalhes: ${detalhes.trim()}`);
      }
      const observacoes = obsParts.join(' | ');

      // 2. Cria o lead no CRM
      const newLead = await addLead({
        nome: nome.trim(),
        telefone: chat.contato_phone_normalized || '',
        whatsapp: chat.contato_phone_normalized || '',
        origem,
        status: statusInicial,
        observacoes,
        email: '',
        interacoes: [],
      });

      if (!newLead) {
        throw new Error('Falha ao criar o lead.');
      }

      // 3. Converte para Cliente (cria no CRM e vincula ao Lead)
      const cliente = await convertToClient(newLead.id, newLead);

      // 4. Retorna os IDs para vincular à conversa
      await onLeadCreated(newLead.id, cliente?.id);
      
      toast.success('Oportunidade criada com sucesso!');
      onClose();
    } catch (error) {
      console.error('[FastLeadModal] Erro ao criar lead:', error);
      toast.error('Erro ao processar a criação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const detectedCategoryName = defaultCategory
    ? (categorias.find(c => c.id === categoria)?.nome || defaultCategory)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
        {/* Cabeçalho Refinado */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                Criar Oportunidade
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Cria o lead e cliente no CRM vinculados a esta conversa
              </DialogDescription>
            </div>
          </div>

          {/* Banner inteligente quando a Lua identificou a sessão */}
          {detectedCategoryName && (
            <div className="mt-3.5 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                A <strong>Lua</strong> identificou interesse em <strong>{detectedCategoryName}</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="nome" className="text-xs font-medium text-foreground/90">
                Nome do Contato
              </Label>
              {chat.contato_phone_normalized && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {chat.contato_phone_normalized}
                </span>
              )}
            </div>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Luísa Mendes"
              className="h-9 rounded-xl text-sm"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="categoria" className="text-xs font-medium text-foreground/90">
                Tipo de Sessão
              </Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Selecione a categoria..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                      {cat.nome}
                    </SelectItem>
                  ))}
                  {categorias.length === 0 && (
                    <SelectItem value="none" disabled className="text-xs">
                      Nenhuma categoria cadastrada
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="origem" className="text-xs font-medium text-foreground/90">
                Origem
              </Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Origem..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ORIGENS_COMUNS.map((o) => (
                    <SelectItem key={o} value={o} className="text-xs">
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="valor" className="text-xs font-medium text-foreground/90">
                  Valor Estimado
                </Label>
                <span className="text-[10px] text-muted-foreground">Opcional</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                  R$
                </span>
                <Input
                  id="valor"
                  type="text"
                  value={valorEstimado}
                  onChange={(e) => setValorEstimado(e.target.value)}
                  placeholder="0,00"
                  className="h-9 pl-9 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            {/* Etapa Inicial Estilizada como Cartão de Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/90">
                Etapa do Funil
              </Label>
              <div className="h-9 flex items-center justify-between px-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: statusDef?.color || '#D4AF37' }}
                  />
                  <span className="font-medium text-foreground truncate">
                    {statusDef?.name || 'Novo Interessado'}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">Entrada</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <Label htmlFor="detalhes" className="text-xs font-medium text-foreground/90 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#D4AF37]" /> Detalhes da Conversa
            </Label>
            <textarea
              id="detalhes"
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              placeholder="Ex: Cliente tem disponibilidade na quinta-feira, quer pacote completo..."
              className="w-full flex min-h-[60px] rounded-xl border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Rodapé de Ações */}
          <DialogFooter className="pt-3 border-t border-border/40 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!nome.trim() || isSubmitting}
              className="bg-[#C9A87C] hover:bg-[#b89567] text-white font-medium rounded-xl h-9 px-4 text-xs shadow-sm transition-all min-w-[130px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Salvar e Vincular'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
