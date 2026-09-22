import { useState, useMemo } from 'react';
import { ArrowLeft, Sparkles, Printer, CheckCircle2, User, Camera, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { interpolateContractPreview, MOCK_CONTRACT_DATA } from '../../utils/mockContratoData';
import { cn } from '@/lib/utils';
import type { ContratoTemplate } from '@/types/contrato';

interface ContratoEditorPreviewProps {
  draft: Partial<ContratoTemplate>;
  onVoltar: () => void;
  onSalvar?: () => void;
}

export function ContratoEditorPreview({
  draft,
  onVoltar,
  onSalvar,
}: ContratoEditorPreviewProps) {
  const [highlightVars, setHighlightVars] = useState(true);

  // Interpola o HTML com os dados simulados
  const htmlRenderizado = useMemo(() => {
    return interpolateContractPreview(draft.conteudo || '', highlightVars);
  }, [draft.conteudo, highlightVars]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/20 animate-in fade-in duration-200">
      {/* ── Cabeçalho Fixo do Preview ── */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onVoltar}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={14} />
              Voltar ao editor
            </Button>
            <div className="h-4 w-px bg-border/80 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">
                {draft.nome || 'Modelo de contrato'}
              </h1>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles size={11} className="text-[hsl(var(--accent-gold))]" />
                Modo Pré-visualização com dados simulados
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Toggle de destaque de variáveis */}
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-1 rounded-full border border-border/60">
              <Switch
                id="highlight-vars"
                checked={highlightVars}
                onCheckedChange={setHighlightVars}
                className="scale-90"
              />
              <Label
                htmlFor="highlight-vars"
                className="text-xs cursor-pointer text-muted-foreground select-none"
              >
                Destacar variáveis
              </Label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs hidden md:inline-flex"
            >
              <Printer size={13} />
              Imprimir
            </Button>

            {onSalvar && (
              <Button
                size="sm"
                onClick={onSalvar}
                className="h-8 text-xs bg-[hsl(var(--accent-gold))] hover:bg-[hsl(var(--accent-gold))]/90 text-primary-foreground font-medium"
              >
                Salvar modelo
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Corpo com Painel Lateral Fixo e Folha Central de Rolagem ── */}
      <div className="mx-auto max-w-7xl w-full px-4 md:px-6 py-6 flex gap-6 items-start">
        {/* Painel Lateral Fixo (Sticky): Dados de Simulação */}
        <aside className="w-72 shrink-0 sticky top-[68px] hidden lg:block space-y-3">
          <div className="p-4 rounded-xl border border-border/70 bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Dados Simulados
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                Ativo
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <User size={14} className="mt-0.5 text-primary shrink-0" />
                <div>
                  <div className="font-medium text-foreground">{MOCK_CONTRACT_DATA.nome_cliente}</div>
                  <div className="text-[11px]">CPF: {MOCK_CONTRACT_DATA.cpf_cliente}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Camera size={14} className="mt-0.5 text-amber-500 shrink-0" />
                <div>
                  <div className="font-medium text-foreground">{MOCK_CONTRACT_DATA.nome_fotografo}</div>
                  <div className="text-[11px]">{MOCK_CONTRACT_DATA.cidade_fotografo}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar size={14} className="mt-0.5 text-blue-500 shrink-0" />
                <div>
                  <div className="font-medium text-foreground">{MOCK_CONTRACT_DATA.tipo_ensaio}</div>
                  <div className="text-[11px]">{MOCK_CONTRACT_DATA.data_sessao} às {MOCK_CONTRACT_DATA.horario_sessao}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <DollarSign size={14} className="mt-0.5 text-emerald-500 shrink-0" />
                <div>
                  <div className="font-medium text-foreground">{MOCK_CONTRACT_DATA.valor_total}</div>
                  <div className="text-[11px]">Sinal: {MOCK_CONTRACT_DATA.valor_sinal}</div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground/80 leading-relaxed">
              Estes dados de exemplo demonstram a renderização final do contrato antes do envio para assinatura.
            </div>
          </div>
        </aside>

        {/* ── Folha Central de Papel (Rolagem natural na página) ── */}
        <main className="flex-1 min-w-0 flex justify-center pb-16">
          <div className="w-full max-w-4xl bg-card border border-border/80 rounded-2xl shadow-[0_4px_35px_rgba(0,0,0,0.12)] p-8 sm:p-12 md:p-16">
            {/* Cabeçalho Formal do Documento */}
            <div className="border-b border-border/60 pb-6 mb-8 text-center space-y-1">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                Documento de Prestação de Serviços
              </span>
              <h2 className="text-xl font-bold text-foreground">
                {draft.nome || 'Contrato de Prestação de Serviços Fotográficos'}
              </h2>
            </div>

            {/* Conteúdo Renderizado do Contrato */}
            <div
              className={cn(
                'contrato-preview-document text-[13.5px] text-foreground leading-relaxed',
                '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-foreground [&_h1]:tracking-tight',
                '[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2.5 [&_h2]:text-foreground [&_h2]:border-b [&_h2]:border-border/40 [&_h2]:pb-1.5',
                '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-foreground',
                '[&_p]:my-2.5 [&_p]:text-foreground/90 [&_p]:leading-relaxed',
                '[&_strong]:font-semibold [&_strong]:text-foreground',
                '[&_em]:italic',
                '[&_u]:underline',
                '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3',
                '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3',
                '[&_li]:my-1.5 [&_li]:text-foreground/90',
                '[&_hr]:my-6 [&_hr]:border-border/60',
                '[&_blockquote]:border-l-4 [&_blockquote]:border-[hsl(var(--accent-gold))] [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4 [&_blockquote]:bg-muted/20 [&_blockquote]:rounded-r'
              )}
              dangerouslySetInnerHTML={{ __html: htmlRenderizado }}
            />

            {/* Bloco Formal de Assinaturas */}
            <div className="mt-16 pt-10 border-t border-border/60 space-y-12">
              <div className="text-center text-xs text-muted-foreground">
                Por estarem justos e contratados, assinam eletronicamente o presente instrumento.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-4">
                {/* Assinatura Contratada */}
                <div className="text-center space-y-2">
                  <div className="border-b border-border/80 w-3/4 mx-auto" />
                  <div className="font-semibold text-xs text-foreground">
                    {MOCK_CONTRACT_DATA.nome_fotografo}
                  </div>
                  <div className="text-[11px] text-muted-foreground">CONTRATADA(O)</div>
                </div>

                {/* Assinatura Contratante */}
                <div className="text-center space-y-2">
                  <div className="border-b border-border/80 w-3/4 mx-auto" />
                  <div className="font-semibold text-xs text-foreground">
                    {MOCK_CONTRACT_DATA.nome_cliente}
                  </div>
                  <div className="text-[11px] text-muted-foreground">CONTRATANTE</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
