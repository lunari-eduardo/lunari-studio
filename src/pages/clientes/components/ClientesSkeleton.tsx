import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ClientesSkeletonProps {
  viewMode: 'cards' | 'list';
}

export const ClientesSkeleton: React.FC<ClientesSkeletonProps> = ({ viewMode }) => {
  if (viewMode === 'cards') {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl border border-border/30 bg-card/60 p-5 shadow-sm"
          >
            {/* Header: Avatar, Nome, Categoria, Badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>

            {/* Métricas: 3 Colunas */}
            <div className="my-5 grid grid-cols-3 gap-2 rounded-xl border border-border/10 bg-muted/20 p-3">
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-10" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-10" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>

            {/* Rodapé: Sessões e Ações */}
            <div className="mt-auto flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/30 bg-card/40">
      <Table>
        <TableHeader>
          <TableRow className="border-border/20 hover:bg-transparent">
            <TableHead className="w-10">
              <Skeleton className="h-4 w-4 rounded" />
            </TableHead>
            <TableHead className="w-[280px]">Cliente</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>A Receber</TableHead>
            <TableHead>Sessões</TableHead>
            <TableHead>Última sessão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i} className="border-border/20 hover:bg-transparent">
              <TableCell>
                <Skeleton className="h-4 w-4 rounded" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-3.5 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-14 rounded-full" />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
