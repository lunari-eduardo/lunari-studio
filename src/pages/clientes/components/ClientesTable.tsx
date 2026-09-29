import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MessageCircle,
  Pencil,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Baby,
  Users,
  Heart,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '@/utils/financialUtils';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClienteResumo, SortConfig, SortKey } from '../types';

interface ClientesTableProps {
  clientes: ClienteResumo[];
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
  onWhatsApp: (cliente: ClienteResumo) => void;
  onEdit: (cliente: ClienteResumo) => void;
  onDelete: (clientId: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

export const ClientesTable: React.FC<ClientesTableProps> = ({
  clientes,
  sortConfig,
  onSort,
  onWhatsApp,
  onEdit,
  onDelete,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
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

  // Subtítulo do cliente
  const formatClientSubtitle = (cliente: ClienteResumo) => {
    if (cliente.dependente_nome) {
      return cliente.dependente_tipo === 'filho'
        ? `Mãe/Pai de ${cliente.dependente_nome}`
        : cliente.dependente_nome;
    }
    if (cliente.nome.includes(' - ')) {
      const parts = cliente.nome.split(' - ');
      return parts[1]?.trim() || '';
    }
    return cliente.categoria_recente || '';
  };

  // Iniciais do nome
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
      return 'Nunca realizou';
    }
    try {
      const d = new Date(dataStr);
      if (isNaN(d.getTime())) return 'Nunca realizou';
      return formatDistanceToNowStrict(d, {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'Nunca realizou';
    }
  };

  // Badge estilizado de categoria
  const renderCategoryBadge = (categoria: string | null | undefined) => {
    if (!categoria) {
      return <span className="text-xs text-muted-foreground/60">—</span>;
    }

    const catLower = categoria.toLowerCase();
    let style = 'bg-zinc-800/80 text-zinc-300 border-zinc-700/40';
    let Icon = Sparkles;

    if (catLower.includes('gestan')) {
      style = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
      Icon = Heart;
    } else if (catLower.includes('newborn') || catLower.includes('infantil')) {
      style = 'bg-purple-500/10 text-purple-300 border-purple-500/20';
      Icon = Baby;
    } else if (catLower.includes('famíl') || catLower.includes('familia') || catLower.includes('casal')) {
      style = 'bg-blue-500/10 text-blue-300 border-blue-500/20';
      Icon = Users;
    } else if (catLower.includes('acompanh')) {
      style = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      Icon = Sparkles;
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${style}`}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate max-w-[120px]">{categoria}</span>
      </span>
    );
  };

  // Componente de cabeçalho clicável para ordenação
  const SortableHead = ({
    label,
    sortKey,
    className = '',
  }: {
    label: string;
    sortKey: SortKey;
    className?: string;
  }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <TableHead
        onClick={() => onSort(sortKey)}
        className={`cursor-pointer select-none transition-colors hover:text-foreground ${className}`}
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {isActive ? (
            sortConfig.direction === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-accent-gold" />
            ) : (
              <ArrowDown className="h-3 w-3 text-accent-gold" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground" />
          )}
        </div>
      </TableHead>
    );
  };

  const isAllSelected =
    clientes.length > 0 && clientes.every((c) => selectedIds.has(c.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-border/30 bg-card/60 shadow-sm backdrop-blur-sm">
      <Table>
        <TableHeader className="bg-muted/30 border-b border-border/20 sticky top-0 z-10">
          <TableRow className="border-border/20 hover:bg-transparent">
            {/* Checkbox Geral */}
            <TableHead className="w-12 pl-4">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={() => onToggleSelectAll && onToggleSelectAll()}
                aria-label="Selecionar todos os clientes"
                className="border-border/60 data-[state=checked]:bg-accent-gold data-[state=checked]:text-zinc-950"
              />
            </TableHead>

            <SortableHead label="Cliente" sortKey="nome" className="min-w-[200px]" />
            <TableHead className="min-w-[140px]">Categoria</TableHead>
            <SortableHead label="Total" sortKey="total_faturado" className="min-w-[100px]" />
            <SortableHead label="Pago" sortKey="total_pago" className="min-w-[100px]" />
            <SortableHead label="A Receber" sortKey="a_receber" className="min-w-[100px]" />
            <SortableHead label="Sessões" sortKey="sessoes_count" className="min-w-[90px]" />
            <SortableHead label="Última sessão" sortKey="ultima_sessao_data" className="min-w-[120px]" />
            <TableHead className="min-w-[90px]">Status</TableHead>
            <TableHead className="text-right pr-4 min-w-[120px]">Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {clientes.map((cliente) => {
            const isAtivo = cliente.sessoes_count > 0 || cliente.total_faturado > 0;
            const displayName = formatClientDisplayName(cliente);
            const subtitle = formatClientSubtitle(cliente);
            const isSelected = selectedIds.has(cliente.id);

            return (
              <TableRow
                key={cliente.id}
                onClick={() => navigate(`/app/clientes/${cliente.id}`)}
                className={`group border-border/15 transition-colors cursor-pointer hover:bg-muted/30 ${
                  isSelected ? 'bg-accent-gold/5' : ''
                }`}
              >
                {/* Checkbox Individual */}
                <TableCell
                  className="pl-4 py-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect && onToggleSelect(cliente.id);
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect && onToggleSelect(cliente.id)}
                    aria-label={`Selecionar ${cliente.nome}`}
                    className="border-border/60 data-[state=checked]:bg-accent-gold data-[state=checked]:text-zinc-950"
                  />
                </TableCell>

                {/* Cliente: Avatar + Nome + Subtítulo */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 rounded-full border border-white/10 ring-1 ring-border/20">
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

                    <div className="min-w-0 max-w-[220px]">
                      <span className="block text-sm font-semibold tracking-tight text-foreground truncate group-hover:text-accent-gold transition-colors">
                        {displayName}
                      </span>
                      {subtitle && (
                        <span className="block text-[11px] text-muted-foreground truncate">
                          {subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Categoria */}
                <TableCell className="py-3">
                  {renderCategoryBadge(cliente.categoria_recente)}
                </TableCell>

                {/* Total */}
                <TableCell className="py-3 text-sm font-medium tabular-nums text-foreground">
                  {formatCurrency(cliente.total_faturado)}
                </TableCell>

                {/* Pago */}
                <TableCell className="py-3 text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(cliente.total_pago)}
                </TableCell>

                {/* A Receber */}
                <TableCell
                  className={`py-3 text-sm font-medium tabular-nums ${
                    cliente.a_receber > 0
                      ? 'text-amber-700 dark:text-accent-gold font-semibold'
                      : 'text-muted-foreground/80'
                  }`}
                >
                  {formatCurrency(cliente.a_receber)}
                </TableCell>

                {/* Sessões */}
                <TableCell className="py-3 text-sm tabular-nums text-muted-foreground">
                  {cliente.sessoes_count}
                </TableCell>

                {/* Última Sessão */}
                <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatLastSession(cliente.ultima_sessao_data, cliente.sessoes_count)}
                </TableCell>

                {/* Status */}
                <TableCell className="py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      isAtivo
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-100 text-zinc-600 border border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700/40'
                    }`}
                  >
                    {isAtivo ? 'Ativo' : 'Novo'}
                  </span>
                </TableCell>

                {/* Ações (Suaves no hover desktop, off-white no light mode) */}
                <TableCell
                  className="py-3 text-right pr-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                    {/* Botão Conversa */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="WhatsApp"
                      onClick={(e) => {
                        e.stopPropagation();
                        onWhatsApp(cliente);
                      }}
                      className="h-8 w-8 rounded-full bg-zinc-100/90 hover:bg-zinc-200/90 text-zinc-700 hover:text-zinc-950 border border-zinc-200/70 shadow-2xs dark:bg-zinc-800/40 dark:hover:bg-zinc-700/70 dark:text-zinc-300 dark:hover:text-white dark:border-transparent transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>

                    {/* Botão Editar */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(cliente);
                      }}
                      className="h-8 w-8 rounded-full bg-zinc-100/90 hover:bg-zinc-200/90 text-zinc-700 hover:text-zinc-950 border border-zinc-200/70 shadow-2xs dark:bg-zinc-800/40 dark:hover:bg-zinc-700/70 dark:text-zinc-300 dark:hover:text-white dark:border-transparent transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    {/* Mais Opções */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Mais opções"
                          className="h-8 w-8 rounded-full bg-zinc-100/90 hover:bg-zinc-200/90 text-zinc-700 hover:text-zinc-950 border border-zinc-200/70 shadow-2xs dark:bg-zinc-800/40 dark:hover:bg-zinc-700/70 dark:text-zinc-300 dark:hover:text-white dark:border-transparent transition-colors"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
