/**
 * ResponsesTable — tabela de respostas para a tab "Respostas".
 *
 * Mobile: lista vertical com mesma hierarquia.
 * Desktop: tabela compacta com linhas finas.
 *
 * Princípio: nada de mock. Cada linha é uma `FormularioResposta` real.
 *
 * Modal de detalhe: componente local `ResponseDetailDialog` que mostra
 * pergunta/resposta de uma resposta específica (não a "primeira" como o
 * componente legado fazia).
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, FileText, MessageSquare, Calendar, Palette, CheckSquare, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FormularioResposta, FormularioCampo } from '@/types/formulario';

interface Props {
  respostas: FormularioResposta[];
  campos: FormularioCampo[];
}

function renderResposta(campo: FormularioCampo, valor: any) {
  if (valor === undefined || valor === null || valor === '') {
    return <span className="text-muted-foreground italic text-sm">Não respondido</span>;
  }
  switch (campo.tipo) {
    case 'texto_curto':
    case 'texto_longo':
      return <p className="text-sm whitespace-pre-wrap">{valor}</p>;
    case 'data':
      try {
        return (
          <p className="text-sm flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {format(new Date(valor), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        );
      } catch {
        return <p className="text-sm">{valor}</p>;
      }
    case 'selecao_unica':
      return (
        <Badge variant="secondary" className="text-sm font-normal">
          {valor}
        </Badge>
      );
    case 'multipla_escolha':
      return (
        <div className="flex flex-wrap gap-1.5">
          {(Array.isArray(valor) ? valor : [valor]).map((item: string, idx: number) => (
            <Badge key={idx} variant="secondary" className="text-xs font-normal flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {item}
            </Badge>
          ))}
        </div>
      );
    case 'upload_imagem':
    case 'upload_referencia':
      return (
        <div className="flex flex-wrap gap-2">
          {(Array.isArray(valor) ? valor : [valor]).map((url: string, idx: number) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-24 h-24 rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all"
            >
              <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      );
    case 'selecao_cores':
      return (
        <p className="text-sm flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          {valor}
        </p>
      );
    default:
      return <p className="text-sm">{String(valor)}</p>;
  }
}

function ResponseDetailDialog({
  resposta,
  campos,
  open,
  onOpenChange,
}: {
  resposta: FormularioResposta | null;
  campos: FormularioCampo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!resposta) return null;
  const camposOrdenados = [...campos].sort((a, b) => a.ordem - b.ordem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Resposta de {resposta.respondente_nome || 'Anônimo'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-3">
          {(resposta.respondente_nome || resposta.respondente_email) && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Respondido por</p>
              <p className="text-sm font-medium">
                {resposta.respondente_nome || 'Anônimo'}
                {resposta.respondente_email && (
                  <span className="font-normal text-muted-foreground ml-1">
                    ({resposta.respondente_email})
                  </span>
                )}
              </p>
              {resposta.submitted_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(resposta.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          )}

          {camposOrdenados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Este formulário não tem perguntas configuradas.
            </p>
          ) : (
            camposOrdenados.map((campo) => (
              <div key={campo.id} className="border rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{campo.label}</p>
                {renderResposta(campo, resposta.respostas?.[campo.id])}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResponsesTable({ respostas, campos }: Props) {
  const [selected, setSelected] = useState<FormularioResposta | null>(null);

  if (respostas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageSquare size={20} className="text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Nenhuma resposta ainda
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs">
          Quando alguém responder este formulário, as respostas aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop — tabela compacta */}
      <div className="hidden md:block rounded-xl border border-border/60 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground">
              <th className="text-left text-[11px] font-medium uppercase tracking-wide py-2.5 px-4">
                Respondente
              </th>
              <th className="text-left text-[11px] font-medium uppercase tracking-wide py-2.5 px-4">
                Respondido em
              </th>
              <th className="text-left text-[11px] font-medium uppercase tracking-wide py-2.5 px-4">
                Status
              </th>
              <th className="text-right text-[11px] font-medium uppercase tracking-wide py-2.5 px-4">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {respostas.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <td className="py-2.5 px-4">
                  <div className="flex flex-col">
                    <span className="text-foreground text-[13px] font-medium">
                      {r.respondente_nome || 'Anônimo'}
                    </span>
                    {r.respondente_email && (
                      <span className="text-[11px] text-muted-foreground">
                        {r.respondente_email}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-4 text-[12px] text-muted-foreground">
                  {r.submitted_at
                    ? format(new Date(r.submitted_at), "dd MMM yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : '—'}
                </td>
                <td className="py-2.5 px-4">
                  <Badge className="text-[10px] bg-[hsl(var(--accent-gold))]/10 text-[hsl(var(--accent-gold))] border-[hsl(var(--accent-gold))]/20">
                    Respondido
                  </Badge>
                </td>
                <td className="py-2.5 px-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected(r)}
                    className="h-7 px-2 gap-1.5 text-xs"
                    aria-label="Visualizar resposta"
                  >
                    <Eye size={12} strokeWidth={1.8} />
                    Ver
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile — lista vertical */}
      <div className="md:hidden space-y-2">
        {respostas.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            className="w-full text-left rounded-xl border border-border/60 bg-card p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-gold))]/40"
            aria-label={`Resposta de ${r.respondente_nome || 'anônimo'}`}
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <FileText size={14} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 justify-between">
                <span className="text-sm font-medium text-foreground truncate">
                  {r.respondente_nome || 'Anônimo'}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {r.submitted_at
                    ? format(new Date(r.submitted_at), 'dd/MM HH:mm', { locale: ptBR })
                    : ''}
                </span>
              </div>
              {r.respondente_email && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {r.respondente_email}
                </p>
              )}
              <Badge className="text-[10px] mt-1 bg-[hsl(var(--accent-gold))]/10 text-[hsl(var(--accent-gold))] border-[hsl(var(--accent-gold))]/20">
                Respondido
              </Badge>
            </div>
          </button>
        ))}
      </div>

      <ResponseDetailDialog
        resposta={selected}
        campos={campos}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </>
  );
}

export function ResponsesTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// Export for `Image` icon usage in case future iterations need it.
export { ImageIcon };
