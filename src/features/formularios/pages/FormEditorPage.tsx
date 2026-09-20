/**
 * FormEditorPage — página dedicada de criação e edição de formulários.
 *
 * Substitui o antigo `FormularioTemplateEditor` (modal). Layout:
 *
 *  ┌────────────────────────────────────────────────────────────┐
 *  │ FormEditorHeader  (← Formulários, título, ações)            │
 *  ├──────────────┬─────────────────────────────┬───────────────┤
 *  │              │                             │               │
 *  │   Sidebar    │  Seção ativa                │   Preview     │
 *  │   (seções)   │  (info / questions / exp)   │  (live)       │
 *  │              │                             │               │
 *  └──────────────┴─────────────────────────────┴───────────────┘
 *
 * Responsividade (regra 28-29 do brief):
 *  - ≥lg: três colunas (sidebar + editor + preview).
 *  - md a lg: duas colunas (sidebar + editor), preview abre em painel.
 *  - <md: empilhado. Sidebar vira tabs horizontais no topo; preview abre
 *    como painel separado.
 *
 * Persistência:
 *  - `Salvar` no header faz update do draft (PUT formulario) e define
 *    `status = 'publicado'` — todo formulário salvo fica acessível em `/f/{token}`.
 *  - Autosave não foi implementado (regra 20 — não criar autosave falso).
 *  - useBeforeUnload protege contra perda ao fechar/refresh.
 *
 * Criação (regra 21):
 *  - Quando a rota é `/app/formularios/novo`, criamos um rascunho no mount.
 *  - Quando a rota é `/app/formularios/:id/editor`, abrimos o existente.
 *  - Quando vier via "?templateId=<id>", clonamos os campos do template.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';

import { useFormularios } from '@/hooks/useFormularios';
import { useFormularioTemplates } from '@/hooks/useFormularioTemplates';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/useIsTablet';
import { useBeforeUnload } from './useBeforeUnload';
import { formulariosAreEqual } from './utils';

import { FormEditorHeader, type SaveState } from '../components/editor/FormEditorHeader';
import { FormEditorSidebar, type SectionId } from '../components/editor/FormEditorSidebar';
import { FormEditorSectionInfo } from '../components/editor/FormEditorSectionInfo';
import { FormEditorSectionQuestions } from '../components/editor/FormEditorSectionQuestions';
import { FormEditorSectionExperience } from '../components/editor/FormEditorSectionExperience';
import { FormEditorPreview } from '../components/editor/FormEditorPreview';

import type { Formulario } from '@/types/formulario';

export default function FormEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const isCreating = !id;
  const templateId = searchParams.get('templateId');

  const { formularios, isLoading, createFormulario, updateFormulario, isCreating: isCreatingMut, isUpdating } =
    useFormularios();
  // Renomeia para evitar colisão de nomes com a flag local `isCreating`
  // (rota "/novo" implica criação; `createPending` reflete a mutation em voo).
  const createPending = isCreatingMut;
  const updatePending = isUpdating;
  const { templates } = useFormularioTemplates();

  const [draft, setDraft] = useState<Formulario | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<Formulario | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const [section, setSection] = useState<SectionId>('info');
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Criação inicial ───────────────────────────────────────────────────────
  const initializingRef = useRef(false);
  useEffect(() => {
    if (!isCreating) return;
    if (draft || initializingRef.current) return;
    initializingRef.current = true;

    const template = templateId
      ? templates.find((t) => t.id === templateId)
      : null;

    createFormulario({
      titulo: template ? `${template.nome} (cópia)` : 'Sem título',
      descricao: template?.descricao ?? null,
      campos: template?.campos ?? [],
      mensagem_conclusao:
        'Obrigada por responder! Vamos te enviar mais detalhes em breve.',
      tempo_estimado: template?.tempo_estimado ?? 3,
      template_id: template?.id,
      cover_url: template?.cover_url || null,
    })
      .then((created) => {
        // Redireciona para a rota com id, mantendo o templateId se houver.
        const search = templateId ? `?templateId=${templateId}` : '';
        navigate(`/app/formularios/${created.id}/editor${search}`, {
          replace: true,
        });
      })
      .catch(() => {
        // Erro já toastado pelo hook
        navigate('/app/formularios');
      });
  }, [isCreating, templateId, templates, draft, createFormulario, navigate]);

  // ── Carregar formulário existente ─────────────────────────────────────────
  useEffect(() => {
    if (isCreating) return;
    if (!id) return;
    if (draft && draft.id === id) return;
    const found = formularios.find((f) => f.id === id);
    if (found) {
      setDraft(found);
      setSavedSnapshot(found);
    }
  }, [id, formularios, isCreating, draft]);

  // ── Detectar alterações ───────────────────────────────────────────────────
  const isDirty = useMemo(() => {
    if (!draft || !savedSnapshot) return false;
    if (draft.titulo !== savedSnapshot.titulo) return true;
    if (draft.titulo_cliente !== savedSnapshot.titulo_cliente) return true;
    if (draft.descricao !== savedSnapshot.descricao) return true;
    if (draft.mensagem_conclusao !== savedSnapshot.mensagem_conclusao) return true;
    if (draft.tempo_estimado !== savedSnapshot.tempo_estimado) return true;
    if (draft.expires_at !== savedSnapshot.expires_at) return true;
    if (draft.cover_url !== savedSnapshot.cover_url) return true;
    if (!formulariosAreEqual(draft.campos, savedSnapshot.campos)) return true;
    return false;
  }, [draft, savedSnapshot]);

  // Atualiza saveState com base no isDirty
  useEffect(() => {
    if (!draft || !savedSnapshot) return;
    if (saveState.kind === 'saving') return; // não muda enquanto salva
    if (isDirty) {
      setSaveState({ kind: 'dirty' });
    } else {
      setSaveState({ kind: 'saved' });
    }
  }, [isDirty, draft, savedSnapshot, saveState.kind]);

  useBeforeUnload(isDirty);

  // ── Mutations ─────────────────────────────────────────────────────────────
  // Salvar define status = 'publicado' para que o formulário fique acessível
  // na URL pública (/f/{token}) imediatamente após salvar.
  const handleSalvar = useCallback(async () => {
    if (!draft) return;
    setSaveState({ kind: 'saving' });
    try {
      const updated = await updateFormulario({
        id: draft.id,
        updates: {
          status: 'publicado',
          titulo: draft.titulo,
          titulo_cliente: draft.titulo_cliente,
          descricao: draft.descricao,
          mensagem_conclusao: draft.mensagem_conclusao,
          tempo_estimado: draft.tempo_estimado,
          expires_at: draft.expires_at,
          cover_url: draft.cover_url,
          campos: draft.campos,
        },
      });
      if (updated) {
        setDraft(updated);
        setSavedSnapshot(updated);
      } else {
        setDraft({ ...draft, status: 'publicado' });
        setSavedSnapshot({ ...draft, status: 'publicado' });
      }
      setSaveState({ kind: 'saved' });
    } catch {
      setSaveState({ kind: 'dirty' });
    }
  }, [draft, updateFormulario]);

  // ── Handlers do editor ────────────────────────────────────────────────────
  const updateDraft = useCallback((updates: Partial<Formulario>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const requiredCount = draft?.campos.filter((c) => c.obrigatorio).length ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────
  if (isCreating || !draft) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isCreating ? 'Preparando novo formulário...' : 'Carregando formulário...'}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sectionContent = (
    <>
      {section === 'info' && (
        <FormEditorSectionInfo draft={draft} onChange={updateDraft} />
      )}
      {section === 'questions' && (
        <FormEditorSectionQuestions draft={draft} onChange={updateDraft} />
      )}
      {section === 'experience' && (
        <FormEditorSectionExperience draft={draft} onChange={updateDraft} />
      )}
    </>
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      <FormEditorHeader
        draft={draft}
        onTituloChange={(v) => updateDraft({ titulo: v })}
        saveState={saveState}
        onVisualizar={() => setPreviewOpen(true)}
        onSalvar={handleSalvar}
      />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar (desktop) ou tabs horizontais (mobile/tablet estreito) */}
        {!isMobile ? (
          <FormEditorSidebar
            active={section}
            onChange={setSection}
            questionsCount={draft.campos.length}
            requiredCount={requiredCount}
          />
        ) : (
          <SectionTabs
            active={section}
            onChange={setSection}
            questionsCount={draft.campos.length}
            requiredCount={requiredCount}
          />
        )}

        {/* Conteúdo principal: nunca rola a página. Cada seção tem
            seu próprio container com scroll interno quando preciso. */}
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <PageContainer className="h-full py-6 pb-6 max-w-[79rem] flex flex-col">
            {sectionContent}
          </PageContainer>
        </main>

        {/* Preview (apenas desktop): 50% da largura disponível */}
        {!isMobile && !isTablet && (
          <aside className="w-1/2 shrink-0 border-l bg-background hidden lg:flex flex-col min-h-0 overflow-hidden">
            <FormEditorPreview draft={draft} />
          </aside>
        )}
      </div>

      {/* Mobile/tablet: preview como painel sobreposto */}
      {(isMobile || isTablet) && previewOpen && (
        <MobilePreviewOverlay
          draft={draft}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function SectionTabs({
  active,
  onChange,
  questionsCount,
  requiredCount,
}: {
  active: SectionId;
  onChange: (s: SectionId) => void;
  questionsCount: number;
  requiredCount: number;
}) {
  const items: { id: SectionId; label: string }[] = [
    { id: 'info', label: 'Informações' },
    { id: 'questions', label: 'Perguntas' },
    { id: 'experience', label: 'Experiência' },
  ];
  return (
    <div className="border-b bg-background sticky top-[88px] z-20">
      <nav className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {items.map(({ id, label }) => {
          const isActive = id === active;
          const hint =
            id === 'questions' && questionsCount > 0
              ? ` (${questionsCount}${requiredCount > 0 ? ` · ${requiredCount}` : ''})`
              : '';
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={
                'px-3 py-1.5 text-sm rounded-md whitespace-nowrap ' +
                (isActive
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/60')
              }
              aria-current={isActive ? 'page' : undefined}
            >
              {label}
              {hint}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function MobilePreviewOverlay({
  draft,
  onClose,
}: {
  draft: Formulario;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">Preview do formulário</span>
        <Button variant="outline" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <FormEditorPreview draft={draft} />
      </div>
    </div>
  );
}
