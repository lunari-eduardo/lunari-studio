/**
 * Lista de 6 benefícios em cards horizontais exibida na coluna direita da tela de conexão.
 * Réplica fiel da referência visual (Imagem 2).
 */

import {
  Calendar,
  FileText,
  MessageSquareText,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const BENEFITS: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: MessageSquareText,
    title: 'Conversas em um só lugar',
    description: 'Atenda todos os seus clientes diretamente no Lunari.',
  },
  {
    icon: User,
    title: 'Contexto do cliente',
    description: 'Veja histórico, orçamentos, sessões e pagamentos durante a conversa.',
  },
  {
    icon: FileText,
    title: 'Templates prontos',
    description: 'Responda mais rápido com mensagens personalizadas.',
  },
  {
    icon: Zap,
    title: 'Follow-up inteligente',
    description: 'Receba lembretes automáticos para não perder oportunidades.',
  },
  {
    icon: Calendar,
    title: 'Ações rápidas',
    description: 'Crie orçamentos, agende sessões, registre pagamentos e muito mais.',
  },
  {
    icon: ShieldCheck,
    title: 'Seguro e confiável',
    description: 'Conexão oficial via WhatsApp Business com total segurança.',
  },
];

export function BenefitGrid() {
  return (
    <div className="flex flex-col gap-3">
      {BENEFITS.map(b => (
        <Card
          key={b.title}
          className={cn(
            'bg-card/60 hover:bg-card/90 dark:bg-card/40 dark:hover:bg-card/80',
            'border-border/50 hover:border-border/90',
            'p-3.5 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md',
          )}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                'flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center',
                'bg-muted/50 dark:bg-zinc-800/60 border border-border/40 dark:border-zinc-700/40',
                'text-[#C9A87C] dark:text-[#D4B57C] shadow-sm',
              )}
            >
              <b.icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-foreground tracking-tight">{b.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{b.description}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
