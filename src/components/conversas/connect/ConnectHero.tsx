/**
 * Hero da tela de conexão: pill com logo WhatsApp, headline, bullets temáticos e CTAs Lunari.
 * Réplica fiel da Imagem 2.
 */

import {
  Aperture,
  ArrowRight,
  FileText,
  Lock,
  Play,
  QrCode,
  User,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FeatureBullet } from './FeatureBullet';
import { WhatsAppIcon } from './QrCodePanel';

export interface ConnectHeroProps {
  onGenerateQr: () => void;
  onOpenHowItWorks: () => void;
  loading: boolean;
}

const BULLETS = [
  {
    icon: User,
    title: 'Atendimento mais rápido',
    description: 'Responda com agilidade e tenha todo o contexto do cliente.',
  },
  {
    icon: Users,
    title: 'Mais organização',
    description: 'Conversas, orçamentos, sessões e pagamentos conectados.',
  },
  {
    icon: FileText,
    title: 'Funcionalidades exclusivas',
    description: 'Templates, lembretes, follow-up e muito mais.',
  },
  {
    icon: Aperture,
    title: 'Seu estúdio no controle',
    description: 'Mais tempo para o que realmente importa: fotografar.',
  },
];

export function ConnectHero({ onGenerateQr, onOpenHowItWorks, loading }: ConnectHeroProps) {
  return (
    <div className="space-y-6">
      {/* Pill WhatsApp Business */}
      <Badge
        variant="outline"
        className="bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-xs font-medium rounded-full gap-1.5 w-fit flex items-center shadow-sm"
      >
        <WhatsAppIcon className="h-3.5 w-3.5 fill-[#25D366]" />
        WhatsApp Business
      </Badge>

      {/* Título e Subtítulo */}
      <div className="space-y-3">
        <h1 className="font-sans text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.15] text-foreground">
          Conecte seu{' '}
          <span className="text-[#C9A87C] dark:text-[#D4B57C]">WhatsApp</span> ao Lunari
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md leading-relaxed">
          Gerencie suas conversas, atenda clientes, envie orçamentos, agende sessões e muito mais,
          tudo em um só lugar.
        </p>
      </div>

      {/* Bullets de recursos */}
      <div className="space-y-4 pt-1">
        {BULLETS.map(b => (
          <FeatureBullet key={b.title} {...b} />
        ))}
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          onClick={onGenerateQr}
          disabled={loading}
          size="lg"
          className="bg-[#C9A87C] hover:bg-[#B8986B] text-zinc-950 font-semibold px-5 rounded-xl shadow-md transition-all h-11"
        >
          <QrCode className="h-4 w-4 mr-2" />
          {loading ? 'Gerando…' : 'Gerar QR Code'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        <Button
          onClick={onOpenHowItWorks}
          variant="outline"
          size="lg"
          className="border-border/70 hover:border-border bg-card/40 hover:bg-card/90 text-foreground font-medium px-5 rounded-xl shadow-sm transition-all h-11"
        >
          <Play className="h-4 w-4 mr-2 fill-current/20" />
          Como funciona?
        </Button>
      </div>

      {/* Rodapé informativo */}
      <p className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
        <Lock className="h-3.5 w-3.5 text-muted-foreground/80" />
        Conexão segura via WhatsApp Business
      </p>
    </div>
  );
}
