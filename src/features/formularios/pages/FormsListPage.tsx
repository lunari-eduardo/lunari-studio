/**
 * FormsListPage — página principal de gestão de formulários.
 *
 * Escopo fases 1-4:
 *  • Shell com header, tabs "Meus formulários" | "Biblioteca Lunari" e toolbar.
 *  • Aba "Meus" usa FormCard (imagem de capa, badge de categoria, métricas).
 *  • Aba "Biblioteca" usa TemplateCard + linha horizontal de chips por categoria
 *    (categorias derivadas dos templates do banco — sem mock).
 *  • CTA "Criar novo formulário" sempre visível como último card da grid em "Meus".
 *  • Filtros client-side: busca + categoria (chips na Biblioteca, select nos Meus).
 *
 * FORA DO ESCOPO DESTA ETAPA:
 *  • Tela de detalhes do formulário (Fase 5).
 *  • Tabela de respostas (Fase 6).
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { PAGE_SCROLL_SHELL } from '@/components/layout/PageTabs';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { PAGE_TABS_LIST } from '@/components/layout/PageTabs';
import { useFormularios } from '@/hooks/useFormularios';
import { useFormularioTemplates } from '@/hooks/useFormularioTemplates';
import { FormToolbar, type CategoryFilter } from '../components/FormToolbar';
import { FormCard, FormCardSkeleton } from '../components/FormCard';
import { TemplateCard, TemplateCardSkeleton } from '../components/TemplateCard';
import { CreateFormCard } from '../components/CreateFormCard';
import { CategoryChips } from '../components/CategoryChips';
import FormularioTemplateEditor from '@/components/configuracoes/FormularioTemplateEditor';
import type { FormularioTemplate } from '@/types/formulario';
import { toast } from '@/hooks/use-toast';

function EmptyBusca({ termo }: { termo: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText size={20} className="text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Nenhum resultado encontrado
      </h3>
      <p className="text-xs text-muted-foreground max-w-xs">
        Não encontramos nada para &quot;<strong>{termo}</strong>&quot;. Tente outro termo.
      </p>
    </div>
  );
}

function EmptyBiblioteca() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText size={20} className="text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Biblioteca de templates vazia
      </h3>
      <p className="text-xs text-muted-foreground max-w-xs">
        Os templates aparecerão aqui assim que forem configurados.
      </p>
    </div>
  );
}

export default function FormsListPage() {
  // ── Estado ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'meus' | 'biblioteca'>('meus');
  const [search, setSearch] = useState('');
  /** Filtro de categoria da aba "Meus" (select). */
  const [myCategoryFilter, setMyCategoryFilter] = useState<CategoryFilter>('todas');
  /** Filtro de categoria da aba "Biblioteca" (chips). */
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<string>('todas');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormularioTemplate | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { formularios, isLoading: loadingForms } = useFormularios();
  const { templates, isLoading: loadingTemplates, createTemplate } = useFormularioTemplates();

  // ── Filtro client-side ───────────────────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      const matchSearch =
        !q ||
        t.nome.toLowerCase().includes(q) ||
        t.categoria.toLowerCase().includes(q) ||
        (t.descricao?.toLowerCase().includes(q) ?? false);
      const matchCategory =
        libraryCategoryFilter === 'todas' ||
        t.categoria === libraryCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [templates, search, libraryCategoryFilter]);

  /** Categorias únicas dos templates referenciados pelos formulários do usuário.
   *  `Formulario` não tem campo `categoria` próprio — a categoria vem do template
   *  origem (`template_id`). Exibimos apenas categorias que existem no banco. */
  const myCategories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) if (t.categoria) set.add(t.categoria);
    return Array.from(set);
  }, [templates]);

  /** Map template_id → categoria para lookup O(1) no filtro dos formulários. */
  const templateCategoriaById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of templates) m.set(t.id, t.categoria);
    return m;
  }, [templates]);

  /** Filtro client-side dos "Meus formulários" — busca + categoria do template. */
  const filteredFormularios = useMemo(() => {
    const q = search.trim().toLowerCase();
    return formularios.filter((f) => {
      const matchSearch =
        !q ||
        f.titulo.toLowerCase().includes(q) ||
        (f.cliente?.nome?.toLowerCase().includes(q) ?? false) ||
        (f.descricao?.toLowerCase().includes(q) ?? false);
      const formCategoria = f.template_id
        ? templateCategoriaById.get(f.template_id)
        : undefined;
      const matchCategory =
        myCategoryFilter === 'todas' ||
        formCategoria?.toLowerCase() === myCategoryFilter.toLowerCase();
      return matchSearch && matchCategory;
    });
  }, [formularios, search, myCategoryFilter, templateCategoriaById]);

  // ── Ações ───────────────────────────────────────────────────────────────────
  const navigate = useNavigate();

  /** Abre a nova página de editor de formulário (criação do zero).
   *  O modal `FormularioTemplateEditor` continua sendo usado para editar
   *  templates em Configurações (comportamento preservado). */
  const handleNewForm = useCallback(() => {
    navigate('/app/formularios/novo');
  }, [navigate]);

  /** Clona um template da biblioteca para a biblioteca do usuário. */
  const handleUseTemplate = useCallback(
    async (template: FormularioTemplate) => {
      try {
        await createTemplate({
          nome: `${template.nome} (cópia)`,
          categoria: template.categoria,
          descricao: template.descricao ?? undefined,
          campos: template.campos,
          tempo_estimado: template.tempo_estimado,
        });
        toast({ title: `"${template.nome}" adicionado à sua biblioteca.` });
      } catch {
        // erro tratado pelo hook via toast
      }
    },
    [createTemplate]
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  const searchTerm = search.trim();

  return (
    <div className={PAGE_SCROLL_SHELL}>
      <PageContainer className="py-4 pb-10">
        <PageHeader
        title="Formulários"
        description="Crie formulários para conhecer melhor seus clientes antes de cada sessão."
      />

      {/* Tabs — estrutura padrão com PAGE_TABS_LIST */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="mt-4"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList className={PAGE_TABS_LIST}>
            <TabsTrigger value="meus" className="gap-1.5 text-[13px]">
              Meus formulários
              {!loadingForms && formularios.length > 0 && (
                <span className="ml-0.5 text-[11px] text-muted-foreground">
                  ({formularios.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="biblioteca" className="gap-1.5 text-[13px]">
              Biblioteca Lunari
              {!loadingTemplates && templates.length > 0 && (
                <span className="ml-0.5 text-[11px] text-muted-foreground">
                  ({templates.length})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Toolbar — à direita das tabs */}
          <div className="flex-1 min-w-0 flex justify-end">
            <FormToolbar
              search={search}
              onSearchChange={setSearch}
              categoryFilter={myCategoryFilter}
              onCategoryFilterChange={setMyCategoryFilter}
              availableCategories={myCategories}
            />
          </div>
        </div>

        {/* ── Meus formulários ── */}
        <TabsContent value="meus" className="mt-6">
          {loadingForms ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <FormCardSkeleton key={i} />
              ))}
            </div>
          ) : formularios.length === 0 ? (
            /* Estado inicial: zero formulários → CTA card apenas */
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CreateFormCard onClick={handleNewForm} />
            </div>
          ) : filteredFormularios.length === 0 ? (
            /* Filtros/busca não retornaram nada */
            <EmptyBusca termo={searchTerm || myCategoryFilter} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFormularios.map((form) => (
                <FormCard key={form.id} form={form} />
              ))}
              {/* CTA para criar novo formulário sempre presente */}
              <CreateFormCard onClick={handleNewForm} />
            </div>
          )}
        </TabsContent>

        {/* ── Biblioteca Lunari ── */}
        <TabsContent value="biblioteca" className="mt-6">
          {/* Subtítulo + chips horizontais (categorias derivadas do banco) */}
          <div className="space-y-3 mb-6">
            <p className="text-xs text-muted-foreground">
              Modelos prontos e validados para fotógrafos começarem rapidamente.
            </p>
            {!loadingTemplates && templates.length > 0 && (
              <CategoryChips
                templates={templates}
                active={libraryCategoryFilter}
                onChange={setLibraryCategoryFilter}
              />
            )}
          </div>

          {loadingTemplates ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <TemplateCardSkeleton key={i} />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <EmptyBiblioteca />
          ) : filteredTemplates.length === 0 ? (
            <EmptyBusca termo={searchTerm || libraryCategoryFilter} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUseTemplate={handleUseTemplate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Editor de template (criação/edição de template) */}
      <FormularioTemplateEditor
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
      />
      </PageContainer>
    </div>
  );
}
