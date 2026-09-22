import { useState } from 'react';
import { Eye, Clock, Code2, Loader2, FileSignature, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ContratoSeedTemplate } from '@/utils/contratoSeedTemplates';
import { countVariables, estimateReadingTime } from '../utils/contratoMetrics';

const COVER_GRADIENTS = [
  'from-amber-100/50 to-orange-100/50 dark:from-amber-950/40 dark:to-orange-950/20',
  'from-stone-100/50 to-neutral-100/50 dark:from-stone-900/40 dark:to-neutral-900/20',
  'from-slate-100/50 to-zinc-100/50 dark:from-slate-900/40 dark:to-zinc-900/20',
];

function getPlaceholderGradient(slug: string): string {
  const index = slug.charCodeAt(0) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[index];
}

interface TemplateCardProps {
  seed: ContratoSeedTemplate;
  onUseTemplate: (seed: ContratoSeedTemplate) => void;
  onPreview: (seed: ContratoSeedTemplate) => void;
  isUsing?: boolean;
}

export function TemplateCard({
  seed,
  onUseTemplate,
  onPreview,
  isUsing = false,
}: TemplateCardProps) {
  const placeholderGradient = getPlaceholderGradient(seed.slug);
  const totalVars = countVariables(seed.conteudo);
  const readingTime = estimateReadingTime(seed.conteudo);

  const cleanTitle = seed.nome.replace('Contrato — ', '').trim();

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden',
        'transition-all duration-200',
        'hover:border-border/80 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-[hsl(var(--accent-gold))]/40'
      )}
    >
      {/* Capa */}
      <div
        className={cn(
          'relative h-28 w-full bg-gradient-to-br',
          placeholderGradient,
          'flex items-center justify-center cursor-pointer'
        )}
        onClick={() => onPreview(seed)}
      >
        <div className="opacity-25 group-hover:scale-105 transition-transform duration-200">
          <FileSignature size={38} strokeWidth={1.2} className="text-foreground/50" />
        </div>

        {/* Badge Lunari */}
        <Badge
          variant="outline"
          className="absolute top-2 left-2 text-[9px] px-1.5 py-0 font-medium border-[hsl(var(--accent-gold))]/30 text-[hsl(var(--accent-gold))] bg-background/80 backdrop-blur-sm flex items-center gap-1"
        >
          <Sparkles size={10} />
          Lunari
        </Badge>

        {/* Botão de Visualizar em hover no canto superior direito */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(seed);
          }}
          title="Visualizar contrato"
          className={cn(
            'absolute top-2 right-2 shrink-0',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
            'h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background'
          )}
        >
          <Eye size={14} strokeWidth={1.8} />
        </Button>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-col flex-1 gap-2 p-4">
        {/* Categoria */}
        <Badge
          variant="outline"
          className="self-start text-[10px] px-2 py-0 font-medium border-[hsl(var(--accent-gold))]/30 text-[hsl(var(--accent-gold))] bg-[hsl(var(--accent-gold))]/5 uppercase tracking-wider"
        >
          {seed.categoria}
        </Badge>

        {/* Título com emoji */}
        <h3
          onClick={() => onPreview(seed)}
          className="text-sm font-semibold text-foreground leading-snug line-clamp-2 cursor-pointer hover:text-[hsl(var(--accent-gold))] transition-colors flex items-center gap-1.5"
        >
          <span>{seed.emoji}</span>
          <span>{cleanTitle}</span>
        </h3>

        {/* Descrição */}
        {seed.descricao && (
          <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
            {seed.descricao}
          </p>
        )}

        <div className="flex-1 min-h-2" />

        <div className="border-t border-border/40 my-1" />

        {/* Rodapé: Métricas */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={12} strokeWidth={1.8} />
            ~{readingTime} min
          </span>

          <span className="flex items-center gap-1">
            <Code2 size={12} strokeWidth={1.8} />
            {totalVars} variáveis
          </span>
        </div>

        {/* Botão dourado "Usar modelo" */}
        <Button
          size="sm"
          className="w-full bg-[hsl(var(--accent-gold))] hover:bg-[hsl(var(--accent-gold))]/90 text-primary-foreground font-medium text-xs mt-1"
          onClick={() => onUseTemplate(seed)}
          disabled={isUsing}
        >
          {isUsing ? (
            <>
              <Loader2 size={14} className="animate-spin mr-1.5" />
              Adicionando...
            </>
          ) : (
            'Usar modelo'
          )}
        </Button>
      </div>
    </article>
  );
}

export function TemplateCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden">
      <Skeleton className="h-28 w-full" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <div className="border-t border-border/40 my-2" />
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-8 w-full rounded mt-1" />
      </div>
    </div>
  );
}
