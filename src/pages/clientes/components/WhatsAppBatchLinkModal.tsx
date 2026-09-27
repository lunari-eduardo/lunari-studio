import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowRight, CheckCircle2, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContatoDesvinculado {
  id: string;
  nome: string | null;
  phone_normalized: string;
  avatar_url: string | null;
}

interface ClienteMatch {
  id: string;
  nome: string;
  telefone: string;
  whatsapp: string | null;
  avatar_url: string | null;
}

interface MatchSugestao {
  contato: ContatoDesvinculado;
  cliente: ClienteMatch;
}

export function WhatsAppBatchLinkModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sugestoes, setSugestoes] = useState<MatchSugestao[]>([]);

  const carregarSugestoes = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      // 1. Buscar contatos não vinculados
      const { data: contatos } = await supabase
        .from('conversas_contatos')
        .select('id, nome, phone_normalized, avatar_url')
        .eq('user_id', userId)
        .is('cliente_id', null)
        .is('lead_id', null);

      if (!contatos || contatos.length === 0) {
        setSugestoes([]);
        return;
      }

      // 2. Buscar clientes (que podem ou não já ter whatsapp vinculado, mas queremos achar match de número)
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, telefone, whatsapp, avatar_url')
        .eq('user_id', userId);
        
      const clientes = clientesData as any[];

      if (!clientes) {
        setSugestoes([]);
        return;
      }

      // 3. Cruzar dados
      const matches: MatchSugestao[] = [];
      for (const contato of contatos) {
        if (!contato.phone_normalized) continue;
        const phoneNorm = contato.phone_normalized;
        const last8 = phoneNorm.slice(-8); // Apenas os últimos 8 digitos para match flexível
        
        const match = clientes.find(c => {
          const t = c.telefone?.replace(/\D/g, '') || '';
          const w = c.whatsapp?.replace(/\D/g, '') || '';
          return t.endsWith(last8) || w.endsWith(last8);
        });

        if (match) {
          matches.push({ contato, cliente: match });
        }
      }

      setSugestoes(matches);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar sugestões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      carregarSugestoes();
    } else {
      setSugestoes([]);
    }
  }, [open]);

  const handleVincularTodos = async () => {
    if (sugestoes.length === 0) return;
    setProcessing(true);
    try {
      for (const { contato, cliente } of sugestoes) {
        // 1. Atualizar conversas_contatos
        await supabase
          .from('conversas_contatos')
          .update({ 
            cliente_id: cliente.id, 
            tipo: 'cliente',
            updated_at: new Date().toISOString()
          })
          .eq('id', contato.id);

        // 2. Atualizar conversas_chats
        await supabase
          .from('conversas_chats')
          .update({ 
            cliente_id: cliente.id, 
            updated_at: new Date().toISOString() 
          })
          .eq('contato_id', contato.id);

        // 3. Sincronizar Avatar no Cliente + preencher whatsapp se nulo
        const clienteUpdates: any = {};
        let needsUpdate = false;
        
        if (contato.avatar_url && !cliente.avatar_url) {
          clienteUpdates.avatar_url = contato.avatar_url;
          needsUpdate = true;
        }
        if (!cliente.whatsapp && contato.phone_normalized) {
          clienteUpdates.whatsapp = contato.phone_normalized;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await supabase
            .from('clientes')
            .update(clienteUpdates)
            .eq('id', cliente.id);
        }
      }
      
      toast.success(`${sugestoes.length} contato(s) vinculado(s) com sucesso!`);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar vinculação em lote');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-[#1A1A1A] border border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <LinkIcon className="h-5 w-5 text-accent-gold" />
            Vincular Contatos do WhatsApp
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Encontramos conversas de WhatsApp correspondentes a clientes do CRM pelo número de telefone.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent-gold mb-3" />
            <p className="text-sm text-muted-foreground">Procurando contatos correspondentes...</p>
          </div>
        ) : sugestoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">Tudo certo!</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Não encontramos nenhum contato não-vinculado que corresponda a um cliente existente.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {sugestoes.length} sugestões encontradas
              </span>
              <Button variant="ghost" size="sm" onClick={carregarSugestoes} disabled={processing} className="h-7 px-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
              </Button>
            </div>
            <ScrollArea className="max-h-[350px] border border-border/20 rounded-md">
              <div className="divide-y divide-border/20">
                {sugestoes.map(({ contato, cliente }) => (
                  <div key={contato.id} className="flex items-center justify-between p-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    {/* Contato Source */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 border border-border/30">
                        {contato.avatar_url ? <AvatarImage src={contato.avatar_url} /> : <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-xs">WP</AvatarFallback>}
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{contato.nome || contato.phone_normalized}</p>
                        <p className="text-xs text-muted-foreground truncate">{contato.phone_normalized}</p>
                      </div>
                    </div>
                    
                    <div className="px-4 shrink-0">
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>

                    {/* Cliente Target */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 justify-end text-right">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{cliente.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{cliente.telefone}</p>
                      </div>
                      <Avatar className="h-10 w-10 border border-border/30 bg-accent-gold/10">
                        {cliente.avatar_url ? <AvatarImage src={cliente.avatar_url} /> : <AvatarFallback className="text-accent-gold text-xs">{cliente.nome[0]}</AvatarFallback>}
                      </Avatar>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end pt-4 mt-2 border-t border-border/20">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing} className="mr-2">
                Cancelar
              </Button>
              <Button onClick={handleVincularTodos} disabled={processing} className="gap-2">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                Vincular {sugestoes.length} Contatos
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
