/**
 * Bullet reutilizável da hero da tela de conexão.
 */

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface FeatureBulletProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureBullet({ icon: Icon, title, description }: FeatureBulletProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center',
          'bg-zinc-900 border border-zinc-800 text-amber-400',
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-50">{title}</p>
        <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
