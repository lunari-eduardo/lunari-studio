import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DbTemplate, Categoria } from '../../types';
import { getTemplateExampleThumbnail } from '../../../blocks/examplePhotos';

/**
 * Miniatura esquemática fiel à capa e paleta de cada modelo quando não há foto de capa cadastrada.
 * Permite identificar visualmente o layout (Quadro Suspenso, Friso Lateral, Díptico, Pôster, Arcos, etc.) já na lista lateral.
 */
function TemplateMiniPreview({ template }: { template: DbTemplate }) {
  const c = (template.design_tokens as any)?.colors || {};
  const id = template.template_id || '';
  const tags = template.tags || [];

  const cream = c.cream || '#F3F0EA';
  const linen = c.linen || '#E8E3DA';
  const stone = c.stone || '#C9BFB2';
  const accent = c.accent || '#7A5C42';
  const ink = c.ink || '#1A1714';
  const white = c.white || '#FFFFFF';

  // 1. Editorial Sofisticado / Noir (Friso Lateral 50/50 escuro)
  if (id === 'proposta-modelo-01' || tags.includes('sofisticado')) {
    return (
      <div className="grid h-full w-full grid-cols-2 overflow-hidden" style={{ backgroundColor: ink }}>
        <div
          className="h-full w-full border-r border-white/10"
          style={{ background: `linear-gradient(135deg, ${linen}, ${stone})` }}
        />
        <div className="flex flex-col justify-center gap-1.5 px-3 py-2" style={{ color: white }}>
          <span className="h-1 w-8 rounded-full opacity-45" style={{ backgroundColor: white }} />
          <span className="h-2 w-16 rounded-sm" style={{ backgroundColor: white }} />
          <span className="h-1.5 w-12 rounded-sm opacity-70" style={{ backgroundColor: accent }} />
          <span className="mt-1 h-2.5 w-11 rounded-[2px]" style={{ backgroundColor: accent }} />
        </div>
      </div>
    );
  }

  // 2. Clean Minimal (Díptico Editorial: coluna de texto + 2 retratos 3:4 lado a lado)
  if (id === 'proposta-modelo-clean' || tags.includes('minimal')) {
    return (
      <div className="grid h-full w-full grid-cols-12 items-center gap-2 px-3 py-2.5" style={{ backgroundColor: cream }}>
        <div className="col-span-5 flex flex-col gap-1">
          <span className="h-1 w-6 rounded-full opacity-40" style={{ backgroundColor: ink }} />
          <span className="h-2 w-12 rounded-sm" style={{ backgroundColor: ink }} />
          <span className="h-1.5 w-10 rounded-sm opacity-55" style={{ backgroundColor: ink }} />
          <span className="mt-1 h-2 w-9 rounded-[2px]" style={{ backgroundColor: accent }} />
        </div>
        <div className="col-span-7 grid h-full grid-cols-2 gap-1.5 py-0.5">
          <div
            className="h-full w-full rounded-[3px] shadow-sm"
            style={{ background: `linear-gradient(145deg, ${linen}, ${stone})` }}
          />
          <div
            className="h-full w-full rounded-[3px] shadow-sm"
            style={{ background: `linear-gradient(145deg, ${stone}, ${linen})` }}
          />
        </div>
      </div>
    );
  }

  // 3. Revista Editorial / Entre Nós (Pôster Horizonte: filete superior + masthead caixa-alta + assinatura inferior)
  if (id === 'revista-editorial' || id.startsWith('entre-nos') || tags.includes('revista') || tags.includes('casal')) {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-between px-3 py-2"
        style={{ background: `linear-gradient(180deg, ${white} 0%, ${cream} 55%, ${linen} 100%)` }}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="h-2.5 w-px opacity-60" style={{ backgroundColor: accent }} />
          <span className="h-2.5 w-24 rounded-[1px] tracking-widest" style={{ backgroundColor: accent }} />
          <span className="h-1 w-14 rounded-full opacity-55" style={{ backgroundColor: ink }} />
          <span
            className="mt-0.5 h-2.5 w-12 rounded-[1px] border"
            style={{ borderColor: accent }}
          />
        </div>
        <span className="h-1.5 w-16 rounded-full opacity-45" style={{ backgroundColor: accent }} />
      </div>
    );
  }

  // 4. Natal — Noturno
  if (id === 'sessoes-natal-noturno' || tags.includes('noturno')) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-between px-3 py-2.5" style={{ backgroundColor: ink }}>
        <span className="h-1 w-10 rounded-full opacity-50" style={{ backgroundColor: white }} />
        <div className="flex flex-col items-center gap-1">
          <span className="h-2 w-16 rounded-sm" style={{ backgroundColor: white }} />
          <span className="h-2 w-12 rounded-sm" style={{ backgroundColor: accent }} />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-7 rounded-full opacity-40" style={{ backgroundColor: white }} />
          ))}
        </div>
      </div>
    );
  }

  // 5. Natal — Essencial (Medalhão circular)
  if (id === 'sessoes-natal-essencial' || tags.includes('essencial')) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 py-2" style={{ backgroundColor: white }}>
        <div
          className="h-10 w-10 rounded-full border p-0.5"
          style={{ borderColor: accent }}
        >
          <div className="h-full w-full rounded-full" style={{ background: `linear-gradient(135deg, ${linen}, ${stone})` }} />
        </div>
        <span className="h-1.5 w-16 rounded-sm" style={{ backgroundColor: ink }} />
        <span className="h-1 w-10 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    );
  }

  // 6. Natal — Clássico (Três Arcos)
  if (id === 'sessoes-natal' || tags.includes('natal')) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-between px-3 py-2" style={{ backgroundColor: cream }}>
        <div className="grid h-12 w-28 grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-full w-full rounded-t-full border border-black/5"
              style={{ background: `linear-gradient(180deg, ${linen}, ${stone})` }}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="h-1.5 w-16 rounded-sm" style={{ backgroundColor: ink }} />
          <span className="h-1 w-10 rounded-full" style={{ backgroundColor: accent }} />
        </div>
      </div>
    );
  }

  // 7. Clássico Convidativo / Padrão (Quadro Suspenso Fine Art com passe-partout branco)
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 py-2" style={{ backgroundColor: cream }}>
      <span className="h-1.5 w-16 rounded-sm" style={{ backgroundColor: ink }} />
      <span className="h-1 w-10 rounded-full opacity-70" style={{ backgroundColor: accent }} />
      <div className="mt-0.5 rounded-[3px] p-1 shadow-sm" style={{ backgroundColor: white }}>
        <div
          className="h-9 w-12 rounded-[2px]"
          style={{ background: `linear-gradient(135deg, ${linen}, ${stone})` }}
        />
      </div>
    </div>
  );
}

/** Cartão de modelo da vitrine (wizard de criação e "Trocar modelo" do editor). */
export function TemplateCard({
  template,
  selected,
  onSelect,
  badge,
}: {
  template: DbTemplate;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
}) {
  const thumbnailUrl = template.thumbnail_url || getTemplateExampleThumbnail(template.tags);

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
      )}
    >
      {badge && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-background/95 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
          {badge}
        </span>
      )}
      <button type="button" onClick={onSelect} className="flex flex-col flex-1 text-left">
        <div className="h-24 w-full bg-muted flex items-center justify-center border-b border-border overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`Prévia do modelo ${template.name}`}
              loading="lazy"
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <TemplateMiniPreview template={template} />
          )}
        </div>
        <div className="p-3 bg-card">
          <h4 className="font-medium text-sm text-foreground">{template.name}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {template.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </button>
    </div>
  );
}

interface StepTemplateGalleryProps {
  onBack: () => void;
  isLoadingDbTemplates: boolean;
  dbTemplates: DbTemplate[];
  selectedDbTemplate: DbTemplate | null;
  setSelectedDbTemplate: (template: DbTemplate) => void;
  categorias: Categoria[];
  isLoadingCategorias: boolean;
  selectedCategoria: Categoria | null;
  setSelectedCategoria: (cat: Categoria | null) => void;
  customTitle: string;
  setCustomTitle: (title: string) => void;
  onSubmit: () => void;
}

export function StepTemplateGallery({
  onBack,
  isLoadingDbTemplates,
  dbTemplates,
  selectedDbTemplate,
  setSelectedDbTemplate,
  categorias,
  isLoadingCategorias,
  selectedCategoria,
  setSelectedCategoria,
  customTitle,
  setCustomTitle,
  onSubmit,
}: StepTemplateGalleryProps) {
  return (
    <div className="py-4 space-y-6 animate-in slide-in-from-right-4 fade-in duration-200">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <button
          type="button"
          onClick={onBack}
          className="hover:text-foreground transition-colors underline underline-offset-2"
        >
          ← Voltar
        </button>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">1. Escolha um Modelo</label>
        {isLoadingDbTemplates ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : dbTemplates.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">Nenhum template premium disponível.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-h-[250px] overflow-y-auto pr-1">
            {dbTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedDbTemplate?.id === template.id}
                onSelect={() => setSelectedDbTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <label className="text-sm font-medium text-foreground">2. Selecione a Categoria</label>
        {isLoadingCategorias ? (
          <Skeleton className="h-11 w-full rounded-md" />
        ) : categorias.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Tag className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Você ainda não cadastrou categorias.</p>
          </div>
        ) : (
          <Select
            value={selectedCategoria?.id || ''}
            onValueChange={(val) => setSelectedCategoria(categorias.find((c) => c.id === val) || null)}
          >
            <SelectTrigger className="h-11 w-full bg-card">
              <SelectValue placeholder="Escolha uma categoria..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.cor || '#6b7280' }} />
                    <span>{cat.nome}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedCategoria && (
        <div className="space-y-2 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
          <label className="text-sm font-medium text-foreground">
            Nome personalizado <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <Input
            placeholder={`Ex: Proposta ${selectedCategoria.nome} — Maria Fernanda`}
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="h-11"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedDbTemplate) onSubmit();
            }}
          />
          <p className="text-xs text-muted-foreground">
            Se não informado, o título será <strong>"{selectedCategoria.nome}"</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
