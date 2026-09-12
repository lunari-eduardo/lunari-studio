/**
 * Hero da tela de conexão: pill, headline, bullets e CTAs.
 */

import { ArrowRight, FolderOpen, Play, SlidersHorizontal, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FeatureBullet } from './FeatureBullet';

export interface ConnectHeroProps {
  onGenerateQr: () => void;
  onOpenHowItWorks: () => void;
  loading: boolean;
}

const BULLETS = [
  {
    icon: Zap,
    title: 'Atendimento mais rápido',
    description: 'Responda clientes diretamente pelo painel, sem alternar entre abas.',
  },
  {
    icon: FolderOpen,
    title: 'Mais organização',
    description: 'Todas as conversas em um só lugar, com histórico completo do cliente.',
  },
  {
    icon: Sparkles,
    title: 'Funcionalidades exclusivas',
    description: 'Templates, follow-up automático e ações rápidas pensadas para fotógrafos.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Seu estúdio no controle',
    description: 'Você decide quem atende, quando e como.',
  },
];

export function ConnectHero({ onGenerateQr, onOpenHowItWorks, loading }: ConnectHeroProps) {
  return (
    <div className="space-y-6">
      <Badge
        variant="outline"
        className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 px-3 py-1 text-xs font-medium rounded-full gap-1.5"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
        WhatsApp Business
      </Badge>

      <div className="space-y-3">
        <h1 className="font-serif text-4xl md:text-5xl leading-tight text-zinc-50">
          Conecte seu <span className="text-amber-400">WhatsApp</span> ao Lunari
        </h1>
        <p className="text-zinc-400 text-base max-w-md leading-relaxed">
          Centralize o atendimento dos seus clientes, responda mais rápido e nunca perca uma
          oportunidade de venda.
        </p>
      </div>

      <div className="space-y-4">
        {BULLETS.map(b => (
          <FeatureBullet key={b.title} {...b} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          onClick={onGenerateQr}
          disabled={loading}
          size="lg"
          className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold px-6 rounded-full shadow-lg shadow-amber-500/20"
        >
          {loading ? 'Gerando…' : 'Gerar QR Code'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button
          onClick={onOpenHowItWorks}
          variant="ghost"
          size="lg"
          className="text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800/50 rounded-full"
        >
          <Play className="h-4 w-4 mr-2" />
          Como funciona?
        </Button>
      </div>

      <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-1">
        <span className="h-3 w-3 rounded-full border border-zinc-700 inline-flex items-center justify-center text-[8px]">🔒</span>
        Conexão segura via WhatsApp Business
      </p>
    </div>
  );
}
