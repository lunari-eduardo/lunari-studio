import { Suspense } from 'react';
import { COVER_REGISTRY, DEFAULT_COVER_ID } from './registry';
import type { CoverVariantProps } from './types';
import { getPhotoUrl } from '@/lib/photoUrl';

interface Props extends CoverVariantProps {
  coverId?: string | null;
}

export function CoverRenderer({ coverId, ...props }: Props) {
  const variant = COVER_REGISTRY[coverId ?? DEFAULT_COVER_ID] ?? COVER_REGISTRY[DEFAULT_COVER_ID];
  const Comp = variant.Component;
  
  // Fallback que usa a foto de capa para evitar flashes
  const fallbackUrl = props.coverPhoto ? getPhotoUrl(props.coverPhoto, 'preview') : undefined;
  
  return (
    <Suspense 
      fallback={
        <div 
          className="w-full h-[100svh] bg-cover bg-center bg-no-repeat bg-background" 
          style={fallbackUrl ? { backgroundImage: `url(${fallbackUrl})` } : undefined}
        />
      }
    >
      <Comp {...props} />
    </Suspense>
  );
}
