import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Send, CheckCircle, XCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { useLeadMetrics, type PeriodFilter } from '@/hooks/useLeadMetrics';
import { cn } from '@/lib/utils';

export interface LeadMetricsCardsProps {
  periodFilter?: PeriodFilter;
  className?: string;
  isMobile?: boolean;
  isCollapsed?: boolean;
}

export default function LeadMetricsCards({
  periodFilter,
  className,
  isMobile = false,
  isCollapsed = false
}: LeadMetricsCardsProps) {
  const {
    metrics,
    topMotivoLabel,
    hasData
  } = useLeadMetrics(periodFilter);
  
  const cards = [{
    title: 'Total de Leads',
    value: metrics.totalLeads,
    icon: Users,
    iconColor: 'text-muted-foreground',
    iconBg: 'bg-muted/60'
  }, {
    title: 'Orçamentos Enviados',
    value: metrics.leadsEnviados,
    icon: Send,
    iconColor: 'text-muted-foreground',
    iconBg: 'bg-muted/60'
  }, {
    title: 'Leads Fechados',
    value: metrics.leadsFechados,
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10'
  }, {
    title: 'Leads Perdidos',
    value: metrics.leadsPerdidos,
    icon: XCircle,
    iconColor: 'text-destructive',
    iconBg: 'bg-destructive/10'
  }, {
    title: 'Taxa de Conversão',
    value: `${metrics.taxaConversao}%`,
    icon: TrendingUp,
    iconColor: 'text-muted-foreground',
    iconBg: 'bg-muted/60',
    subtitle: metrics.leadsEnviados > 0 ? `${metrics.leadsFechados}/${metrics.leadsEnviados}` : '0/0'
  }, {
    title: 'Top Motivo Perda',
    value: topMotivoLabel || 'N/A',
    icon: AlertTriangle,
    iconColor: 'text-muted-foreground',
    iconBg: 'bg-muted/60',
    isText: true
  }];

  if (!hasData) {
    return <Card className={cn(
      "bg-background/90 backdrop-blur-sm border-border/50 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]", 
      isMobile ? "p-3" : "p-4",
      className
    )}>
        <div className="text-center text-muted-foreground">
          <Users className={cn("mx-auto mb-2 opacity-50", isMobile ? "h-6 w-6" : "h-8 w-8")} />
          <p className={cn(isMobile ? "text-xs" : "text-sm")}>Nenhum lead encontrado no período selecionado</p>
        </div>
      </Card>;
  }

  return <div className={cn(
    "grid gap-3", 
    isMobile 
      ? "grid-cols-2 sm:grid-cols-3" 
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-6",
    className
  )}>
      {cards.map((card, index) => {
      const Icon = card.icon;
      return <Card key={index} className="bg-background/90 backdrop-blur-sm border-border/50 transition-all rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
            <CardContent className={cn(
              "flex flex-col justify-between",
              isMobile ? "px-3 py-3" : "px-4 py-4",
              "h-full gap-2"
            )}>
              <div className="flex items-start justify-between w-full">
                <p className={cn(
                  "font-medium text-muted-foreground truncate",
                  isMobile ? "text-[10px]" : "text-xs"
                )}>
                  {card.title}
                </p>
                <div className={cn(
                  "flex-shrink-0 flex items-center justify-center rounded-full",
                  isMobile ? "w-6 h-6" : "w-8 h-8",
                  card.iconBg
                )}>
                  <Icon className={cn(
                    card.iconColor,
                    isMobile ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </div>
              </div>
              <div className="mt-1">
                <p className={cn(
                  "font-semibold text-foreground tracking-tight",
                  isMobile ? "text-lg" : "text-2xl"
                )}>
                  {card.isText ? <span className={cn(
                    isMobile ? "text-xs font-medium" : "text-sm font-medium", 
                    card.value === 'N/A' ? 'text-muted-foreground' : ''
                  )}>
                      {card.value}
                    </span> : card.value}
                </p>
                {card.subtitle && (
                   <p className="text-[11px] font-medium text-muted-foreground mt-1">
                     {card.subtitle}
                   </p>
                )}
              </div>
            </CardContent>
          </Card>;
    })}
    </div>;
}