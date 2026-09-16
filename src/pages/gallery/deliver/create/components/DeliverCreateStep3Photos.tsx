import { useState } from 'react';
import { Film, CheckCircle2, RefreshCw, Trash2, Star } from 'lucide-react';
import { FolderManager } from '@/components/FolderManager';
import { PhotoUploader, UploadedPhoto } from '@/components/PhotoUploader';
import { DeliverPhotoManager } from '@/components/deliver/DeliverPhotoManager';
import { CoverVideoUploader } from '@/components/deliver/CoverVideoUploader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DeliverCreateStep3PhotosProps {
  supabaseGalleryId: string | null;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  storageLimitBytes: number;
  storageUsedBytes: number;
  onUploadComplete: (photos: UploadedPhoto[]) => void;
  setIsUploading: (uploading: boolean) => void;
  photoRefreshKey: number;
  coverPhotoId: string | null;
  onCoverChange: (photoId: string | null) => void;
  onPhotosChange: (count: number) => void;
  coverModel?: string | null;
  coverVideo?: any;
  setCoverVideo?: (v: any) => void;
}

export function DeliverCreateStep3Photos({
  supabaseGalleryId,
  activeFolderId,
  setActiveFolderId,
  storageLimitBytes,
  storageUsedBytes,
  onUploadComplete,
  setIsUploading,
  photoRefreshKey,
  coverPhotoId,
  onCoverChange,
  onPhotosChange,
  coverModel,
  coverVideo,
  setCoverVideo,
}: DeliverCreateStep3PhotosProps) {
  const isCinemaCover = coverModel === 'cinema';
  const [showUploaderVideo, setShowUploaderVideo] = useState(false);
  const cdnBase = import.meta.env.VITE_R2_PUBLIC_URL || 'https://media.lunarihub.com';
  const activeVideoKey = coverVideo?.desktopKey;
  const activeVideoUrl = activeVideoKey ? `${cdnBase}/${activeVideoKey}` : null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="border-b border-border/40 pb-4">
        <h2 className="text-lg font-semibold text-foreground">Fotos da Entrega</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Envie as fotos em alta resolução. O cliente poderá fazer o download com qualidade máxima.
        </p>
      </div>

      {supabaseGalleryId && isCinemaCover && (
        <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 via-background to-muted/20 p-4 sm:p-5 shadow-sm space-y-4 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Film className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm sm:text-base">Vídeo da Capa Cinematográfica</h4>
                  <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">Cinema</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reproduzido em tela cheia na entrada da galeria.
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
                  }}
                  className="text-xs text-destructive hover:text-destructive gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </Button>
              </div>
            )}
          </div>

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
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-card rounded-lg border border-border/60">
                <CoverVideoUploader
                  galleryId={supabaseGalleryId}
                  contextType="gallery-cover-video"
                  value={activeVideoKey ? { key: activeVideoKey, url: activeVideoUrl || undefined } : null}
                  onChange={(data) => {
                    if (data?.key) {
                      setCoverVideo?.({ ...coverVideo, desktopKey: data.key });
                      setShowUploaderVideo(false);
                      toast.success('Vídeo enviado com sucesso para a capa!');
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

      {/* Folder Manager */}
      {supabaseGalleryId && (
        <FolderManager
          galleryId={supabaseGalleryId}
          activeFolderId={activeFolderId}
          onActiveFolderChange={setActiveFolderId}
        />
      )}

      {supabaseGalleryId && (
        <>
          <PhotoUploader
            galleryId={supabaseGalleryId}
            folderId={activeFolderId}
            maxLongEdge={2560}
            allowDownload={true}
            skipCredits={true}
            storageLimit={storageLimitBytes}
            storageUsed={storageUsedBytes}
            onUploadComplete={onUploadComplete}
            onUploadingChange={setIsUploading}
          />
          <DeliverPhotoManager
            galleryId={supabaseGalleryId}
            refreshKey={photoRefreshKey}
            coverPhotoId={coverPhotoId}
            onCoverChange={onCoverChange}
            onPhotosChange={onPhotosChange}
          />
        </>
      )}
    </div>
  );
}
