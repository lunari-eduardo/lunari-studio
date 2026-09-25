import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import type { Chat, EnrichedChat } from '@/modules/conversas/types';

export interface FastLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | EnrichedChat;
  onLeadCreated: (leadId: string, clienteId?: string) => Promise<void>;
}

const ORIGENS_COMUNS = [
  'WhatsApp',
  'Instagram',
  'Google',
  'Indicação',
  'Site',
  'Outro',
];

export function FastLeadModal({ isOpen, onClose, chat, onLeadCreated }: FastLeadModalProps) {
  const { addLead, convertToClient } = useLeads();
  const { categorias } = useCategorias();
  const { statuses, getDefaultOpenKey } = useLeadStatuses();

  const [nome, setNome] = useState(chat.contato_nome || '');
  const [categoria, setCategoria] = useState<string>('');
  const [origem, setOrigem] = useState<string>('WhatsApp');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // 1. Monta as observações com a categoria, já que Leads não possui campo categoria nativo
      let observacoes = '';
      if (categoria) {
        const catNome = categorias.find(c => c.id === categoria)?.nome || categoria;
        observacoes = `Interesse: ${catNome}`;
      }

      // 2. Cria o lead (ainda solto)
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
      const cliente = await convertToClient(newLead.id);

      // 4. Retorna os IDs para o componente pai vincular à conversa
      await onLeadCreated(newLead.id, cliente?.id);
      
      toast.success('Oportunidade e Cliente criados com sucesso!');
      onClose();
    } catch (error) {
      console.error('[FastLeadModal] Erro ao criar lead:', error);
      toast.error('Erro ao processar a criação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Oportunidade</DialogTitle>
          <DialogDescription>
            Crie o lead e o cliente simultaneamente para iniciar a negociação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Contato</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Maria Silva"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Tipo de Sessão (Interesse)</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de ensaio..." />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nome}
                  </SelectItem>
                ))}
                {categorias.length === 0 && (
                  <SelectItem value="none" disabled>
                    Nenhuma categoria cadastrada
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem">Origem</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger>
                <SelectValue placeholder="Como o cliente chegou..." />
              </SelectTrigger>
              <SelectContent>
                {ORIGENS_COMUNS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Etapa Inicial</Label>
            <Input
              value={statusDef ? statusDef.name : statusInicial}
              disabled
              className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 capitalize"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!nome.trim() || isSubmitting}
              className="bg-[#C9A87C] hover:bg-[#b89567] text-white min-w-[120px]"
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
