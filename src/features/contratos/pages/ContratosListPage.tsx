import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, PackagePlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { PAGE_SCROLL_SHELL } from '@/components/layout/PageTabs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PAGE_TABS_LIST } from '@/components/layout/PageTabs';
import { Button } from '@/components/ui/button';
import { useContratoTemplates } from '@/hooks/useContratoTemplates';
import { CONTRATO_SEED_TEMPLATES, type ContratoSeedTemplate } from '@/utils/contratoSeedTemplates';
import { ContratoToolbar, type CategoryFilter } from '../components/ContratoToolbar';
import { ContratoCard, ContratoCardSkeleton } from '../components/ContratoCard';
import { TemplateCard } from '../components/TemplateCard';
import { CreateContratoCard } from '../components/CreateContratoCard';
import { CategoryChips } from '../components/CategoryChips';
import { ContratoPreviewModal } from '../components/ContratoPreviewModal';
import { useContratoActions } from '../hooks/useContratoActions';
import type { ContratoTemplate } from '@/types/contrato';
import { toast } from '@/hooks/use-toast';

const normalize = (s?: string | null) =>
  (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();

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
        Não encontramos nada para &quot;<strong>{termo}</strong>&quot;. Tente outro termo ou categoria.
      </p>
    </div>
  );
}

export default function ContratosListPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'meus' | 'biblioteca'>('meus');
  const [search, setSearch] = useState('');
  const [myCategoryFilter, setMyCategoryFilter] = useState<CategoryFilter>('todas');
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<string>('todas');

  const [previewingSeed, setPreviewingSeed] = useState<ContratoSeedTemplate | null>(null);
  const [bulkAdding, setBulkAdding] = useState(false);

  const { templates, isLoading, create } = useContratoTemplates();
  const { useSeed } = useContratoActions();

  // Categorias distintas presentes nos templates do usuário
  const myCategories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) {
      if (t.categoria) set.add(t.categoria);
    }
    return Array.from(set);
  }, [templates]);

  // Filtro de "Meus modelos"
  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      const matchSearch =
        !q ||
        t.nome.toLowerCase().includes(q) ||
        (t.categoria?.toLowerCase().includes(q) ?? false) ||
        (t.descricao?.toLowerCase().includes(q) ?? false);
      const matchCategory =
        myCategoryFilter === 'todas' ||
        t.categoria?.toLowerCase() === myCategoryFilter.toLowerCase();
      return matchSearch && matchCategory;
    });
  }, [templates, search, myCategoryFilter]);

  // Filtro da "Biblioteca Lunari"
  const filteredSeeds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CONTRATO_SEED_TEMPLATES.filter((s) => {
      const matchSearch =
        !q ||
        s.nome.toLowerCase().includes(q) ||
        s.categoria.toLowerCase().includes(q) ||
        s.descricao.toLowerCase().includes(q);
      const matchCategory =
        libraryCategoryFilter === 'todas' ||
        s.categoria.toLowerCase() === libraryCategoryFilter.toLowerCase();
      return matchSearch && matchCategory;
    });
  }, [search, libraryCategoryFilter]);

  // Seeds já importados
  const existingKeys = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      set.add(normalize(t.nome));
      if (t.categoria) set.add(`cat:${normalize(t.categoria)}`);
    });
    return set;
  }, [templates]);

  const isSeedAlreadyCreated = (seed: ContratoSeedTemplate) =>
    existingKeys.has(normalize(seed.nome)) || existingKeys.has(`cat:${normalize(seed.categoria)}`);

  const seedsFaltando = CONTRATO_SEED_TEMPLATES.filter((s) => !isSeedAlreadyCreated(s));

  // Ações de navegação para o novo editor em tela cheia
  const handleNew = useCallback(() => {
    navigate('/app/comercial/contratos/novo');
  }, [navigate]);

  const handleEdit = useCallback(
    (template: ContratoTemplate) => {
      navigate(`/app/comercial/contratos/${template.id}/editor`);
    },
    [navigate]
  );

  const handleUseSeed = useCallback(
    async (seed: ContratoSeedTemplate) => {
      const created = await useSeed(seed);
      if (created) {
        navigate(`/app/comercial/contratos/${created.id}/editor`);
      }
    },
    [useSeed, navigate]
  );

  const handleAddAllSeeds = async () => {
    if (seedsFaltando.length === 0) {
      toast({ title: 'Tudo pronto!', description: 'Todos os modelos profissionais já estão na sua lista.' });
      return;
    }
    setBulkAdding(true);
    try {
      let criados = 0;
      for (const seed of seedsFaltando) {
        await create({
          nome: seed.nome,
          descricao: seed.descricao,
          categoria: seed.categoria,
          conteudo: seed.conteudo,
          is_padrao: false,
        });
        criados += 1;
      }
      toast({
        title: `${criados} modelo${criados > 1 ? 's' : ''} profissional${criados > 1 ? 'is' : ''} adicionado${criados > 1 ? 's' : ''}!`,
      });
      setActiveTab('meus');
    } finally {
      setBulkAdding(false);
    }
  };

  const searchTerm = search.trim();

  return (
    <div className={PAGE_SCROLL_SHELL}>
      <PageContainer className="py-4 pb-10">
        <PageHeader
          title="Contratos"
          description="Crie e gerencie templates de contratos para seus clientes com variáveis dinâmicas."
        />

        {/* Tabs e Toolbar */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="mt-4"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <TabsList className={PAGE_TABS_LIST}>
              <TabsTrigger value="meus" className="gap-1.5 text-[13px]">
                Meus modelos
                {!isLoading && templates.length > 0 && (
                  <span className="ml-0.5 text-[11px] text-muted-foreground">
                    ({templates.length})
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="biblioteca" className="gap-1.5 text-[13px]">
                Biblioteca Lunari
                <span className="ml-0.5 text-[11px] text-muted-foreground">
                  ({CONTRATO_SEED_TEMPLATES.length})
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-w-0 flex justify-end">
              <ContratoToolbar
                search={search}
                onSearchChange={setSearch}
                categoryFilter={myCategoryFilter}
                onCategoryFilterChange={setMyCategoryFilter}
                availableCategories={myCategories}
              />
            </div>
          </div>

          {/* ── Aba 1: Meus modelos ── */}
          <TabsContent value="meus" className="mt-6">
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ContratoCardSkeleton key={i} />
                ))}
              </div>
            ) : templates.length === 0 ? (
              /* Estado inicial com 0 modelos */
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <CreateContratoCard onClick={handleNew} />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <EmptyBusca termo={searchTerm || myCategoryFilter} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <ContratoCard
                    key={template.id}
                    template={template}
                    onEdit={handleEdit}
                  />
                ))}
                {/* CTA para criar novo sempre no final */}
                <CreateContratoCard onClick={handleNew} />
              </div>
            )}
          </TabsContent>

          {/* ── Aba 2: Biblioteca Lunari ── */}
          <TabsContent value="biblioteca" className="mt-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div>
                <p className="text-xs text-muted-foreground">
                  Modelos prontos e validados para fotógrafos começarem rapidamente.
                </p>
              </div>

              {seedsFaltando.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAllSeeds}
                  disabled={bulkAdding}
                  className="text-xs h-8 gap-1.5"
                >
                  <PackagePlus size={14} />
                  {bulkAdding
                    ? 'Adicionando...'
                    : `Adicionar os ${seedsFaltando.length} modelos que faltam`}
                </Button>
              )}
            </div>

            {/* Chips de Categoria */}
            <div className="mb-6">
              <CategoryChips
                seeds={CONTRATO_SEED_TEMPLATES}
                active={libraryCategoryFilter}
                onChange={setLibraryCategoryFilter}
              />
            </div>

            {filteredSeeds.length === 0 ? (
              <EmptyBusca termo={searchTerm || libraryCategoryFilter} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSeeds.map((seed) => (
                  <TemplateCard
                    key={seed.slug}
                    seed={seed}
                    onUseTemplate={handleUseSeed}
                    onPreview={(s) => setPreviewingSeed(s)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal de Pré-visualização da Biblioteca */}
        <ContratoPreviewModal
          seed={previewingSeed}
          onClose={() => setPreviewingSeed(null)}
          onUseTemplate={handleUseSeed}
        />
      </PageContainer>
    </div>
  );
}
