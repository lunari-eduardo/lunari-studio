import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutTemplate, Loader2, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DbTemplate, Categoria } from '../../types';

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
          {template.thumbnail_url ? (
            <img
              src={template.thumbnail_url}
              alt={`Prévia do modelo ${template.name}`}
              loading="lazy"
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <LayoutTemplate className="h-6 w-6 text-muted-foreground" />
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
