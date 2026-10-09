import React from 'react';
import { cn } from '@/lib/utils';
import { Smartphone, MonitorPlay } from 'lucide-react';

interface StepOrientationProps {
  selectedOrientation: 'portrait' | 'landscape' | null;
  setSelectedOrientation: (orientation: 'portrait' | 'landscape') => void;
}

export function StepOrientation({ selectedOrientation, setSelectedOrientation }: StepOrientationProps) {
  return (
    <div className="py-4 space-y-4 animate-in slide-in-from-right-4 fade-in duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card Retrato */}
        <button
          type="button"
          onClick={() => setSelectedOrientation('portrait')}
          className={cn(
            'flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all',
            selectedOrientation === 'portrait'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
          )}
        >
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Retrato (Mobile/A4)</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Ideal para leitura em celulares, envio pelo WhatsApp e impressão em formato A4.
            </p>
          </div>
        </button>

        {/* Card Paisagem */}
        <button
          type="button"
          onClick={() => setSelectedOrientation('landscape')}
          className={cn(
            'flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all',
            selectedOrientation === 'landscape'
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
          )}
        >
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <MonitorPlay className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Paisagem (Widescreen)</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Formato de apresentação horizontal. Ideal para reuniões por vídeo ou monitores grandes.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
