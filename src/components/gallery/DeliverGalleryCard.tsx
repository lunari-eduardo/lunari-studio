import { Image, User, Clock, MoreHorizontal, Pencil, Share2, Trash2, RotateCcw, Film } from 'lucide-react';
import { Gallery } from '@/types/gallery';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getDisplayUrl } from '@/lib/photoUrl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DeliverGalleryCardProps {
  gallery: Gallery & { coverPhotoKey?: string | null; firstPhotoKey?: string | null; coverId?: string | null };
  totalPhotos: number;
  onClick?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onReactivate?: () => void;
}

function getDeliverStatus(gallery: Gallery): { label: string; variant: 'default' | 'destructive' | 'secondary' } {
  if ((gallery.status as string) === 'expired' || (gallery.status as string) === 'expirado' || (gallery.status as string) === 'expirada') {
    return { label: 'Expirada', variant: 'destructive' };
  }
  if (['sent', 'enviado', 'publicada', 'selection_started', 'selecao_iniciada'].includes(gallery.status)) {
    return { label: 'Publicada', variant: 'default' };
  }
  return { label: 'Rascunho', variant: 'secondary' };
}

// A thumbnail do card admin deve ser SEMPRE uma imagem estática.
// Se a chave apontar para um arquivo de vídeo (caso da capa Cinema),
// caímos para a primeira foto da grade.
const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|quicktime|ogg|ogv)$/i;
const isVideoKey = (key?: string | null): boolean => !!key && VIDEO_EXT_RE.test(key);

export function DeliverGalleryCard({ gallery, totalPhotos, onClick, onEdit, onShare, onDelete, onReactivate }: DeliverGalleryCardProps) {
  const isExpired = gallery.status === 'expired';
  const status = getDeliverStatus(gallery);

  const coverKey = (gallery as any).coverPhotoKey as string | null | undefined;
  const firstKey = (gallery as any).firstPhotoKey as string | null | undefined;
  const isCinemaCover = (gallery as any).coverId === 'cinema';

  // Prioriza a foto de capa, mas só se não for vídeo.
  // Para capa Cinema (vídeo exclusivo), usa sempre a primeira foto da grade.
  const thumbnailKey = !isVideoKey(coverKey) ? coverKey : null;
  const fallbackKey = thumbnailKey || firstKey || null;
  const thumbnailUrl = fallbackKey ? getDisplayUrl(fallbackKey) : null;

  return (
    <div
      className={cn(
        'lunari-card overflow-hidden cursor-pointer group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
        isExpired && 'ring-1 ring-destructive/40 opacity-75'
      )}
      onClick={onClick}
    >
      {/* Photo Preview */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* ⋯ Menu - top right on image */}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-7 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 max-md:opacity-100 hover:bg-background transition-all"
              >
                <MoreHorizontal className="h-4 w-4 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare?.(); }}>
                <Share2 className="h-3.5 w-3.5 mr-2" />
                Compartilhar
              </DropdownMenuItem>
              {onReactivate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReactivate(); }}>
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                    Reativar
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Cinema cover badge - top left */}
        {isCinemaCover && !isExpired && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-background/85 backdrop-blur-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
            <Film className="h-3 w-3" />
            Cinema
          </div>
        )}

        {/* Expired overlay */}
        {isExpired && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-destructive text-destructive-foreground rounded-full px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Expirada
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate leading-tight">
              {gallery.sessionName}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{gallery.clientName}</span>
            </div>
          </div>
          <Badge variant={status.variant} className="text-[11px] shrink-0">{status.label}</Badge>
        </div>

        <p className="text-xs text-muted-foreground">{totalPhotos} fotos</p>
      </div>
    </div>
  );
}
