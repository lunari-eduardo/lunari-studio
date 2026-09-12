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
    <div className="flex items-start gap-3.5">
      <div
        className={cn(
          'flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center',
          'bg-muted/50 dark:bg-zinc-900/80 border border-border/50 dark:border-zinc-800/80',
          'text-[#C9A87C] dark:text-[#D4B57C] shadow-sm',
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}
