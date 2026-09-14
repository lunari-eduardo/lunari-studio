/**
 * Skeletons para estados de loading do módulo Conversas.
 */

import { Skeleton } from '@/components/ui/skeleton';

export function ChatListSkeleton() {
  return (
    <div className="space-y-0.5 p-1">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
          {/* Avatar */}
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          {/* Conteúdo */}
          <div className="flex-1 space-y-1.5 min-w-0">
            {/* Linha 1: nome + timestamp */}
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-10" />
            </div>
            {/* Linha 2: preview + badge */}
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-2.5 w-36" />
              <Skeleton className="h-3 w-6 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <Skeleton className="h-8 w-48 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
