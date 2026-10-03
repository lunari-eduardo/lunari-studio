import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, Tag, Loader2, Search } from 'lucide-react';
import { useConversasEtiquetas } from '@/hooks/useConversasEtiquetas';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { EnrichedChat } from '@/modules/conversas/types';

export interface LabelChatPopoverProps {
  chat: EnrichedChat;
  children: React.ReactNode;
  onLabelsUpdated?: (newLabels: string[]) => void;
}

export function LabelChatPopover({ chat, children, onLabelsUpdated }: LabelChatPopoverProps) {
  const { etiquetas, isLoading } = useConversasEtiquetas();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const selectedIds = new Set(chat.etiquetas || []);

  const filtered = etiquetas.filter(e => e.nome.toLowerCase().includes(search.toLowerCase()));

  const toggleEtiqueta = async (id: string) => {
    setIsSaving(true);
    try {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      
      const newArray = Array.from(newSelected);
      
      // Update in database
      const { error } = await supabase
        .from('conversas_chats' as any)
        .update({ etiquetas: newArray })
        .eq('id', chat.id);

      if (error) throw error;
      
      // Call optimistic callback if provided (or rely on realtime)
      if (onLabelsUpdated) {
        onLabelsUpdated(newArray);
      }
    } catch (error) {
      console.error('Error toggling label:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar as etiquetas', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-2 shadow-xl border-border/80 bg-popover/95 backdrop-blur-md rounded-xl">
        <div className="flex items-center px-2 py-1.5 mb-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-md">
          <Search className="h-3.5 w-3.5 text-muted-foreground mr-2" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar etiqueta..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            onClick={e => e.stopPropagation()}
          />
        </div>
        
        <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-0.5">
          {isLoading ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              {search ? 'Nenhuma etiqueta encontrada' : 'Nenhuma etiqueta criada'}
            </div>
          ) : (
            filtered.map(etiqueta => {
              const isSelected = selectedIds.has(etiqueta.id);
              return (
                <button
                  key={etiqueta.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleEtiqueta(etiqueta.id);
                  }}
                  disabled={isSaving}
                  className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shadow-sm"
                      style={{ backgroundColor: etiqueta.cor }}
                    />
                    <span className="truncate max-w-[140px] text-xs font-medium text-foreground">
                      {etiqueta.nome}
                    </span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
