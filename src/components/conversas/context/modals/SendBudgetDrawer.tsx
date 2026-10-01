import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaterials } from '@/hooks/useMaterials';
import { useSendMaterialShare } from '@/hooks/useMaterialShares';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SendBudgetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string;
  clienteId?: string;
  onInsertToComposer: (text: string) => void;
}

export function SendBudgetDrawer({ isOpen, onClose, leadId, clienteId, onInsertToComposer }: SendBudgetDrawerProps) {
  const { materials, isLoading } = useMaterials();
  const { createShare } = useSendMaterialShare();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const activeMaterials = materials.filter(m => m.status === 'active');
  
  const uniqueCategories = Array.from(new Set(
    activeMaterials.map(m => m.categoria?.nome).filter(Boolean)
  )) as string[];

  const filteredMaterials = activeMaterials.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || m.categoria?.nome === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleSend = async (materialId: string) => {
    try {
      const result = await createShare.mutateAsync({
        materialId,
        lead_id: leadId,
        cliente_id: clienteId,
      });

      if (leadId) {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const now = new Date().toISOString();
          
          const { data: leadData } = await supabase
            .from('leads')
            .select('historico_status')
            .eq('id', leadId)
            .single();

          const currentHistory = Array.isArray(leadData?.historico_status) ? leadData.historico_status : [];
          const newHistory = [...currentHistory, { status: 'orcamento_enviado', data: now }];

          await supabase
            .from('leads')
            .update({
              status: 'orcamento_enviado',
              status_timestamp: now,
              historico_status: newHistory
            })
            .eq('id', leadId);
        } catch (e) {
          console.error("Erro ao forçar avanço do lead", e);
        }
      }
      
      const link = `${window.location.origin}/proposal/${result.token}`;
      onInsertToComposer(`Segue o orçamento solicitado:\n${link}`);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Enviar Orçamento</SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar propostas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {uniqueCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">Nenhuma proposta encontrada.</div>
          ) : (
            <div className="space-y-3">
              {filteredMaterials.map(mat => (
                <div 
                  key={mat.id} 
                  className="p-3 border rounded-xl hover:border-primary/50 transition-colors flex items-center gap-3 cursor-pointer bg-card" 
                  onClick={() => handleSend(mat.id)}
                >
                  <div className="h-10 w-10 bg-muted rounded flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-foreground">{mat.title}</h4>
                    {mat.categoria?.nome && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                        {mat.categoria.nome}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
