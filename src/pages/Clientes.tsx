import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DuplicateWarningDialog } from '@/components/clientes/DuplicateWarningDialog';
import { AniversariantesModal } from '@/components/crm/AniversariantesModal';
import { WhatsAppBatchLinkModal } from './clientes/components/WhatsAppBatchLinkModal';
import { useRealtimeConfiguration } from '@/hooks/useRealtimeConfiguration';

import { ViewMode, ClientAdvancedFilters } from './clientes/types';
import { useClientesServerPagination } from './clientes/hooks/useClientesServerPagination';
import { useClienteFormState } from './clientes/hooks/useClienteFormState';
import { ClientesToolbar } from './clientes/components/ClientesToolbar';
import { ClientesGrid } from './clientes/components/ClientesGrid';
import { ClientesTable } from './clientes/components/ClientesTable';
import { ClientesPagination } from './clientes/components/ClientesPagination';
import { ClientesSkeleton } from './clientes/components/ClientesSkeleton';
import { ClientesFilterDrawer } from './clientes/components/ClientesFilterDrawer';
import { ClienteFormDrawer } from './clientes/components/ClienteFormDrawer';
import { Users, UserPlus, Cake, Link as LinkIcon, RotateCcw } from 'lucide-react';

export default function Clientes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showAniversariantesModal, setShowAniversariantesModal] = useState(false);
  const [showBatchLinkModal, setShowBatchLinkModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Busca categorias configuradas no sistema para o filtro
  const { categorias: categoriasConfig } = useRealtimeConfiguration();
  const availableCategories = useMemo(() => {
    return (categoriasConfig || [])
      .map((c: any) => (typeof c === 'string' ? c : c?.nome || c?.label || ''))
      .filter(Boolean);
  }, [categoriasConfig]);

  // Hook de Paginação Server-side com Cache e Prefetch inteligente
  const {
    clientes,
    totalCount,
    isLoading,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    sortConfig,
    setSortConfig,
    handleSort,
    filters,
    setFilters,
    clearFilters,
    activeFiltersCount,
    totalPages,
    refetch,
  } = useClientesServerPagination();

  // Hook de Formulário, Detecção de Duplicata e Ações
  const {
    showClientForm,
    editingClient,
    formData,
    setFormData,
    handleSelectOpenChange,
    handleModalClose,
    showSuggestions,
    showDuplicateDialog,
    forceCreate,
    setForceCreate,
    setShowSuggestions,
    duplicateCheck,
    handleAddClient,
    handleEditClient,
    handleDeleteClient,
    handleSaveClient,
    handleEditSuggestion,
    handleDismissSuggestions,
    handleEditDuplicate,
    handleCreateAnyway,
    handleCancelDuplicate,
    handleWhatsApp,
    dialogState,
    handleConfirm,
    handleCancel,
    handleClose,
  } = useClienteFormState({
    onClientMutated: refetch,
  });

  // Check for openBirthdays parameter and auto-open modal
  useEffect(() => {
    if (searchParams.get('openBirthdays') === 'true') {
      setShowAniversariantesModal(true);
      searchParams.delete('openBirthdays');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Limpeza de filtro específico a partir de um chip
  const handleRemoveFilter = useCallback(
    (key: keyof ClientAdvancedFilters) => {
      setFilters((prev) => {
        if (key === 'periodo') {
          return { ...prev, periodo: 'todos', dataInicio: '', dataFim: '' };
        }
        if (key === 'categoria') {
          return { ...prev, categoria: 'todas' };
        }
        if (key === 'status') {
          return { ...prev, status: 'todos' };
        }
        return { ...prev, [key]: false };
      });
    },
    [setFilters]
  );

  // Seleção individual de linha na tabela
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Selecionar todos os clientes da página atual
  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allCurrentSelected =
        clientes.length > 0 && clientes.every((c) => prev.has(c.id));
      if (allCurrentSelected) {
        return new Set();
      }
      return new Set(clientes.map((c) => c.id));
    });
  }, [clientes]);

  // Se os clientes mudarem, remove IDs órfãos da seleção
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, pageSize, filters, searchTerm]);

  return (
    <PageContainer className="py-5 space-y-5 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {/* 1. Topo da Página: Título, Subtítulo e Ações Secundárias */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Clientes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading && totalCount === 0
              ? 'Carregando clientes…'
              : `${totalCount} cliente(s) cadastrado(s)`}
          </p>
        </div>

        {/* Botões Utilitários Secundários */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowBatchLinkModal(true)}
            className="h-8 gap-1.5 text-xs border-border/40 bg-card/60 hover:bg-muted/40"
          >
            <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Vincular</span> WhatsApps
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAniversariantesModal(true)}
            className="h-8 gap-1.5 text-xs border-border/40 bg-card/60 hover:bg-muted/40"
          >
            <Cake className="h-3.5 w-3.5 text-accent-gold" />
            <span>Aniversariantes</span>
          </Button>
        </div>
      </div>

      {/* 2. Toolbar Sticky com Busca ⌘K, Toggle Cards/Tabela, Filtros e Novo Cliente */}
      <ClientesToolbar
        totalCount={totalCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        activeFiltersCount={activeFiltersCount}
        onOpenFilterDrawer={() => setShowFilterDrawer(true)}
        onNewClient={handleAddClient}
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearFilters={clearFilters}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        selectedCount={selectedIds.size}
      />

      {/* 3. Área Principal de Exibição */}
      <div className="min-h-[400px]">
        {/* Skeleton Loading (quando está carregando e não há dados em cache) */}
        {isLoading && clientes.length === 0 ? (
          <ClientesSkeleton viewMode={viewMode} />
        ) : clientes.length > 0 ? (
          /* Visualização em Cards */
          viewMode === 'cards' ? (
            <ClientesGrid
              clientes={clientes}
              onWhatsApp={handleWhatsApp}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
            />
          ) : (
            /* Visualização em Tabela */
            <ClientesTable
              clientes={clientes}
              sortConfig={sortConfig}
              onSort={handleSort}
              onWhatsApp={handleWhatsApp}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
            />
          )
        ) : (
          /* Estado Vazio */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 p-12 text-center bg-card/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-gold/10 mb-4 border border-accent-gold/20">
              <Users className="h-7 w-7 text-accent-gold" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Nenhum cliente encontrado
            </h3>
            <p className="mb-5 mt-1 text-xs text-muted-foreground max-w-sm">
              {searchTerm || activeFiltersCount > 0
                ? 'Nenhum resultado correspondeu aos critérios de busca ou filtros aplicados.'
                : 'Você ainda não cadastrou nenhum cliente no seu estúdio. Comece adicionando o primeiro!'}
            </p>

            {searchTerm || activeFiltersCount > 0 ? (
              <Button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  clearFilters();
                }}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs border-border/40 hover:bg-muted/40"
              >
                <RotateCcw className="h-3.5 w-3.5 text-accent-gold" />
                Limpar busca e filtros
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleAddClient}
                size="sm"
                className="h-9 gap-1.5 text-xs bg-accent-gold hover:bg-accent-gold/90 text-zinc-950 font-semibold shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                Adicionar Primeiro Cliente
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 4. Paginação no Rodapé */}
      <ClientesPagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* 5. Drawer Lateral Direito de Filtros Avançados */}
      <ClientesFilterDrawer
        open={showFilterDrawer}
        onOpenChange={setShowFilterDrawer}
        filters={filters}
        onApplyFilters={setFilters}
        onClearFilters={clearFilters}
        availableCategories={availableCategories}
      />

      {/* 6. Drawer de Criação e Edição Completa de Cliente */}
      <ClienteFormDrawer
        open={showClientForm}
        onOpenChange={handleModalClose}
        editingClient={editingClient}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSaveClient}
        duplicateCheck={duplicateCheck}
        showSuggestions={showSuggestions}
        onEditSuggestion={handleEditSuggestion}
        onDismissSuggestions={handleDismissSuggestions}
        forceCreate={forceCreate}
        setForceCreate={setForceCreate}
        setShowSuggestions={setShowSuggestions}
        onSelectOpenChange={handleSelectOpenChange}
      />

      {/* 7. Dialog de Aviso de Duplicidade */}
      <DuplicateWarningDialog
        open={showDuplicateDialog}
        cliente={duplicateCheck.clienteDuplicado}
        onEditExisting={handleEditDuplicate}
        onCreateAnyway={handleCreateAnyway}
        onCancel={handleCancelDuplicate}
      />

      {/* 8. Modal de Aniversariantes */}
      <AniversariantesModal
        open={showAniversariantesModal}
        onOpenChange={setShowAniversariantesModal}
        clientes={clientes as any}
      />

      {/* 9. Modal de Vinculação em Lote do WhatsApp */}
      <WhatsAppBatchLinkModal
        open={showBatchLinkModal}
        onOpenChange={setShowBatchLinkModal}
      />

      {/* 10. Confirm Dialog de Ações Críticas */}
      <ConfirmDialog
        state={dialogState}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onClose={handleClose}
      />
    </PageContainer>
  );
}