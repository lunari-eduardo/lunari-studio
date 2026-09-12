/**
 * Grid de 6 benefícios exibido na coluna direita da tela de conexão.
 */

import {
  BellRing,
  Inbox,
  MousePointerClick,
  ShieldCheck,
  UserCircle2,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const BENEFITS: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
}> = [
  {
    icon: Inbox,
    title: 'Conversas em um só lugar',
    description: 'Inbox unificada com filtros por status, etiqueta e cliente.',
    accent: 'text-amber-400 bg-amber-500/10',
  },
  {
    icon: UserCircle2,
    title: 'Contexto do cliente',
    description: 'Veja histórico, últimas fotos e pagamentos ao lado da conversa.',
    accent: 'text-emerald-400 bg-emerald-500/10',
  },
  {
    icon: FileText,
    title: 'Templates prontos',
    description: 'Respostas rápidas para orçamento, agradecimento, lembrete de sessão e mais.',
    accent: 'text-sky-400 bg-sky-500/10',
  },
  {
    icon: BellRing,
    title: 'Follow-up inteligente',
    description: 'Lembretes automáticos para leads que sumiram.',
    accent: 'text-rose-400 bg-rose-500/10',
  },
  {
    icon: MousePointerClick,
    title: 'Ações rápidas',
    description: 'Marcar como lido, fixar, arquivar, bloquear — tudo a um clique.',
    accent: 'text-purple-400 bg-purple-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Seguro e confiável',
    description: 'Criptografia ponta-a-ponta e isolamento por estúdio.',
    accent: 'text-orange-400 bg-orange-500/10',
  },
];

export function BenefitGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {BENEFITS.map(b => (
        <Card
          key={b.title}
          className="bg-zinc-900/60 border-zinc-800 p-3 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center',
                b.accent,
              )}
            >
              <b.icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-50">{b.title}</p>
              <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">{b.description}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
