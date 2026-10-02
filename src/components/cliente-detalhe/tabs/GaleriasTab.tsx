import { useState, useMemo } from 'react';
import { ClienteSupabase } from '@/types/cliente-supabase';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Loader2,
  MousePointerClick,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseGalleries, Galeria } from '@/hooks/useSupabaseGalleries';
import { useSettings } from '@/hooks/useSettings';
import { getGalleryUrl } from '@/lib/galleryUrl';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SendGalleryModal } from '@/components/SendGalleryModal';
import { ReactivateGalleryDialog } from '@/components/ReactivateGalleryDialog';
import { ReactivateSuccessModal } from '@/components/ReactivateSuccessModal';

import { useClienteGalerias } from './galerias/useClienteGalerias';
import { GaleriasKpiCards } from './galerias/GaleriasKpiCards';
import { GaleriaListItem } from './galerias/GaleriaListItem';
import { DeleteGalleryDialog } from './galerias/DeleteGalleryDialog';
import { EmptyGalleriesState } from './galerias/EmptyGalleriesState';
import { GaleriaItem } from './galerias/types';

interface GaleriasTabProps {
  cliente: ClienteSupabase;
}

export function GaleriasTab({ cliente }: GaleriasTabProps) {
  const { profile } = useUserProfile();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { deleteGallery, sendGallery, reopenSelection } = useSupabaseGalleries() as any;

  const {
    galeriasRaw,
    items,
    resumo,
    isLoading,
    fetchGalerias,
  } = useClienteGalerias(cliente.id);

  // Modais de ação
  const [shareGalleryId, setShareGalleryId] = useState<string | null>(null);
  const [deleteGalleryId, setDeleteGalleryId] = useState<string | null>(null);
  const [reactivateGalleryId, setReactivateGalleryId] = useState<string | null>(null);
  const [reactivateSuccessOpen, setReactivateSuccessOpen] = useState(false);
  const [reactivateSuccessGallery, setReactivateSuccessGallery] = useState<Galeria | null>(null);
  const [reactivateDays, setReactivateDays] = useState(7);
  const [isDeleting, setIsDeleting] = useState(false);

  const shareGaleria = useMemo(() => {
    return galeriasRaw.find(g => g.id === shareGalleryId) || null;
  }, [galeriasRaw, shareGalleryId]);

  const deleteTarget = items.find(g => g.id === deleteGalleryId);

  const handleDeleteConfirm = async () => {
    if (!deleteGalleryId) return;
    setIsDeleting(true);
    try {
      await deleteGallery(deleteGalleryId);
      setDeleteGalleryId(null);
      await fetchGalerias();
      toast.success('Galeria excluída com sucesso');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir galeria');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyPublicLink = (e: React.MouseEvent, publicToken: string | null) => {
    e.stopPropagation();
    if (!publicToken) {
      toast.error('Galeria não possui link público ativo');
      return;
    }
    const url = getGalleryUrl(publicToken, 'select', { namespace: profile?.public_namespace, customDomain: profile?.custom_domain });
    navigator.clipboard.writeText(url);
    setCopiedToken(publicToken);
    toast.success('Link da galeria copiado!');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleOpenGallery = (item: GaleriaItem) => {
    if (item.raw.status === 'archived') {
      toast.info('Esta galeria foi excluída permanentemente após 180 dias e não pode mais ser acessada.');
      return;
    }
    const route = item.tipo === 'entrega'
      ? `/app/gallery/transfer/${item.id}`
      : `/app/gallery/select/${item.id}`;
    navigate(route);
  };

  const handleEdit = (item: GaleriaItem) => {
    navigate(item.tipo === 'entrega' ? `/app/gallery/transfer/${item.id}/edit` : `/app/gallery/select/${item.id}/edit`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-accent-gold" />
        Carregando galerias do cliente...
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyGalleriesState clienteId={cliente.id} />;
  }

  return (
    <div className="space-y-4 mt-4">
      {/* 1. MINI KPIS DISCRETOS */}
      <GaleriasKpiCards resumo={resumo} />

      {/* 2. LISTAGEM PRINCIPAL LIMPA E REFINADA */}
      <div className="rounded-xl border border-border/20 bg-card/60 overflow-hidden">
        {/* Header da lista */}
        <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Galerias ({items.length})
          </h4>

          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Nova Galeria
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2 rounded-xl shadow-lg border border-border/60" align="end" sideOffset={8}>
              <div className="space-y-1">
                <button
                  onClick={() => navigate('/app/gallery/new/select', { state: { preselectClient: cliente.id } })}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted/60 transition-colors text-left"
                >
                  <MousePointerClick className="h-3.5 w-3.5 text-accent-gold shrink-0" />
                  <span>Galeria de Seleção</span>
                </button>
                <button
                  onClick={() => navigate('/app/gallery/new/transfer', { state: { preselectClient: cliente.id } })}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted/60 transition-colors text-left"
                >
                  <Send className="h-3.5 w-3.5 text-accent-gold shrink-0" />
                  <span>Galeria de Transfer</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Linhas da lista */}
        <div className="divide-y divide-border/15">
          {items.map(item => (
            <GaleriaListItem
              key={item.id}
              item={item}
              copiedToken={copiedToken}
              onCopyLink={handleCopyPublicLink}
              onOpenGallery={handleOpenGallery}
              onEdit={handleEdit}
              onShare={(it) => setShareGalleryId(it.id)}
              onReactivate={(it) => setReactivateGalleryId(it.id)}
              onDelete={(it) => setDeleteGalleryId(it.id)}
            />
          ))}
        </div>
      </div>

      {/* MODAIS DE APOIO */}
      {shareGaleria && (
        <SendGalleryModal
          isOpen={!!shareGalleryId}
          onOpenChange={(open) => {
            if (!open) {
              setShareGalleryId(null);
              fetchGalerias();
            }
          }}
          gallery={shareGaleria}
          settings={settings}
          onSendGallery={async () => {
            await sendGallery(shareGaleria.id);
            await fetchGalerias();
          }}
        />
      )}

      {reactivateGalleryId && (() => {
        const galeria = galeriasRaw.find(g => g.id === reactivateGalleryId);
        const isTransfer = galeria?.tipo === 'entrega';
        return (
          <ReactivateGalleryDialog
            galleryName={galeria?.nomeSessao || 'Esta galeria'}
            onReactivate={async (days) => {
              if (isTransfer) {
                const prazo = new Date();
                prazo.setDate(prazo.getDate() + days);
                await supabase.from('galerias').update({
                  status: 'enviado',
                  prazo_selecao: prazo.toISOString(),
                  updated_at: new Date().toISOString(),
                }).eq('id', reactivateGalleryId);
              } else {
                await reopenSelection({ id: reactivateGalleryId, days });
              }
              await fetchGalerias();
            }}
            open={true}
            onOpenChange={(open) => { if (!open) setReactivateGalleryId(null); }}
            onSuccess={(days) => {
              setReactivateDays(days);
              setReactivateSuccessGallery(galeria || null);
              setReactivateSuccessOpen(true);
            }}
          />
        );
      })()}

      {reactivateSuccessGallery && settings && (
        <ReactivateSuccessModal
          isOpen={reactivateSuccessOpen}
          onOpenChange={(open) => {
            setReactivateSuccessOpen(open);
            if (!open) setReactivateSuccessGallery(null);
          }}
          gallery={reactivateSuccessGallery}
          settings={settings}
          clientLink={reactivateSuccessGallery.publicToken ? getGalleryUrl(reactivateSuccessGallery.publicToken, 'select', { namespace: profile?.public_namespace, customDomain: profile?.custom_domain }) : null}
          newDeadline={(() => {
            const d = new Date();
            d.setDate(d.getDate() + reactivateDays);
            return d;
          })()}
          daysGranted={reactivateDays}
        />
      )}

      <DeleteGalleryDialog
        open={!!deleteGalleryId}
        galleryName={deleteTarget?.sessionName}
        isDeleting={isDeleting}
        onOpenChange={(open) => !open && setDeleteGalleryId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
