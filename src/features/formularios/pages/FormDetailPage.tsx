/**
 * FormDetailPage — página de detalhes de um formulário específico.
 *
 * Estrutura:
 *  • Header com breadcrumb "← Formulários", título, metadados e ações.
 *  • Grid de resumo (cards pequenos) — cada card só renderiza se houver dado real.
 *  • Tabs internas: Respostas | Configurações | Compartilhamento.
 *
 * Princípio: nada de mock. Se o dado não existir, omitir o card / empty state honesto.
 *
 * Rota: /app/formularios/:id
 */
import { useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, Clock, MessageSquare, Send, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { PAGE_SCROLL_SHELL } from '@/components/layout/PageTabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { PAGE_TABS_LIST, PAGE_TABS_TRIGGER, PAGE_TABS_CONTENT } from '@/components/layout/PageTabs';

import { useFormularios, useFormularioRespostas } from '@/hooks/useFormularios';
import { useFormularioTemplates } from '@/hooks/useFormularioTemplates';
import type { Formulario } from '@/types/formulario';

import { ResponsesTable } from '../components/ResponsesTable';
import { FormDetailConfig } from '../components/FormDetailConfig';
import { FormDetailShare } from '../components/FormDetailShare';

const STATUS_LABELS: Record<string, string> = {
  nao_enviado: 'Rascunho',
  enviado: 'Enviado',
  respondido: 'Respondido',
  expirado: 'Expirado',
};

function FormStatusBadge({ status }: { status: string }) {
  const isAnswered = status === 'respondido';
  return (
    <Badge
      className={
        isAnswered
          ? 'bg-[hsl(var(--accent-gold))]/10 text-[hsl(var(--accent-gold))] border-[hsl(var(--accent-gold))]/20'
          : 'bg-muted text-muted-foreground border-border/50'
      }
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string | null;
}

function SummaryCard({ icon, label, value, hint }: SummaryCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span aria-hidden className="shrink-0">{icon}</span>
        <span className="text-[11px] uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className="text-lg font-semibold text-foreground leading-tight">
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}

function SummaryCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-12" />
    </div>
  );
}

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { formularios, isLoading: loadingForms } = useFormularios();
  const { templates } = useFormularioTemplates();
  const { data: respostas = [], isLoading: loadingRespostas } = useFormularioRespostas(id);

  /** Resolve o formulário a partir do id da rota. */
  const form = useMemo<Formulario | undefined>(
    () => formularios.find((f) => f.id === id),
    [formularios, id]
  );

  /** Categoria resolvida via template_id (Formulario não tem categoria própria). */
  const categoria = useMemo(() => {
    if (!form?.template_id) return null;
    return templates.find((t) => t.id === form.template_id)?.categoria ?? null;
  }, [form, templates]);

  const isLoadingPage = loadingForms;
  const isNotFound = !loadingForms && !form;

  const handleBack = useCallback(() => {
    navigate('/app/formularios');
  }, [navigate]);

  // ── Resumo derivado de dados reais ─────────────────────────────────────────
  const totalPerguntas = form?.campos.length ?? 0;
  const duracao = form?.tempo_estimado ?? 0;
  const totalRespostas = respostas.length;
  const ultimaResposta = respostas[0]?.submitted_at ?? form?.respondido_em ?? null;

  /** Mostra grid de cards somente quando o form está carregado. */
  const showSummary = !!form;

  if (isLoadingPage) {
    return (
      <div className={PAGE_SCROLL_SHELL}>
        <PageContainer className="py-4 pb-10">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SummaryCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (isNotFound || !form) {
    return (
      <div className={PAGE_SCROLL_SHELL}>
        <PageContainer className="py-4 pb-10">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <AlertCircle size={20} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Formulário não encontrado
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Este formulário pode ter sido excluído ou nunca ter existido.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/formularios">Voltar para formulários</Link>
            </Button>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className={PAGE_SCROLL_SHELL}>
      <PageContainer className="py-4 pb-10">
        <PageHeader
          title={form.titulo}
          description={form.descricao ?? undefined}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <Link to="/app/formularios">
                  <ArrowLeft size={14} strokeWidth={1.8} className="mr-1" />
                  Voltar
                </Link>
              </Button>
            </div>
          }
        />

        {/* Breadcrumb + metadados */}
        <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2 -mx-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-gold))]/40"
            aria-label="Voltar para lista de formulários"
          >
            <ArrowLeft size={12} strokeWidth={1.8} />
            Formulários
          </button>
          <span className="text-muted-foreground/50" aria-hidden>/</span>
          <span className="text-foreground font-medium truncate max-w-[40ch]" aria-current="page">
            {form.titulo}
          </span>
          <FormStatusBadge status={form.status_envio} />
          {categoria && (
            <Badge variant="outline" className="text-[10px]">
              {categoria}
            </Badge>
          )}
        </div>

        {/* Grid de resumo — cada card renderiza só se o dado existir */}
        {showSummary && (
          <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
            {/* Perguntas */}
            {totalPerguntas > 0 && (
              <SummaryCard
                icon={<LayoutGrid size={14} strokeWidth={1.8} />}
                label="Perguntas"
                value={totalPerguntas}
                hint={duracao > 0 ? `~${duracao} min` : null}
              />
            )}
            {/* Duração isolada quando há duração mas zero perguntas (raro) */}
            {totalPerguntas === 0 && duracao > 0 && (
              <SummaryCard
                icon={<Clock size={14} strokeWidth={1.8} />}
                label="Duração"
                value={`~${duracao} min`}
              />
            )}
            {/* Respostas */}
            {totalRespostas > 0 && (
              <SummaryCard
                icon={<MessageSquare size={14} strokeWidth={1.8} />}
                label="Respostas"
                value={totalRespostas}
                hint={
                  ultimaResposta
                    ? `Última ${formatDistanceToNow(new Date(ultimaResposta), {
                        addSuffix: true,
                        locale: ptBR,
                      })}`
                    : null
                }
              />
            )}
            {/* Status envio (controle) */}
            <SummaryCard
              icon={
                form.status_envio === 'enviado' ? (
                  <Send size={14} strokeWidth={1.8} />
                ) : form.status_envio === 'respondido' ? (
                  <MessageSquare size={14} strokeWidth={1.8} />
                ) : (
                  <FileText size={14} strokeWidth={1.8} />
                )
              }
              label="Status"
              value={STATUS_LABELS[form.status_envio] ?? form.status_envio}
              hint={
                form.enviado_em
                  ? `Enviado em ${format(new Date(form.enviado_em), 'dd MMM yyyy', { locale: ptBR })}`
                  : null
              }
            />
            {/* Categoria — só renderiza se houver */}
            {categoria && (
              <SummaryCard
                icon={<FileText size={14} strokeWidth={1.8} />}
                label="Categoria"
                value={categoria}
              />
            )}
            {/* Criado em — sempre presente (campo not null). */}
            <SummaryCard
              icon={<FileText size={14} strokeWidth={1.8} />}
              label="Criado em"
              value={format(new Date(form.created_at), 'dd MMM yyyy', { locale: ptBR })}
            />
          </div>
        )}

        {/* Tabs internas */}
        <Tabs defaultValue="respostas" className="w-full mt-8">
          <TabsList className={PAGE_TABS_LIST}>
            <TabsTrigger value="respostas" className={PAGE_TABS_TRIGGER}>
              Respostas
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className={PAGE_TABS_TRIGGER}>
              Configurações
            </TabsTrigger>
            <TabsTrigger value="compartilhamento" className={PAGE_TABS_TRIGGER}>
              Compartilhamento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="respostas" className={PAGE_TABS_CONTENT}>
            {loadingRespostas ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsesTable respostas={respostas} campos={form.campos} />
            )}
          </TabsContent>

          <TabsContent value="configuracoes" className={PAGE_TABS_CONTENT}>
            <FormDetailConfig form={form} />
          </TabsContent>

          <TabsContent value="compartilhamento" className={PAGE_TABS_CONTENT}>
            <FormDetailShare form={form} />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </div>
  );
}
