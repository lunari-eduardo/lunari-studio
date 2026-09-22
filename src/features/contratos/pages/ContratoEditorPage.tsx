import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useContratoTemplates } from '@/hooks/useContratoTemplates';
import { CONTRATO_SEED_TEMPLATES } from '@/utils/contratoSeedTemplates';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { ContratoEditorHeader, type SaveState } from '../components/editor/ContratoEditorHeader';
import { ContratoEditorSidebar, type ContratoSectionId } from '../components/editor/ContratoEditorSidebar';
import { ContratoEditorSectionInfo } from '../components/editor/ContratoEditorSectionInfo';
import { ContratoPaperCanvas, type ContratoPaperCanvasHandle } from '../components/editor/ContratoPaperCanvas';
import { ContratoEditorToolbar } from '../components/editor/ContratoEditorToolbar';
import { ContratoVariablesDrawer } from '../components/editor/ContratoVariablesDrawer';
import { ContratoEditorPreview } from '../components/editor/ContratoEditorPreview';
import { countVariables, estimateReadingTime } from '../utils/contratoMetrics';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { ContratoTemplate } from '@/types/contrato';

export default function ContratoEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const isCreating = !id;
  const seedSlug = searchParams.get('seedSlug');

  const { templates, isLoading, create, update } = useContratoTemplates();

  const [draft, setDraft] = useState<Partial<ContratoTemplate> | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<Partial<ContratoTemplate> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const [section, setSection] = useState<ContratoSectionId>('content');
  const [variablesDrawerOpen, setVariablesDrawerOpen] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const canvasRef = useRef<ContratoPaperCanvasHandle>(null);

  // Inicialização (novo rascunho ou a partir de seed)
  useEffect(() => {
    if (!isCreating) return;
    if (draft) return;

    if (seedSlug) {
      const seed = CONTRATO_SEED_TEMPLATES.find((s) => s.slug === seedSlug);
      if (seed) {
        const initialDraft: Partial<ContratoTemplate> = {
          nome: seed.nome,
          descricao: seed.descricao,
          categoria: seed.categoria,
          conteudo: seed.conteudo,
          is_padrao: false,
        };
        setDraft(initialDraft);
        setSavedSnapshot(null);
        return;
      }
    }

    const initialDraft: Partial<ContratoTemplate> = {
      nome: 'Novo modelo de contrato',
      descricao: '',
      categoria: 'geral',
      conteudo: '<h2>Contrato de Prestação de Serviços Fotográficos</h2>\n\n<p>Comece a redigir seu contrato ou insira variáveis da lista...</p>',
      is_padrao: false,
    };
    setDraft(initialDraft);
    setSavedSnapshot(null);
  }, [isCreating, seedSlug, draft]);

  // Carregar modelo existente para edição
  useEffect(() => {
    if (isCreating || !id) return;
    if (draft && draft.id === id) return;

    const found = templates.find((t) => t.id === id);
    if (found) {
      setDraft(found);
      setSavedSnapshot(found);
    }
  }, [id, templates, isCreating, draft]);

  // Detecção de dirty state
  const isDirty = useMemo(() => {
    if (!draft) return false;
    if (!savedSnapshot) {
      return Boolean(draft.nome?.trim() && draft.conteudo?.trim());
    }

    return (
      draft.nome !== savedSnapshot.nome ||
      draft.categoria !== savedSnapshot.categoria ||
      draft.descricao !== savedSnapshot.descricao ||
      draft.is_padrao !== savedSnapshot.is_padrao ||
      draft.conteudo !== savedSnapshot.conteudo
    );
  }, [draft, savedSnapshot]);

  useEffect(() => {
    if (!draft) return;
    if (saveState.kind === 'saving') return;
    if (isDirty) {
      setSaveState({ kind: 'dirty' });
    } else {
      setSaveState({ kind: 'saved' });
    }
  }, [isDirty, draft, saveState.kind]);

  useBeforeUnload(isDirty);

  // Inserção de variável no editor
  const handleInsertVariable = useCallback((key: string) => {
    if (canvasRef.current?.insertVariableAtCursor) {
      canvasRef.current.insertVariableAtCursor(key);
      return;
    }
    setDraft((prev) => {
      if (!prev) return prev;
      const current = (prev.conteudo || '').trimEnd();
      return { ...prev, conteudo: `${current} {{${key}}}` };
    });
  }, []);

  // Salvar modelo
  const handleSalvar = useCallback(async () => {
    if (!draft || !draft.nome?.trim() || !draft.conteudo?.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, informe o nome do modelo e o conteúdo do contrato.',
        variant: 'destructive',
      });
      return;
    }

    setSaveState({ kind: 'saving' });
    try {
      if (draft.id) {
        const updated = await update({
          id: draft.id,
          nome: draft.nome,
          descricao: draft.descricao || null,
          categoria: draft.categoria || 'geral',
          conteudo: draft.conteudo,
          is_padrao: draft.is_padrao || false,
        });
        setDraft(updated);
        setSavedSnapshot(updated);
        setSaveState({ kind: 'saved' });
        toast({ title: 'Modelo de contrato salvo com sucesso!' });
      } else {
        const created = await create({
          nome: draft.nome,
          descricao: draft.descricao || null,
          categoria: draft.categoria || 'geral',
          conteudo: draft.conteudo,
          is_padrao: draft.is_padrao || false,
        });
        setDraft(created);
        setSavedSnapshot(created);
        setSaveState({ kind: 'saved' });
        toast({ title: 'Modelo de contrato criado com sucesso!' });
        navigate(`/app/comercial/contratos/${created.id}/editor`, { replace: true });
      }
    } catch (err: any) {
      setSaveState({ kind: 'dirty' });
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    }
  }, [draft, update, create, navigate]);

  if (!draft && isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-2">
        <p className="text-sm text-muted-foreground">Modelo de contrato não encontrado.</p>
        <button
          onClick={() => navigate('/app/comercial/contratos')}
          className="text-xs text-primary underline"
        >
          Voltar para contratos
        </button>
      </div>
    );
  }

  // Se estiver no modo de pré-visualização, renderiza o componente de Preview dedicado
  if (isPreviewMode) {
    return (
      <ContratoEditorPreview
        draft={draft}
        onVoltar={() => setIsPreviewMode(false)}
        onSalvar={handleSalvar}
      />
    );
  }

  const varsCount = countVariables(draft.conteudo);
  const readingTime = estimateReadingTime(draft.conteudo);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header fixo no topo da página ── */}
      <ContratoEditorHeader
        draft={draft}
        onTituloChange={(nome) => setDraft({ ...draft, nome })}
        saveState={saveState}
        onVisualizar={() => setIsPreviewMode(true)}
        onSalvar={handleSalvar}
      />

      <div className="flex-1 min-h-0 overflow-y-auto py-6 px-2 md:px-4">
        <div className="mx-auto max-w-[92rem] flex gap-6 items-start">
          {/* ── Sidebar vertical de seções fixa (sticky) com scroll interno ── */}
          <div className="sticky top-[120px] h-[calc(100vh-128px)] overflow-y-auto hidden md:block">
            <ContratoEditorSidebar
              active={section}
              onChange={setSection}
              variablesCount={varsCount}
              readingTime={readingTime}
              isPadrao={draft.is_padrao}
            />
          </div>

          {/* ── Área Central / Conteúdo da Seção com rolagem da página ── */}
          <div className="flex-1 min-w-0 pb-16">
            {section === 'info' && (
              <ContratoEditorSectionInfo
                draft={draft}
                onChange={(patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
              />
            )}

            {section === 'content' && (
              <div className="flex gap-5 items-start">
                {/* Paper Canvas (Folha A4) que rola naturalmente com o conteúdo */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Toolbar fixa fora do paper canvas */}
                  <ContratoEditorToolbar
                    onExec={(cmd, arg) => {
                      canvasRef.current?.focus();
                      document.execCommand(cmd, false, arg);
                    }}
                    onFormatBlock={(tag) => {
                      canvasRef.current?.focus();
                      document.execCommand('formatBlock', false, `<${tag}>`);
                    }}
                    onToggleVariables={() => setVariablesDrawerOpen((prev) => !prev)}
                    variablesOpen={variablesDrawerOpen}
                    variablesCount={varsCount}
                    stickyTopClass="top-[68px]"
                  />
                  <ContratoPaperCanvas
                    ref={canvasRef}
                    value={draft.conteudo || ''}
                    onChange={(conteudo) => setDraft((prev) => (prev ? { ...prev, conteudo } : prev))}
                    hideToolbar
                    onToggleVariables={() => setVariablesDrawerOpen((prev) => !prev)}
                    variablesOpen={variablesDrawerOpen}
                    variablesCount={varsCount}
                  />
                </div>

                {/* Painel lateral de variáveis fixo (sticky) com scroll interno próprio */}
                {variablesDrawerOpen && (
                  <div className="w-80 shrink-0 sticky top-[120px] h-[calc(100vh-128px)] hidden xl:block">
                    <ContratoVariablesDrawer
                      conteudoHtml={draft.conteudo || ''}
                      onInsertVariable={handleInsertVariable}
                    />
                  </div>
                )}
              </div>
            )}

            {section === 'variables' && (
              <div className="max-w-4xl">
                <ContratoVariablesDrawer
                  conteudoHtml={draft.conteudo || ''}
                  onInsertVariable={handleInsertVariable}
                  className="h-[calc(100vh-160px)]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
