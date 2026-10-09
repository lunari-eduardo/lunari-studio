import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutTemplate, FileText } from 'lucide-react';

interface StepMethodProps {
  creationMethod: 'db-template' | 'pdf' | null;
  setCreationMethod: (method: 'db-template' | 'pdf') => void;
}

export function StepMethod({ creationMethod, setCreationMethod }: StepMethodProps) {
  return (
    <div className="py-4 space-y-4 animate-in slide-in-from-right-4 fade-in duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card Modelos */}
        <button
          type="button"
          onClick={() => setCreationMethod('db-template')}
          className={cn(
            'flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all',
            creationMethod === 'db-template'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
          )}
        >
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <LayoutTemplate className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Modelos</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Crie uma proposta profissional utilizando um modelo pronto e personalize o conteúdo para o seu negócio.
            </p>
          </div>
        </button>

        {/* Card PDF */}
        <button
          type="button"
          onClick={() => setCreationMethod('pdf')}
          className={cn(
            'flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all',
            creationMethod === 'pdf'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
          )}
        >
          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">PDF</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Você já tem uma proposta pronta? Envie seu PDF e transforme-o em uma experiência digital compartilhável.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
