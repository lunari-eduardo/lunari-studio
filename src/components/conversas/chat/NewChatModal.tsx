import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeBrPhone } from '@/lib/phone';

export interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string | null;
  onChatCreated: (chatId: string) => void;
}

export function NewChatModal({ open, onOpenChange, instanceId, onChatCreated }: NewChatModalProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Telefone é obrigatório');
      return;
    }
    if (!instanceId) {
      toast.error('Nenhuma instância conectada');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Normaliza telefone para o formato canônico brasileiro (55DDDXXXXXXXX)
      const normalizedPhone = normalizeBrPhone(phone);
      if (!normalizedPhone) {
        throw new Error('Telefone inválido. Digite o DDD e o número (ex: 11999999999)');
      }

      // 1. Tenta achar ou criar contato
      let contatoId = '';
      const { data: existingContato } = await supabase
        .from('conversas_contatos')
        .select('id')
        .eq('phone_normalized', normalizedPhone)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingContato) {
        contatoId = existingContato.id;
      } else {
        const { data: newContato, error: contatoError } = await supabase
          .from('conversas_contatos')
          .insert({
            user_id: userId,
            phone_normalized: normalizedPhone,
            phone_raw: phone,
            nome: name || null,
            tipo: 'unknown'
          })
          .select('id')
          .single();
        if (contatoError) throw contatoError;
        contatoId = newContato.id;
      }

      // 2. Tenta achar ou criar chat
      const { data: existingChat } = await supabase
        .from('conversas_chats')
        .select('id')
        .eq('contato_id', contatoId)
        .eq('instance_id', instanceId)
        .maybeSingle();

      if (existingChat) {
        onChatCreated(existingChat.id);
        onOpenChange(false);
        return;
      }

      const { data: newChat, error: chatError } = await supabase
        .from('conversas_chats')
        .insert({
          user_id: userId,
          contato_id: contatoId,
          instance_id: instanceId,
          contato_phone_normalized: normalizedPhone,
          contato_nome: name || null,
          status: 'active',
          unread_count: 0,
          pin: 'unpinned',
          mute: false
        })
        .select('id')
        .single();
      
      if (chatError) throw chatError;

      onChatCreated(newChat.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conversa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
            <DialogDescription>
              Inicie uma conversa no WhatsApp digitando o número do contato.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone (com DDD)</Label>
              <Input
                id="phone"
                placeholder="Ex: 11999999999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nome (Opcional)</Label>
              <Input
                id="name"
                placeholder="Ex: João Silva"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              Iniciar conversa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
