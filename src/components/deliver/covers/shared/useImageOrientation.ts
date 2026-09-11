import { useState, useEffect, useMemo } from 'react';
import { PhotoPaths, getPhotoUrl } from '@/lib/photoUrl';

export type ImageOrientation = 'portrait' | 'landscape' | 'square';

function computeOrientation(width: number, height: number): ImageOrientation {
  if (!width || !height) return 'landscape';
  const ratio = width / height;
  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.85) return 'portrait';
  return 'square';
}

export function useImageOrientation(photo: PhotoPaths | null): ImageOrientation {
  const initialOrientation = useMemo(() => {
    if (photo && photo.width && photo.height && photo.width > 0 && photo.height > 0) {
      return computeOrientation(photo.width, photo.height);
    }
    return 'landscape';
  }, [photo?.width, photo?.height]);

  const [orientation, setOrientation] = useState<ImageOrientation>(initialOrientation);

  useEffect(() => {
    // Se já temos as dimensões conhecidas
    if (photo && photo.width && photo.height && photo.width > 0 && photo.height > 0) {
      setOrientation(computeOrientation(photo.width, photo.height));
      return;
    }

    if (!photo) {
      setOrientation('landscape');
      return;
    }

    // Fallback assíncrono caso as dimensões não estejam gravadas no banco
    const url = getPhotoUrl(photo, 'preview');
    if (!url || url === '/placeholder.svg') return;

    let isMounted = true;
    const img = new Image();
    img.src = url;
    img.onload = () => {
      if (!isMounted) return;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setOrientation(computeOrientation(img.naturalWidth, img.naturalHeight));
      }
    };

    return () => {
      isMounted = false;
      img.onload = null;
    };
  }, [photo]);

  return orientation;
}
