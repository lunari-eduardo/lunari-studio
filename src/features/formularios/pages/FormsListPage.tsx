/**
 * FormsListPage — página principal de gestão de formulários.
 *
 * Escopo fases 1-3:
 *  • Shell com header, tabs "Meus formulários" | "Biblioteca Lunari" e toolbar.
 *  • Listagem de formulários reais com FormCard (comportamento hover/menu •••).
 *  • Listagem de templates da biblioteca com TemplateCard (CTA dourado "Usar modelo").
 *  • Estado vazio ilustrativo para cada aba.
 *  • "+ Novo formulário" abre FormularioTemplateEditor (criação de template).
 *
 * FORA DO ESCOPO DESTA ETAPA:
 *  • Tela/editor de edição de formulário (vai para fase seguinte).
 *  • Página de detalhes / respostas (vai para fase seguinte).
 */
import { useState, useMemo, useCallback } from 'react';
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
import FormularioTemplateEditor from '@/components/configuracoes/FormularioTemplateEditor';
import type { FormularioTemplate } from '@/types/formulario';
import { toast } from '@/hooks/use-toast';

function EmptyMeusFormularios() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText size={20} className="text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Nenhum formulário criado ainda
      </h3>
      <p className="text-xs text-muted-foreground max-w-xs">
        Envie briefings aos seus clientes pela aba <strong>Clientes</strong> para
        que eles apareçam aqui.
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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('todas');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormularioTemplate | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { formularios, isLoading: loadingForms } = useFormularios();
  const { templates, isLoading: loadingTemplates, createTemplate } = useFormularioTemplates();

  // ── Filtro client-side ───────────────────────────────────────────────────────
  const filteredFormularios = useMemo(() => {
    const q = search.trim().toLowerCase();
    return formularios.filter((f) => {
      const matchSearch =
        !q ||
        f.titulo.toLowerCase().includes(q) ||
        (f.cliente?.nome?.toLowerCase().includes(q) ?? false) ||
        (f.descricao?.toLowerCase().includes(q) ?? false);
      const matchCategory =
        categoryFilter === 'todas' ||
        (f as any).categoria?.toLowerCase() === categoryFilter.toLowerCase();
      return matchSearch && matchCategory;
    });
  }, [formularios, search, categoryFilter]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter(
      (t) =>
        (!q ||
          t.nome.toLowerCase().includes(q) ||
          t.categoria.toLowerCase().includes(q) ||
          (t.descricao?.toLowerCase().includes(q) ?? false)) &&
        (categoryFilter === 'todas' ||
          t.categoria.toLowerCase() === categoryFilter.toLowerCase())
    );
  }, [templates, search, categoryFilter]);

  // ── Ações ───────────────────────────────────────────────────────────────────
  /** Abre o editor de template para criação de um novo. */
  const handleNewForm = useCallback(() => {
    setEditingTemplate(null);
    setEditorOpen(true);
  }, []);

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
        setActiveTab('meus');
      } catch {
        // erro tratado pelo hook via toast
      }
    },
    [createTemplate]
  );

  // ── Render ───────────────────────────────────────────────────────────────────
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
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
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
          ) : filteredFormularios.length === 0 && !search && categoryFilter === 'todas' ? (
            /* Estado inicial com CTA */
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CreateFormCard onClick={handleNewForm} />
            </div>
          ) : filteredFormularios.length === 0 ? (
            /* Estado vazio com filtro ativo */
            <EmptyMeusFormularios />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFormularios.map((form) => (
                <FormCard key={form.id} form={form} />
              ))}
              {/* CTA para criar novo formulário */}
              <CreateFormCard onClick={handleNewForm} />
            </div>
          )}
        </TabsContent>

        {/* ── Biblioteca Lunari ── */}
        <TabsContent value="biblioteca" className="mt-6">
          {loadingTemplates ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <TemplateCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredTemplates.length === 0 && !search ? (
            <EmptyBiblioteca />
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
