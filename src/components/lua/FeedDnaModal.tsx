import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mensagem } from '@/modules/conversas/types';
import { useAuth } from '@/contexts/AuthContext';

interface FeedDnaModalProps {
  chatId: string;
  messages: Mensagem[];
  isOpen: boolean;
  onClose: () => void;
}

export function FeedDnaModal({ chatId, messages, isOpen, onClose }: FeedDnaModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { session } = useAuth();
  const userId = session?.user?.id;

  const handleFeed = async () => {
    if (!userId) return;
    setIsProcessing(true);

    try {
      const texts = messages.filter(m => m.type === 'text' || m.type === 'template').length;
      const media = messages.filter(m => m.type === 'image' || m.type === 'audio' || m.type === 'document' || m.type === 'video').length;

      const snapshotData = {
        messages_count: messages.length,
        texts_count: texts,
        media_count: media,
        date_exported: new Date().toISOString(),
        messages: messages.map(m => ({
          id: m.id,
          direction: m.direction,
          type: m.type,
          content: m.content,
          timestamp: m.timestamp,
          media_url: m.media_url || null,
        }))
      };

      // Create a deterministic hash based on messages count, first msg and last msg
      const hash = `hash-${chatId}-${messages.length}-${messages[0]?.id}-${messages[messages.length - 1]?.id}`;
      
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() + 90);

      const { data, error } = await supabase.from('lua_dna_sources').insert({
        user_id: userId,
        chat_id: chatId,
        source_hash: hash,
        snapshot: snapshotData,
        status: 'pending',
        retention_until: retentionDate.toISOString(),
      }).select().single();

      if (error) {
        if (error.code === '23505') { // unique violation if any
           toast.info('Esta conversa já foi adicionada ao DNA recentemente.');
        } else {
           throw error;
        }
      } else {
        // Trigger edge worker
        if (data) {
          const workerUrl = import.meta.env.VITE_EDGE_API_URL;
          fetch(`${workerUrl}/api/lua/process-dna`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              type: 'INSERT',
              record: data
            })
          }).catch(console.error);
        }

        toast.success('Conversa adicionada à fila de processamento do DNA.', {
          description: 'A Lua processará o histórico em segundo plano.'
        });
      }
      
      onClose();
    } catch (err: any) {
      toast.error('Erro ao alimentar DNA: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const textsCount = messages.filter(m => m.type === 'text' || m.type === 'template').length;
  const mediaCount = messages.filter(m => m.type === 'image' || m.type === 'audio' || m.type === 'document' || m.type === 'video').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <BrainCircuit className="h-5 w-5" />
            Alimentar DNA da Lua
          </DialogTitle>
          <DialogDescription>
            A Lua analisará esta conversa para aprender seu estilo de atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Mensagens de texto:</span>
              <span className="font-medium">{textsCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Áudios, imagens e arquivos:</span>
              <span className="font-medium">{mediaCount}</span>
            </div>
            <div className="pt-2 mt-2 border-t flex justify-between items-center text-sm font-semibold">
              <span>Total a processar:</span>
              <span>{messages.length}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Este histórico ficará salvo por 90 dias exclusivamente para processamento de linguagem e auditoria de versão.
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={handleFeed}
            disabled={isProcessing || messages.length === 0}
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adicionando...</>
            ) : (
              'Alimentar DNA'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
