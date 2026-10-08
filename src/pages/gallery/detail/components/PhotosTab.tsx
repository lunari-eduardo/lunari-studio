import React, { useMemo } from 'react';
import { Check, Heart, Image } from 'lucide-react';
import { MasonryGrid, MasonryItem } from '@/components/MasonryGrid';
import { PhotoCard } from '@/components/PhotoCard';
import { GalleryPhoto } from '@/types/gallery';
import { cn } from '@/lib/utils';

interface PhotosTabProps {
  transformedPhotos: GalleryPhoto[];
  selectedPhotos: GalleryPhoto[];
  favoritePhotos: GalleryPhoto[];
  galleryFolders: Array<{ id: string; nome: string }>;
  activePhotoFilter: string;
  setActivePhotoFilter: (filter: string) => void;
  photoSpacing?: number;
  allowComments?: boolean;
  onViewFullscreen: (index: number) => void;
}

export function PhotosTab({
  transformedPhotos,
  selectedPhotos,
  favoritePhotos,
  galleryFolders,
  activePhotoFilter,
  setActivePhotoFilter,
  photoSpacing = 6,
  allowComments = true,
  onViewFullscreen,
}: PhotosTabProps) {
  const currentPhotosList = useMemo(() => {
    if (activePhotoFilter === 'selected') {
      return transformedPhotos.filter(p => p.isSelected);
    }
    if (activePhotoFilter === 'favorites') {
      return transformedPhotos.filter(p => p.isSelected && p.isFavorite);
    }
    if (activePhotoFilter.startsWith('folder:')) {
      const folderId = activePhotoFilter.replace('folder:', '');
      return transformedPhotos.filter(p => p.folderId === folderId);
    }
    return transformedPhotos;
  }, [transformedPhotos, activePhotoFilter]);

  return (
    <div className="space-y-4">
      {/* Filter pills: Todas, Selecionadas, Favoritas e Pastas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActivePhotoFilter('all')}
          className={cn(
            'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border',
            activePhotoFilter === 'all'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          Todas ({transformedPhotos.length})
        </button>

        <button
          onClick={() => setActivePhotoFilter('selected')}
          className={cn(
            'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border inline-flex items-center gap-1.5',
            activePhotoFilter === 'selected'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Check className="h-3.5 w-3.5" />
          Selecionadas ({selectedPhotos.length})
        </button>

        {favoritePhotos.length > 0 && (
          <button
            onClick={() => setActivePhotoFilter('favorites')}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border inline-flex items-center gap-1.5',
              activePhotoFilter === 'favorites'
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Heart className="h-3.5 w-3.5 text-red-500 fill-current" />
            Favoritas ({favoritePhotos.length})
          </button>
        )}

        {galleryFolders.map((folder) => {
          const count = transformedPhotos.filter(p => p.folderId === folder.id).length;
          const isFolderActive = activePhotoFilter === `folder:${folder.id}`;
          return (
            <button
              key={folder.id}
              onClick={() => setActivePhotoFilter(`folder:${folder.id}`)}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                isFolderActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {folder.nome} ({count})
            </button>
          );
        })}
      </div>

      {/* Photos Grid or List */}
      {currentPhotosList.length > 0 ? (
        activePhotoFilter === 'selected' ? (
          <div className="space-y-3 animate-fade-in">
            {currentPhotosList.map((photo, index) => (
              <div key={photo.id} className="flex gap-4 p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/40 transition-colors">
                <div 
                  className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-lg overflow-hidden bg-muted cursor-pointer relative group"
                  onClick={() => onViewFullscreen(index)}
                >
                  <img src={photo.thumbnailUrl} className="w-full h-full object-cover" alt={photo.originalFilename} />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-md">Ampliar</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0 py-1 flex flex-col">
                  <h4 className="text-sm font-medium text-foreground truncate">{photo.originalFilename}</h4>
                  {photo.comment ? (
                    <div className="mt-2 text-sm text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50 whitespace-pre-wrap">
                      {photo.comment}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground/60 italic">Sem observações</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <MasonryGrid gap={photoSpacing}>
            {currentPhotosList.map((photo, index) => (
              <MasonryItem key={photo.id} photoWidth={photo.width} photoHeight={photo.height}>
                <PhotoCard
                  photo={photo}
                  isSelected={photo.isSelected}
                  allowComments={allowComments}
                  readOnly
                  onSelect={() => {}}
                  onViewFullscreen={() => onViewFullscreen(index)}
                />
              </MasonryItem>
            ))}
          </MasonryGrid>
        )
      ) : (
        <div className="text-center py-16 lunari-card">
          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {activePhotoFilter === 'selected'
              ? 'Nenhuma foto selecionada pelo cliente ainda'
              : activePhotoFilter === 'favorites'
                ? 'Nenhuma foto marcada como favorita'
                : activePhotoFilter.startsWith('folder:')
                  ? 'Nenhuma foto nesta pasta'
                  : 'Nenhuma foto adicionada ainda'}
          </p>
        </div>
      )}
    </div>
  );
}
