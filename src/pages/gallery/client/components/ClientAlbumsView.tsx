import React from 'react';
import { Check } from 'lucide-react';
import { Gallery, GalleryPhoto } from '@/types/gallery';
import { getFontFamilyById } from '@/components/FontSelect';
import { cn } from '@/lib/utils';
import { CoverRenderer } from '@/components/deliver/covers/CoverRenderer';
import { resolveCoverId } from '@/components/deliver/covers/registry';
import { SELECTION_COVER_REGISTRY, DEFAULT_SELECTION_COVER_ID } from '@/components/gallery/covers/registry';
import { getDemoCoverPhoto } from '@/lib/demoCoverPhoto';

interface ClientAlbumsViewProps {
  gallery: Gallery;
  galleryFolders: Array<{ id: string; nome: string; ordem: number; cover_photo_id?: string | null }>;
  localPhotos: GalleryPhoto[];
  studioLogoUrl?: string | null;
  studioName?: string | null;
  /** Capa padrão de Seleção do estúdio (Personalização). Seleção não tem capa por galeria. */
  selectionCoverId?: string | null;
  themeStyles: React.CSSProperties;
  effectiveBackgroundMode: 'light' | 'dark';
  onSelectFolder: (folderId: string) => void;
}

export function ClientAlbumsView({
  gallery,
  galleryFolders,
  localPhotos,
  studioLogoUrl,
  studioName,
  selectionCoverId,
  themeStyles,
  effectiveBackgroundMode,
  onSelectFolder,
}: ClientAlbumsViewProps) {
  const effectiveCoverId = resolveCoverId(selectionCoverId, SELECTION_COVER_REGISTRY, DEFAULT_SELECTION_COVER_ID);
  const firstPhoto = localPhotos[0];
  const demoPhoto = getDemoCoverPhoto('horizontal');
  const coverPhoto = firstPhoto
    ? {
        storageKey: firstPhoto.previewUrl,
        previewPath: firstPhoto.previewUrl,
        width: firstPhoto.width,
        height: firstPhoto.height,
      }
    : demoPhoto;

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-background text-foreground",
        effectiveBackgroundMode === 'dark' && 'dark'
      )}
      style={themeStyles}
    >
      <CoverRenderer
        registry={SELECTION_COVER_REGISTRY}
        coverId={effectiveCoverId}
        coverPhoto={coverPhoto}
        sessionName={gallery.sessionName}
        studioName={studioName || undefined}
        studioLogoUrl={studioLogoUrl}
        sessionFont={getFontFamilyById(gallery.settings.sessionFont)}
        titleCaseMode={gallery.settings.titleCaseMode}
        onEnter={() => {}}
      />
      <main className="flex-1 flex flex-col items-center px-5 py-6">
        <p className="text-muted-foreground text-sm mb-10">{localPhotos.length} fotos</p>

        <div className={cn(
          "grid gap-5 w-full",
          galleryFolders.length === 1 
            ? "max-w-md mx-auto" 
            : galleryFolders.length === 2 
              ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto"
        )}>
          {galleryFolders.map((folder) => {
            const folderPhotos = localPhotos.filter(p => p.folderId === folder.id);
            const coverPhoto = folder.cover_photo_id ? localPhotos.find(p => p.id === folder.cover_photo_id) : null;
            const thumb = coverPhoto || folderPhotos[0];
            const coverUrl = thumb ? ((thumb as any).coverUrl || (thumb as any).previewUrl || thumb.thumbnailUrl) : null;
            const folderSelectedCount = folderPhotos.filter(p => p.isSelected).length;
            
            return (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className="group relative aspect-[4/5] overflow-hidden cursor-pointer rounded-sm ring-1 ring-white/10 hover:ring-primary/50 transition-all duration-500"
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={folder.nome}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                  />
                ) : (
                  <div className="absolute inset-0 bg-zinc-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-left transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                  <p 
                    className="text-white font-light text-2xl tracking-tight mb-1"
                    style={{ fontFamily: getFontFamilyById(gallery.settings.sessionFont) }}
                  >
                    {folder.nome}
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">
                      {folderPhotos.length} fotos
                    </p>
                    {folderSelectedCount > 0 && (
                      <span className="flex items-center gap-1 text-primary text-[10px] uppercase tracking-[0.2em] font-bold">
                        <Check className="h-2.5 w-2.5" />
                        {folderSelectedCount} selecionadas
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
