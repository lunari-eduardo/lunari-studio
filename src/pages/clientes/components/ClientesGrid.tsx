import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Camera,
  MessageCircle,
  Pencil,
  MoreHorizontal,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/utils/financialUtils';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClienteResumo } from '../types';

interface ClientesGridProps {
  clientes: ClienteResumo[];
  onWhatsApp: (cliente: ClienteResumo) => void;
  onEdit: (cliente: ClienteResumo) => void;
  onDelete: (clientId: string) => void;
}

export const ClientesGrid: React.FC<ClientesGridProps> = ({
  clientes,
  onWhatsApp,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();

  // Função para formatar o nome elegante com bullet (ex: Elisa · Lívia)
  const formatClientDisplayName = (cliente: ClienteResumo) => {
    if (cliente.dependente_nome) {
      return `${cliente.nome} · ${cliente.dependente_nome}`;
    }
    if (cliente.nome.includes(' - ')) {
      return cliente.nome.replace(' - ', ' · ');
    }
    return cliente.nome;
  };

  // Função para formatar o subtítulo (ex: Mãe da Lívia · Gestante ou Categoria)
  const formatClientSubtitle = (cliente: ClienteResumo) => {
    const categoria = cliente.categoria_recente;
    if (cliente.dependente_nome) {
      const papel = cliente.dependente_tipo === 'filho' ? `Mãe/Pai de ${cliente.dependente_nome}` : cliente.dependente_nome;
      return categoria ? `${papel} · ${categoria}` : papel;
    }
    if (cliente.nome.includes(' - ')) {
      const parts = cliente.nome.split(' - ');
      const sub = parts[1]?.trim();
      if (categoria && sub) {
        return `${sub} · ${categoria}`;
      }
      return sub || categoria || 'Cliente';
    }
    return categoria || 'Cliente cadastrado';
  };

  // Função para obter as iniciais do cliente
  const getInitials = (nome: string) => {
    const parts = nome.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (parts[0]?.[0] || 'C').toUpperCase();
  };

  // Formata o tempo relativo da última sessão
  const formatLastSession = (dataStr: string | null | undefined, sessoesCount: number) => {
    if (!dataStr || sessoesCount === 0) {
      return 'Nunca realizou sessão';
    }
    try {
      const d = new Date(dataStr);
      if (isNaN(d.getTime())) return 'Nunca realizou sessão';
      const distance = formatDistanceToNowStrict(d, {
        addSuffix: true,
        locale: ptBR,
      });
      return `Última sessão ${distance}`;
    } catch {
      return 'Nunca realizou sessão';
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {clientes.map((cliente) => {
        const isAtivo = cliente.sessoes_count > 0 || cliente.total_faturado > 0;
        const displayName = formatClientDisplayName(cliente);
        const subtitle = formatClientSubtitle(cliente);
        const lastSessionText = formatLastSession(cliente.ultima_sessao_data, cliente.sessoes_count);

        return (
          <div
            key={cliente.id}
            onClick={() => navigate(`/app/clientes/${cliente.id}`)}
            className="group relative flex flex-col justify-between rounded-2xl border border-border/50 bg-card p-5 shadow-2xs transition-all duration-200 hover:border-border/80 hover:shadow-sm cursor-pointer"
          >
            {/* 1. Cabeçalho do Card */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-11 w-11 shrink-0 rounded-full border border-border/40 ring-1 ring-border/20">
                  {cliente.avatar_url ? (
                    <AvatarImage
                      src={cliente.avatar_url}
                      alt={cliente.nome}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-zinc-100 text-zinc-700 border border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 font-semibold text-xs">
                    {getInitials(cliente.nome)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold tracking-tight text-foreground truncate group-hover:text-accent-gold transition-colors">
                    {displayName}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {subtitle}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    isAtivo
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700/40'
                  }`}
                >
                  {isAtivo ? 'Ativo' : 'Novo'}
                </span>
              </div>
            </div>

            {/* 2. Corpo do Card: 3 Colunas Métricas */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-border/30 bg-muted/20 dark:bg-background/50 p-3">
              {/* Total */}
              <div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                  <CreditCard className="h-3 w-3 text-muted-foreground/80" />
                  Total
                </p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(cliente.total_faturado)}
                </p>
              </div>

              {/* Pago */}
              <div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400/90" />
                  Pago
                </p>
                <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(cliente.total_pago)}
                </p>
              </div>

              {/* A Receber */}
              <div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-accent-gold" />
                  A Receber
                </p>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    cliente.a_receber > 0
                      ? 'text-amber-700 dark:text-accent-gold font-bold'
                      : 'text-muted-foreground/80'
                  }`}
                >
                  {formatCurrency(cliente.a_receber)}
                </p>
              </div>
            </div>

            {/* 3. Rodapé do Card: Sessões + Ações */}
            <div className="mt-1 flex items-center justify-between border-t border-border/20 pt-3">
              {/* Sessões e Última data */}
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1 shrink-0">
                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  {cliente.sessoes_count}{' '}
                  {cliente.sessoes_count === 1 ? 'sessão' : 'sessões'}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {lastSessionText}
                </span>
              </div>

              {/* Botões de Ação (Área de toque mínima 40x40px, off-white no light mode) */}
              <div
                className="flex items-center gap-1.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Botão Conversa */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Iniciar conversa no WhatsApp"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWhatsApp(cliente);
                  }}
                  className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-full transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>

                {/* Botão Editar */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Editar cliente"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(cliente);
                  }}
                  className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-full transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                {/* Mais Opções Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Mais opções"
                      className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-full transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover text-popover-foreground border-border/40 shadow-md">
                    <DropdownMenuItem
                      onClick={() => navigate(`/app/clientes/${cliente.id}`)}
                      className="text-xs cursor-pointer gap-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      Ver Perfil Completo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onEdit(cliente)}
                      className="text-xs cursor-pointer gap-2"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      Editar Dados
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onWhatsApp(cliente)}
                      className="text-xs cursor-pointer gap-2"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      Conversar no WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/20" />
                    <DropdownMenuItem
                      onClick={() => onDelete(cliente.id)}
                      className="text-xs cursor-pointer gap-2 text-rose-400 focus:text-rose-400 focus:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir Cliente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
