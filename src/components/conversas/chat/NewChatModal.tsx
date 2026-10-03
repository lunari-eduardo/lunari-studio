import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeBrPhone } from '@/lib/phone';
import { formatPhone } from '../shared/format';
import { ContactAvatar } from '../shared/ContactAvatar';
import { useConversasContatos } from '@/hooks/useConversasContatos';
import type { Contato } from '@/modules/conversas/types';
import {
  Search,
  UserPlus,
  ArrowLeft,
  Loader2,
  UserCheck,
  Users,
  MessageSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string | null;
  onChatCreated: (chatId: string) => void;
}

export function NewChatModal({
  open,
  onOpenChange,
  instanceId,
  onChatCreated,
}: NewChatModalProps) {
  const { contatos, isLoading: loadingContatos } = useConversasContatos();
  const [searchTerm, setSearchTerm] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Filtrar contatos da agenda pelo termo digitado
  const filteredContacts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return contatos;
    const parts = term.split(/\s+/).filter(Boolean);

    return contatos.filter(c => {
      const target = `${c.nome ?? ''} ${c.phone_normalized ?? ''} ${c.phone_raw ?? ''}`.toLowerCase();
      return parts.every(p => target.includes(p));
    });
  }, [contatos, searchTerm]);

  // Se o termo digitado parece com um número de telefone
  const isSearchPhoneLike = useMemo(() => {
    const digitsOnly = searchTerm.replace(/\D/g, '');
    return digitsOnly.length >= 8;
  }, [searchTerm]);

  const handleStartChatWithExistingContact = async (contato: Contato) => {
    if (!instanceId) {
      toast.error('Nenhuma instância do WhatsApp conectada');
      return;
    }

    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // 1. Checa se o chat já existe para esse contato
      const { data: existingChat } = await supabase
        .from('conversas_chats')
        .select('id')
        .eq('contato_id', contato.id)
        .eq('instance_id', instanceId)
        .maybeSingle();

      if (existingChat) {
        onChatCreated(existingChat.id);
        onOpenChange(false);
        setSearchTerm('');
        return;
      }

      // 2. Cria nova conversa
      const { data: newChat, error: chatError } = await supabase
        .from('conversas_chats')
        .insert({
          user_id: userId,
          contato_id: contato.id,
          instance_id: instanceId,
          contato_phone_normalized: contato.phone_normalized,
          contato_nome: contato.nome || null,
          status: 'active',
          unread_count: 0,
          pin: 'unpinned',
          mute: false,
        })
        .select('id')
        .single();

      if (chatError) throw chatError;

      onChatCreated(newChat.id);
      onOpenChange(false);
      setSearchTerm('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar conversa');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

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
            tipo: 'unknown',
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
        resetState();
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
          mute: false,
        })
        .select('id')
        .single();

      if (chatError) throw chatError;

      onChatCreated(newChat.id);
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conversa');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSearchTerm('');
    setPhone('');
    setName('');
    setShowManualForm(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        onOpenChange(isOpen);
        if (!isOpen) resetState();
      }}
    >
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            {showManualForm && (
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="p-1 -ml-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Voltar para a lista de contatos"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <DialogTitle className="text-base font-semibold">
                {showManualForm ? 'Nova conversa com número avulso' : 'Nova conversa'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {showManualForm
                  ? 'Digite o telefone com DDD para iniciar uma conversa.'
                  : 'Selecione um contato da agenda ou digite um novo número.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {showManualForm ? (
          <form onSubmit={handleManualSubmit} className="p-5 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-xs font-medium">
                Telefone (com DDD) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="Ex: 11999999999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={loading}
                autoFocus
                className="h-10 text-sm rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name" className="text-xs font-medium">
                Nome (Opcional)
              </Label>
              <Input
                id="name"
                placeholder="Ex: João Silva"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={loading}
                className="h-10 text-sm rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowManualForm(false)}
                disabled={loading}
                className="rounded-xl h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl h-9 text-xs bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Iniciando...
                  </>
                ) : (
                  'Iniciar conversa'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col h-[460px]">
            {/* Campo de Busca rápida */}
            <div className="p-3 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar contato ou digitar telefone..."
                  className="pl-9 pr-8 h-9 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border-border/60 focus:border-border transition-all"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Ação para digitar número avulso */}
            <div className="px-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (isSearchPhoneLike) {
                    setPhone(searchTerm);
                  }
                  setShowManualForm(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors text-left group"
              >
                <div className="h-9 w-9 rounded-full bg-[#D4AF37]/10 text-[#A87E43] dark:text-[#D4AF37] flex items-center justify-center shrink-0 group-hover:bg-[#D4AF37]/20 transition-colors">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {isSearchPhoneLike
                      ? `Conversar com o número "${searchTerm}"`
                      : 'Conversar com um número não salvo'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Digite DDD e número diretamente
                  </div>
                </div>
              </button>
            </div>

            {/* Lista de Contatos da Agenda */}
            <div className="px-4 pt-3 pb-1 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <span>Contatos da Agenda ({filteredContacts.length})</span>
              {loadingContatos && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>

            <ScrollArea className="flex-1 px-2 pb-2">
              {loadingContatos && contatos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <span className="text-xs">Carregando agenda...</span>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs font-medium">Nenhum contato encontrado</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-1">
                    {searchTerm
                      ? 'Tente outro nome ou clique em "Conversar com um número não salvo"'
                      : 'Nenhum contato sincronizado com o WhatsApp'}
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredContacts.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={loading}
                      onClick={() => handleStartChatWithExistingContact(c)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors text-left disabled:opacity-50"
                    >
                      <ContactAvatar name={c.nome} src={c.avatar_url} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {c.nome || formatPhone(c.phone_normalized)}
                          </span>
                          {c.tipo === 'cliente' && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-[#D4AF37]/15 text-[#A87E43] dark:text-[#D4AF37] font-medium shrink-0">
                              <UserCheck className="h-2.5 w-2.5" />
                              Cliente
                            </span>
                          )}
                          {c.tipo === 'lead' && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">
                              <Users className="h-2.5 w-2.5" />
                              Lead
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {formatPhone(c.phone_normalized)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
