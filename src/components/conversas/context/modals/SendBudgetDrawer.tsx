import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getPublicShareBaseUrl } from '@/utils/domainUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaterials } from '@/hooks/useMaterials';
import { useSendMaterialShare } from '@/hooks/useMaterialShares';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, FileText, CheckCircle2, Copy, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SendBudgetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  clienteId?: string;
  onInsertToComposer?: (text: string) => void;
  mode?: 'chat' | 'leads';
}

export function SendBudgetDrawer({ isOpen, onClose, leadId, leadName, leadPhone, clienteId, onInsertToComposer, mode = 'chat' }: SendBudgetDrawerProps) {
  const { profile } = useUserProfile();
  const { materials, isLoading } = useMaterials();
  const { createShare } = useSendMaterialShare();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [materialToConfirm, setMaterialToConfirm] = useState<string | null>(null);
  const [generatedShareToken, setGeneratedShareToken] = useState<string | null>(null);

  const activeMaterials = materials.filter(m => m.status === 'active');
  
  const uniqueCategories = Array.from(new Set(
    activeMaterials.map(m => m.categoria?.nome).filter(Boolean)
  )) as string[];

  const filteredMaterials = activeMaterials.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || m.categoria?.nome === selectedCategory;
    return matchSearch && matchCategory;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmSend = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!materialToConfirm) return;
    setIsSubmitting(true);
    try {
      const result = await createShare.mutateAsync({
        materialId: materialToConfirm,
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
      
      const baseUrl = getPublicShareBaseUrl({
        namespace: profile?.public_namespace,
        customDomain: profile?.custom_domain
      });
      const link = `${baseUrl}/p/${result.token}`;
      
      if (mode === 'chat' && onInsertToComposer) {
        onInsertToComposer(link);
        setMaterialToConfirm(null);
        onClose();
      } else {
        setGeneratedShareToken(result.token);
        setMaterialToConfirm(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar link de orçamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setGeneratedShareToken(null);
      setMaterialToConfirm(null);
      setSearchTerm('');
    }, 300);
  };

  const getShareLink = () => {
    const baseUrl = getPublicShareBaseUrl({
      namespace: profile?.public_namespace,
      customDomain: profile?.custom_domain
    });
    return `${baseUrl}/p/${generatedShareToken}`;
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Enviar Orçamento</SheetTitle>
          </SheetHeader>
          
          {generatedShareToken ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200/50 dark:border-green-800/30">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-green-800 dark:text-green-300 text-lg">Orçamento gerado!</h3>
              <p className="text-sm text-green-700 dark:text-green-400/80 mb-6 mt-1">
                Copie o link abaixo ou envie diretamente via WhatsApp.
              </p>
              
              <div className="flex w-full flex-col gap-3">
                <div className="flex w-full items-center gap-2">
                  <Input 
                    readOnly 
                    value={getShareLink()} 
                    className="bg-white dark:bg-black border-green-200 dark:border-green-800/50 text-sm h-11 focus-visible:ring-0"
                  />
                  <Button 
                    variant="secondary"
                    className="shrink-0 h-11 bg-white dark:bg-zinc-800 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50 border"
                    onClick={() => {
                      navigator.clipboard.writeText(getShareLink());
                      toast.success('Link copiado!');
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                {leadPhone && (
                  <Button 
                    className="w-full h-11 bg-[#25D366] hover:bg-[#1DA851] text-white shadow-none"
                    onClick={() => {
                      const phone = leadPhone.replace(/\D/g, '');
                      const firstName = leadName ? leadName.split(' ')[0] : '';
                      const msg = encodeURIComponent(`Olá ${firstName}, preparei uma proposta exclusiva para você! Acesse o link: ${getShareLink()}`);
                      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar pelo WhatsApp
                  </Button>
                )}
                <Button variant="ghost" className="w-full mt-2" onClick={resetAndClose}>
                  Concluir
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar propostas..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 rounded-xl"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-10 rounded-xl">
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

              <ScrollArea className="h-[calc(100vh-170px)] mt-4 pr-4">
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">Nenhuma proposta encontrada.</div>
                ) : (
                  <div 
                    className="space-y-3" 
                    style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
                  >
                    {filteredMaterials.map(mat => (
                      <div 
                        key={mat.id} 
                        className="p-3 border border-border/50 rounded-xl hover:border-[#D4AF37]/40 transition-colors flex items-center gap-3 cursor-pointer bg-transparent hover:bg-zinc-50/50 dark:hover:bg-[#D4AF37]/5" 
                        onClick={() => setMaterialToConfirm(mat.id)}
                      >
                        <div className="h-16 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative border border-border/30">
                          <FileText className="h-5 w-5 text-muted-foreground/40 absolute" />
                          {mat.cover_image_url && (
                            <img 
                              src={mat.cover_image_url} 
                              alt="Capa" 
                              className="h-full w-full object-cover relative z-10"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">{mat.title}</h4>
                          {mat.categoria?.nome && (
                            <span className="text-[10px] text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full mt-1.5 inline-block">
                              {mat.categoria.nome}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!materialToConfirm} onOpenChange={(open) => !open && !isSubmitting && setMaterialToConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar link de orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja gerar um link exclusivo desta proposta para o cliente {leadName ? leadName.split(' ')[0] : 'selecionado'}?
              {mode === 'chat' && ' O link será inserido na conversa.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend} disabled={isSubmitting} className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                mode === 'chat' ? 'Inserir' : 'Gerar Link'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
