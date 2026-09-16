import { useState } from 'react';
import { Image, Upload, Download, Trash2, Star, ImageIcon, Loader2, Film, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhotoUploader, UploadedPhoto } from '@/components/PhotoUploader';
import { CoverVideoUploader } from '@/components/deliver/CoverVideoUploader';
import { GaleriaPhoto } from '@/hooks/useSupabaseGalleries';
import { THEME_REGISTRY } from '@/components/gallery/themes/registry';
import { getPhotoUrl } from '@/lib/photoUrl';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DeliverPhotosTabProps {
  galleryId: string;
  coverModel?: string | null;
  coverVideo?: any;
  setCoverVideo?: (v: any) => void;
  setCoverId?: (id: string | null) => void;
  onSave?: () => void;
  photos: GaleriaPhoto[];
  photosLoading: boolean;
  coverPhotoId: string | null;
  activeThemeId: string;
  showUploader: boolean;
  setShowUploader: (show: boolean) => void;
  storageLimitBytes: number;
  storageUsedBytes: number;
  onUploadComplete: (uploaded: UploadedPhoto[]) => void;
  onToggleHighlight: (photoId: string, currentWeight: number) => void;
  onSetCover: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
}

export function DeliverPhotosTab({
  galleryId,
  coverModel,
  coverVideo,
  setCoverVideo,
  setCoverId,
  onSave,
  photos,
  photosLoading,
  coverPhotoId,
  activeThemeId,
  showUploader,
  setShowUploader,
  storageLimitBytes,
  storageUsedBytes,
  onUploadComplete,
  onToggleHighlight,
  onSetCover,
  onDeletePhoto,
}: DeliverPhotosTabProps) {
  const themeSupportsFeatured = THEME_REGISTRY[activeThemeId]?.featured?.enabled !== false;
  const highlightedCount = photos.filter((p) => (p.pesoVisual ?? 0) > 0).length;
  const isCinemaCover = coverModel === 'cinema';

  const [showUploaderVideo, setShowUploaderVideo] = useState(false);

  const existingVideos = photos.filter(
    (p) => p.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(p.storageKey)
  );

  const cdnBase = import.meta.env.VITE_R2_PUBLIC_URL || 'https://media.lunarihub.com';
  const activeVideoKey = coverVideo?.desktopKey;
  const activeVideoUrl = activeVideoKey ? `${cdnBase}/${activeVideoKey}` : null;

  return (
    <div className="space-y-6 mt-6">
      {/* 🎬 SEÇÃO DA CAPA CINEMATOGRÁFICA (VÍDEO HERO) */}
      {isCinemaCover && (
        <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 via-background to-muted/20 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm sm:text-base">Vídeo da Capa Cinematográfica (Hero)</h4>
                  <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">Cinema</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reproduzido em tela cheia na entrada da galeria. <strong>Não é contabilizado nem listado</strong> na grade de fotos entregues.
                </p>
              </div>
            </div>

            {activeVideoKey && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploaderVideo(!showUploaderVideo)}
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {showUploaderVideo ? 'Cancelar alteração' : 'Trocar vídeo'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCoverVideo?.(null);
                    toast.info('Vídeo de capa removido. Clique em salvar para confirmar.');
                  }}
                  className="text-xs text-destructive hover:text-destructive gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </Button>
              </div>
            )}
          </div>

          {/* Vídeo Ativo ou Painel de Configuração */}
          {activeVideoUrl && !showUploaderVideo ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 rounded-lg bg-card border border-border/60">
              <div className="relative w-full sm:w-52 aspect-video rounded-lg overflow-hidden border bg-black shrink-0">
                <video src={activeVideoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Vídeo pronto para reprodução
                </div>
                <p>O vídeo roda sem áudio e em loop contínuo na recepção do visitante.</p>
                <p className="text-[11px] opacity-75">Configurações adicionais de escurecimento e texto estão na aba <strong>Design & Temas</strong>.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Sugestão / Atalho se já houver vídeo na galeria */}
              {existingVideos.length > 0 && !showUploaderVideo && (
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/10 border border-primary/30 flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <Film className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs text-foreground">
                      Identificamos o vídeo <strong>"{existingVideos[0].originalFilename}"</strong> enviado nesta galeria.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setCoverVideo?.({ ...coverVideo, desktopKey: existingVideos[0].storageKey });
                      toast.success('Vídeo vinculado como Capa Cinematográfica! Salve as alterações.');
                    }}
                    className="text-xs gap-1.5"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                    Usar este vídeo como Capa Cinematográfica
                  </Button>
                </div>
              )}

              {/* Uploader Dedicado */}
              <div className="p-3 bg-card rounded-lg border border-border/60">
                <CoverVideoUploader
                  galleryId={galleryId}
                  contextType="gallery-cover-video"
                  value={activeVideoKey ? { key: activeVideoKey, url: activeVideoUrl || undefined } : null}
                  onChange={(data) => {
                    if (data?.key) {
                      setCoverVideo?.({ ...coverVideo, desktopKey: data.key });
                      setShowUploaderVideo(false);
                      toast.success('Vídeo enviado com sucesso para a capa! Salve as alterações.');
                    }
                  }}
                  accept="video/mp4,video/webm,video/quicktime"
                  maxSizeMB={15}
                  label="Upload de Vídeo de Abertura (Hero)"
                  description="Vídeo horizontal (16:9), até 15MB. Ficará isolado da grade de fotos."
                />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-semibold text-lg">{photos.length} fotos entregues</h3>
          {coverPhotoId && (
            <span className="text-xs font-normal text-muted-foreground inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-[#cbb384] text-[#cbb384]" />
              Capa selecionada
            </span>
          )}
          {themeSupportsFeatured && highlightedCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-blue-400 text-blue-400" />
              {highlightedCount} destaque{highlightedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Button onClick={() => setShowUploader(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Adicionar fotos
        </Button>
      </div>

      {showUploader && (
        <div className="border rounded-lg p-4 bg-card">
          <PhotoUploader
            galleryId={galleryId}
            onUploadComplete={onUploadComplete}
            skipCredits={true}
            storageLimit={storageLimitBytes}
            storageUsed={storageUsedBytes}
          />
        </div>
      )}

      {photosLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo) => {
            const isCover = coverPhotoId === photo.id;
            const weight = photo.pesoVisual ?? 0;
            const showHighlight = themeSupportsFeatured && weight > 0;
            return (
              <div
                key={photo.id}
                className={cn(
                  'group relative aspect-square rounded-lg overflow-hidden bg-muted border-2 transition-all',
                  isCover && 'border-[#cbb384] ring-2 ring-[#cbb384]/30',
                  !isCover && showHighlight && 'border-blue-400 ring-1 ring-blue-400/30',
                  !isCover && !showHighlight && 'border-transparent'
                )}
              >
                {photo.mimeType?.startsWith('video/') ? (
                  <video
                    src={getPhotoUrl({ storageKey: photo.storageKey }, 'preview')}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={getPhotoUrl({ storageKey: photo.storageKey }, 'thumbnail')}
                    alt={photo.originalFilename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}

                {/* Badge CAPA */}
                {isCover && (
                  <div className="absolute top-1.5 left-1.5 bg-[#cbb384] text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 z-10 shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    CAPA
                  </div>
                )}

                {/* Badge DESTAQUE — só quando tema suporta */}
                {showHighlight && (
                  <div className="absolute top-1.5 right-1.5 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 z-10 shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    DESTAQUE
                  </div>
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100">
                  {themeSupportsFeatured && (
                    <Button
                      variant={weight > 0 ? 'default' : 'secondary'}
                      size="icon"
                      className={cn('h-8 w-8', weight > 0 && 'bg-blue-500 hover:bg-blue-600 text-white')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleHighlight(photo.id, weight);
                      }}
                      title={weight > 0 ? 'Remover destaque' : 'Destacar na grade'}
                      aria-label={weight > 0 ? 'Remover destaque' : 'Destacar na grade'}
                    >
                      <Star className={cn('h-4 w-4', weight > 0 && 'fill-current')} />
                    </Button>
                  )}
                  <Button
                    variant={isCover ? 'default' : 'secondary'}
                    size="icon"
                    className={cn('h-8 w-8', isCover && 'bg-[#cbb384] hover:bg-[#bfa574] text-white')}
                    onClick={() => {
                      const isVid = photo.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(photo.storageKey);
                      if (isVid) {
                        setCoverId?.('cinema');
                        setCoverVideo?.({ ...coverVideo, desktopKey: photo.storageKey });
                        onSetCover(photo.id);
                        toast.success('Vídeo definido como Capa Cinematográfica!');
                      } else {
                        onSetCover(photo.id);
                      }
                    }}
                    title={isCover ? 'Remover capa' : 'Definir como capa'}
                  >
                    <ImageIcon className={cn('h-4 w-4', isCover && 'fill-current')} />
                  </Button>
                  <a
                    href={getPhotoUrl({ storageKey: photo.storageKey }, 'original')}
                    download={photo.originalFilename}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDeletePhoto(photo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.originalFilename}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Image className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Nenhuma foto adicionada</h3>
          <p className="text-muted-foreground mb-4">Adicione as fotos finais para esta entrega.</p>
          <Button onClick={() => setShowUploader(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Adicionar fotos
          </Button>
        </div>
      )}
    </div>
  );
}
