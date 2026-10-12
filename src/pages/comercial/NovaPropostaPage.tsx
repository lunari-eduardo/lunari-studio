import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, FileText, Image, LayoutTemplate, Loader2, Monitor, Sparkles, Smartphone, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeBlocks } from './blocks/normalization';
import { PROPOSAL_COLLECTIONS, templateCollection } from './blocks/collections';
import { ProposalDesignTokens } from './blocks/design';
import { VisualRenderer } from './components/editor/VisualRenderer';
import { TemplateCard } from './biblioteca/components/wizard/StepTemplateGallery';
import { useCreateMaterialWizard, useProposalTemplatePreview } from './biblioteca/hooks/useCreateMaterialWizard';
import type { AiRef, ProposalReferenceDraft } from './biblioteca/types';

const REFERENCE_ACCEPT = 'application/pdf,image/*,text/plain,text/markdown';

function getReferenceKind(file: File): AiRef['kind'] | null {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'text/plain' || file.type === 'text/markdown' || /\.(txt|md)$/i.test(file.name)) return 'text';
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

/**
 * Entrada para propostas nativas: a prévia sempre usa a composição real do
 * template selecionado. Nenhum dado demonstrativo é levado para a proposta
 * criada — essa limpeza continua centralizada no hidratador existente.
 */
export default function NovaPropostaPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [referenceDraft, setReferenceDraft] = useState<ProposalReferenceDraft | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const wizard = useCreateMaterialWizard({
    isOpen: true,
    onClose: () => navigate('/app/comercial/biblioteca'),
    initialCreationMethod: 'db-template',
  });

  const {
    selectedDbTemplate,
    setSelectedDbTemplate,
    selectedCategoria,
    setSelectedCategoria,
    customTitle,
    setCustomTitle,
    categorias,
    isLoadingCategorias,
    dbTemplates,
    isLoadingDbTemplates,
    handleCreate,
    isPendingCreate,
  } = wizard;

  // Etapa de decisão: modelos padrão ou uma coleção temática (ex.: Natal), pela tag do modelo
  const [collectionTab, setCollectionTab] = useState('');
  const collectionTabs = useMemo(
    () => [...new Set(dbTemplates.map((t) => templateCollection(t.tags)).filter((c): c is string => !!c))],
    [dbTemplates]
  );
  const visibleTemplates = dbTemplates.filter((t) => (templateCollection(t.tags) ?? '') === collectionTab);

  const templatePreview = useProposalTemplatePreview(selectedDbTemplate?.template_id);
  const previewBlocks = useMemo(
    () => normalizeBlocks(templatePreview.data?.blocks_json),
    [templatePreview.data?.blocks_json]
  );
  const previewTokens = useMemo(() => {
    if (templatePreview.data?.design_tokens) {
      return templatePreview.data.design_tokens as ProposalDesignTokens;
    }
    const settings = templatePreview.data?.blocks_json?.find(
      (block: any) => block?.type === 'global_settings'
    ) as { data?: { design_tokens?: ProposalDesignTokens } } | undefined;
    return settings?.data?.design_tokens as ProposalDesignTokens | undefined;
  }, [templatePreview.data]);

  const canCreate = Boolean(selectedDbTemplate && selectedCategoria && !isPendingCreate);

  const handleReferenceSelection = (file?: File) => {
    if (!file) return;
    const kind = getReferenceKind(file);
    if (!kind) {
      setReferenceError('Use um PDF, uma imagem ou um arquivo de texto.');
      return;
    }
    setReferenceError(null);
    setReferenceDraft({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      mime: file.type || 'application/octet-stream',
      kind,
      size: file.size,
    });
  };

  const removeReference = () => {
    setReferenceDraft(null);
    setReferenceError(null);
    if (referenceInputRef.current) referenceInputRef.current.value = '';
  };

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 mb-3 text-muted-foreground"
            onClick={() => navigate('/app/comercial/biblioteca')}
          >
            <ArrowLeft />
            Voltar à Biblioteca
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Criar proposta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha um modelo e adapte a experiência ao seu negócio.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 self-start sm:self-auto">
          <Button
            size="sm"
            variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
            aria-pressed={viewMode === 'desktop'}
            onClick={() => setViewMode('desktop')}
          >
            <Monitor />
            Desktop
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
            aria-pressed={viewMode === 'mobile'}
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone />
            Celular
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.22fr)]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-[0_8px_24px_rgba(0,0,0,.03)]">
          <div className="border-b border-border px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Etapa 1</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Escolha seu modelo</h2>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 custom-scrollbar">
            {collectionTabs.length > 0 && (
              <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1" role="tablist" aria-label="Tipo de modelo">
                {[{ key: '', label: 'Modelos padrão' }, ...collectionTabs.map((key) => ({ key, label: PROPOSAL_COLLECTIONS[key].label }))].map((tab) => (
                  <Button
                    key={tab.key || 'padrao'}
                    size="sm"
                    role="tab"
                    aria-selected={collectionTab === tab.key}
                    variant={collectionTab === tab.key ? 'secondary' : 'ghost'}
                    className="flex-1"
                    onClick={() => {
                      if (tab.key === collectionTab) return;
                      setCollectionTab(tab.key);
                      setSelectedDbTemplate(null); // a prévia nunca mostra um modelo de outra aba
                    }}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            )}

            {isLoadingDbTemplates ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-52 rounded-xl" />)}
              </div>
            ) : visibleTemplates.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
                <LayoutTemplate className="h-6 w-6" />
                Nenhum modelo está disponível agora.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {visibleTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    selected={selectedDbTemplate?.id === template.id}
                    onSelect={() => setSelectedDbTemplate(template)}
                  />
                ))}
              </div>
            )}

            <div className="space-y-4 border-t border-border pt-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Etapa 2</p>
                <h2 className="mt-1 text-base font-semibold text-foreground">Contexto da proposta</h2>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Categoria</label>
                {isLoadingCategorias ? (
                  <Skeleton className="h-11 w-full rounded-md" />
                ) : categorias.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                    Cadastre uma categoria antes de criar a proposta.
                  </p>
                ) : (
                  <Select
                    value={selectedCategoria?.id || ''}
                    onValueChange={(value) => setSelectedCategoria(categorias.find((category) => category.id === value) || null)}
                  >
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue placeholder="Escolha uma categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.cor || '#6b7280' }} />
                            {category.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nome da proposta <span className="font-normal text-muted-foreground">(opcional)</span>
                </label>
                <Input
                  value={customTitle}
                  onChange={(event) => setCustomTitle(event.target.value)}
                  placeholder={selectedCategoria ? `Ex: ${selectedCategoria.nome} — Maria Fernanda` : 'Escolha uma categoria primeiro'}
                  disabled={!selectedCategoria}
                />
                {selectedCategoria && (
                  <p className="text-xs text-muted-foreground">
                    Sem um nome personalizado, a proposta será chamada de <span className="font-medium text-foreground">{selectedCategoria.nome}</span>.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-6">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#C6A36A]" />
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Etapa 3 · Opcional</p>
                </div>
                <h2 className="mt-1 text-base font-semibold text-foreground">Referência para a IA</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Envie um material para orientar uma futura personalização da proposta.
                </p>
              </div>

              {referenceDraft ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {referenceDraft.kind === 'image' ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{referenceDraft.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {referenceDraft.kind === 'pdf' ? 'PDF' : referenceDraft.kind === 'image' ? 'Imagem' : 'Texto'} · {formatFileSize(referenceDraft.size)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={removeReference} aria-label="Remover arquivo de referência">
                    <X />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => referenceInputRef.current?.click()}
                  className="flex w-full flex-col items-center rounded-xl border border-dashed border-border bg-background px-5 py-6 text-center transition-colors hover:border-foreground/35 hover:bg-muted/40"
                >
                  <Upload className="mb-2 h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Adicionar arquivo de referência</span>
                  <span className="mt-1 text-xs leading-relaxed text-muted-foreground">PDF, imagem, TXT ou Markdown</span>
                </button>
              )}
              <input
                ref={referenceInputRef}
                type="file"
                accept={REFERENCE_ACCEPT}
                className="hidden"
                onChange={(event) => handleReferenceSelection(event.target.files?.[0])}
              />
              {referenceError && <p className="text-xs text-destructive">{referenceError}</p>}
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                Nesta fase, o arquivo fica somente neste navegador e não é enviado nem salvo. Quando a IA estiver ativa, você revisará e escolherá exatamente quais informações adicionar à proposta.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
            <Button variant="ghost" onClick={() => navigate('/app/comercial/biblioteca')}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!canCreate}>
              {isPendingCreate ? <><Loader2 className="animate-spin" />Criando...</> : <><Check />Criar proposta</>}
            </Button>
          </div>
        </section>

        <section className="min-h-[580px] overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-[0_8px_24px_rgba(0,0,0,.03)] xl:sticky xl:top-4 xl:max-h-[calc(100dvh-7rem)]">
          <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Prévia do modelo</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedDbTemplate ? selectedDbTemplate.name : 'Selecione um modelo para visualizar'}
              </p>
            </div>
            {selectedDbTemplate && <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Ao vivo</span>}
          </div>

          <div className="h-[calc(100%-4.25rem)] overflow-y-auto custom-scrollbar">
            {!selectedDbTemplate ? (
              <div className="flex h-full min-h-[510px] flex-col items-center justify-center px-8 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm">
                  <LayoutTemplate className="h-6 w-6" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Veja a proposta antes de criar</h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  A prévia mostra a estrutura, o tema e todos os blocos reais de cada modelo.
                </p>
              </div>
            ) : templatePreview.isLoading ? (
              <div className="flex min-h-[510px] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Preparando prévia…
              </div>
            ) : templatePreview.isError || previewBlocks.length === 0 ? (
              <div className="flex min-h-[510px] flex-col items-center justify-center px-8 text-center">
                <p className="text-sm font-medium text-foreground">Não foi possível renderizar este modelo.</p>
                <p className="mt-1 text-sm text-muted-foreground">Escolha outro modelo ou tente novamente.</p>
              </div>
            ) : (
              <VisualRenderer
                blocks={previewBlocks}
                activeIndex={-1}
                onSelectBlock={() => undefined}
                mode="public"
                viewMode={viewMode}
                designTokens={previewTokens}
                onCtaClick={() => undefined}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
