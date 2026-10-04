import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Tag, Loader2, Search } from 'lucide-react';
import { useConversasEtiquetas } from '@/hooks/useConversasEtiquetas';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { EnrichedChat } from '@/modules/conversas/types';

export interface AssignLabelsModalProps {
  chat: EnrichedChat | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLabelsUpdated?: (newLabels: string[]) => void;
}

export function AssignLabelsModal({ chat, open, onOpenChange, onLabelsUpdated }: AssignLabelsModalProps) {
  const { etiquetas, isLoading } = useConversasEtiquetas();
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && chat) {
      setSelectedIds(new Set(chat.etiquetas || []));
      setSearch('');
    }
  }, [open, chat]);

  const filtered = etiquetas.filter(e => e.nome.toLowerCase().includes(search.toLowerCase()));

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSave = async () => {
    if (!chat) return;
    setIsSaving(true);
    try {
      const newArray = Array.from(selectedIds);
      const { error } = await supabase
        .from('conversas_chats' as any)
        .update({ etiquetas: newArray })
        .eq('id', chat.id);

      if (error) throw error;
      if (onLabelsUpdated) onLabelsUpdated(newArray);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao salvar etiquetas do chat:', err);
      toast({ title: 'Erro', description: 'Não foi possível salvar as etiquetas.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!chat) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] gap-0 p-0">
        <DialogHeader className="px-5 py-4 border-b border-border/40">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            Etiquetar conversa
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar etiqueta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                Nenhuma etiqueta encontrada.
              </div>
            ) : (
              filtered.map(etiqueta => {
                const isSelected = selectedIds.has(etiqueta.id);
                return (
                  <button
                    key={etiqueta.id}
                    onClick={() => handleToggle(etiqueta.id)}
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: etiqueta.cor }} />
                      <span className="truncate">{etiqueta.nome}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/40 flex justify-end gap-2 bg-muted/20">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
