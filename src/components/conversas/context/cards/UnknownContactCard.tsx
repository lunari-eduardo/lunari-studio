import { UserPlus, Link, Info, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UnknownContactCardProps {
  onCreateClient: () => void;
  onLinkClient: () => void;
}

export function UnknownContactCard({ onCreateClient, onLinkClient }: UnknownContactCardProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Top Card: Actions */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5 px-1">
          <UserX className="h-4 w-4 text-red-500/80" />
          <span className="text-[13px] font-bold text-red-600/90 dark:text-red-400">
            Não vinculado ao CRM
          </span>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            onClick={onCreateClient}
            className="w-full h-9 text-[11px] font-semibold bg-[#C9A87C] hover:bg-[#b89567] text-white rounded-lg shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Cadastrar Novo Cliente
          </Button>
          <Button
            onClick={onLinkClient}
            variant="outline"
            className="w-full h-9 text-[11px] font-medium border-border/60 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
          >
            <Link className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            Vincular Cliente Existente
          </Button>
        </div>
      </div>

      {/* Bottom Card: Context */}
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-zinc-400" />
            Contexto do contato
          </span>
        </div>

        <div className="flex flex-col gap-2.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Status</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Desconhecido
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Origem</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
              WhatsApp
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Primeiro contato</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Hoje, {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
