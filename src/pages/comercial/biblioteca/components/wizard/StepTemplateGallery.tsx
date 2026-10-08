import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutTemplate, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DbTemplate } from '../../types';

interface StepTemplateGalleryProps {
  onBack: () => void;
  isLoadingDbTemplates: boolean;
  dbTemplates: DbTemplate[];
  selectedDbTemplate: DbTemplate | null;
  setSelectedDbTemplate: (template: DbTemplate) => void;
}

export function StepTemplateGallery({
  onBack,
  isLoadingDbTemplates,
  dbTemplates,
  selectedDbTemplate,
  setSelectedDbTemplate,
}: StepTemplateGalleryProps) {
  const queryClient = useQueryClient();

  return (
    <div className="py-4 space-y-4 animate-in slide-in-from-right-4 fade-in duration-200">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button
          type="button"
          onClick={onBack}
          className="hover:text-foreground transition-colors underline underline-offset-2"
        >
          ← Voltar
        </button>
      </div>

      {isLoadingDbTemplates ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : dbTemplates.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">Nenhum template premium disponível.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
          {dbTemplates.map((template) => (
            <div
              key={template.id}
              className={cn(
                'relative flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all',
                selectedDbTemplate?.id === template.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedDbTemplate(template)}
                className="flex flex-col flex-1 text-left"
              >
                <div className="h-32 w-full bg-muted flex items-center justify-center border-b border-border">
                  <LayoutTemplate className="h-8 w-8 text-muted-foreground" />
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
          ))}
        </div>
      )}
    </div>
  );
}
