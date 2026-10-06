import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    color: 'text-muted-foreground'
  }, {
    title: 'Orçamentos Enviados',
    value: metrics.leadsEnviados,
    icon: Send,
    color: 'text-muted-foreground'
  }, {
    title: 'Leads Fechados',
    value: metrics.leadsFechados,
    icon: CheckCircle,
    color: 'text-muted-foreground'
  }, {
    title: 'Leads Perdidos',
    value: metrics.leadsPerdidos,
    icon: XCircle,
    color: 'text-muted-foreground'
  }, {
    title: 'Taxa de Conversão',
    value: `${metrics.taxaConversao}%`,
    icon: TrendingUp,
    color: 'text-muted-foreground',
    subtitle: metrics.leadsEnviados > 0 ? `${metrics.leadsFechados}/${metrics.leadsEnviados}` : '0/0'
  }, {
    title: 'Top Motivo Perda',
    value: topMotivoLabel || 'N/A',
    icon: AlertTriangle,
    color: 'text-muted-foreground',
    isText: true
  }];

  if (!hasData) {
    return <Card className={cn(
      "bg-card/40 dark:bg-card/[0.05] backdrop-blur-sm border-white/30 dark:border-white/[0.08]", 
      isMobile ? "p-3" : "p-4",
      className
    )}>
        <div className="text-center text-lunar-textSecondary">
          <Users className={cn("mx-auto mb-2 opacity-50", isMobile ? "h-6 w-6" : "h-8 w-8")} />
          <p className={cn(isMobile ? "text-xs" : "text-sm")}>Nenhum lead encontrado no período selecionado</p>
        </div>
      </Card>;
  }

  return <div className={cn(
    "grid gap-2", 
    isMobile 
      ? "grid-cols-2 sm:grid-cols-3" 
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-6",
    className
  )}>
      {cards.map((card, index) => {
      const Icon = card.icon;
      return <Card key={index} className="bg-card/20 backdrop-blur-sm border-border/30 hover:bg-card/40 transition-all rounded-xl shadow-none">
            <CardContent className={cn(
              "flex flex-col justify-between",
              isMobile ? "px-3 py-2.5" : "px-4 py-3",
              "h-full gap-2"
            )}>
              <div className="flex items-start justify-between w-full">
                <p className={cn(
                  "font-medium text-muted-foreground truncate",
                  isMobile ? "text-[10px]" : "text-xs"
                )}>
                  {card.title}
                </p>
                <div className="flex-shrink-0 opacity-50">
                  <Icon className={cn(
                    card.color,
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
                   <p className="text-[10px] text-muted-foreground mt-0.5">
                     {card.subtitle}
                   </p>
                )}
              </div>
            </CardContent>
          </Card>;
    })}
    </div>;
}