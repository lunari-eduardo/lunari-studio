import { Card } from '@/components/ui/card';
import { 
  Layers, 
  CheckCircle2, 
  Sparkles, 
  DollarSign 
} from 'lucide-react';
import { formatCurrency } from '@/utils/financialUtils';
import { GaleriasResumo } from './types';

interface GaleriasKpiCardsProps {
  resumo: GaleriasResumo;
}

export function GaleriasKpiCards({ resumo }: GaleriasKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="p-3 rounded-xl border-border/20 bg-card/60 shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Galerias</span>
          <Layers className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
        <div className="mt-1 text-lg font-semibold tracking-tight text-foreground">
          {resumo.totalGalerias}
        </div>
      </Card>

      <Card className="p-3 rounded-xl border-border/20 bg-card/60 shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Fotos Selecionadas</span>
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
        <div className="mt-1 text-lg font-semibold tracking-tight text-foreground">
          {resumo.totalFotosSelecionadas}
        </div>
      </Card>

      <Card className="p-3 rounded-xl border-border/20 bg-card/60 shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Fotos Extras</span>
          <Sparkles className="h-3.5 w-3.5 text-accent-gold/70" />
        </div>
        <div className="mt-1 text-lg font-semibold tracking-tight text-foreground">
          +{resumo.totalFotosExtras}
        </div>
      </Card>

      <Card className="p-3 rounded-xl border-border/20 bg-card/60 shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Faturamento Extras</span>
          <DollarSign className="h-3.5 w-3.5 text-accent-gold/70" />
        </div>
        <div className="mt-1 text-lg font-semibold tracking-tight text-foreground">
          {formatCurrency(resumo.faturamentoExtrasTotal)}
        </div>
      </Card>
    </div>
  );
}
