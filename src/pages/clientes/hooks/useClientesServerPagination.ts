import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import {
  ClienteResumo,
  ClientAdvancedFilters,
  SortKey,
  SortConfig,
} from '../types';

export const DEFAULT_FILTERS: ClientAdvancedFilters = {
  periodo: 'todos',
  dataInicio: '',
  dataFim: '',
  categoria: 'todas',
  status: 'todos',
  possuiSessoes: false,
  comValorAReceber: false,
  semSessoes: false,
  aniversariantes: false,
};

interface CacheEntry {
  data: ClienteResumo[];
  totalCount: number;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de cache em memória

export function useClientesServerPagination() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'created_at',
    direction: 'desc',
  });

  const [filters, setFilters] = useState<ClientAdvancedFilters>(DEFAULT_FILTERS);

  const [clientes, setClientes] = useState<ClienteResumo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNext, setIsFetchingNext] = useState(false);

  // Cache em memória para páginas visitadas
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  // Assinatura única dos filtros para chave de cache e detecção de mudança
  const filtersSignature = useMemo(() => {
    return JSON.stringify({
      search: debouncedSearch.trim().toLowerCase(),
      sortKey: sortConfig.key,
      sortDir: sortConfig.direction,
      pageSize,
      filters,
    });
  }, [debouncedSearch, sortConfig, pageSize, filters]);

  // Limpa o cache sempre que a busca ou filtros mudarem e reseta para a página 1
  const prevSignatureRef = useRef(filtersSignature);
  useEffect(() => {
    if (prevSignatureRef.current !== filtersSignature) {
      prevSignatureRef.current = filtersSignature;
      cacheRef.current.clear();
      setCurrentPage(1);
    }
  }, [filtersSignature]);

  // Função interna para construir a query com os filtros
  const buildQuery = useCallback(
    (pageNumber: number, size: number) => {
      let query = (supabase.from as any)('v_crm_clientes_resumo')
        .select('*', { count: 'exact' });

      // 1. Busca por nome, email, telefone ou whatsapp
      const searchClean = debouncedSearch.trim();
      if (searchClean) {
        // Remove caracteres especiais para busca telefônica limpa
        const digitsOnly = searchClean.replace(/\D/g, '');
        if (digitsOnly.length >= 3) {
          query = query.or(
            `nome.ilike.%${searchClean}%,email.ilike.%${searchClean}%,telefone.ilike.%${digitsOnly}%,whatsapp.ilike.%${digitsOnly}%`
          );
        } else {
          query = query.or(
            `nome.ilike.%${searchClean}%,email.ilike.%${searchClean}%,telefone.ilike.%${searchClean}%,whatsapp.ilike.%${searchClean}%`
          );
        }
      }

      // 2. Filtro de Categoria
      if (filters.categoria && filters.categoria !== 'todas') {
        query = query.ilike('categoria_recente', `%${filters.categoria}%`);
      }

      // 3. Filtro de Status
      if (filters.status === 'ativo') {
        query = query.gt('sessoes_count', 0);
      } else if (filters.status === 'novo') {
        query = query.eq('sessoes_count', 0);
      }

      // 4. Filtros Rápidos (Booleans)
      if (filters.possuiSessoes) {
        query = query.gt('sessoes_count', 0);
      }
      if (filters.semSessoes) {
        query = query.eq('sessoes_count', 0);
      }
      if (filters.comValorAReceber) {
        query = query.gt('a_receber', 0);
      }

      // 5. Filtro de Período (baseado na última sessão ou criação)
      const now = new Date();
      if (filters.periodo === 'mes_atual') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);
        query = query.gte('ultima_sessao_data', firstDay).lte('ultima_sessao_data', lastDay);
      } else if (filters.periodo === 'ano_atual') {
        const firstDay = `${now.getFullYear()}-01-01`;
        const lastDay = `${now.getFullYear()}-12-31`;
        query = query.gte('ultima_sessao_data', firstDay).lte('ultima_sessao_data', lastDay);
      } else if (filters.periodo === 'custom') {
        if (filters.dataInicio) {
          query = query.gte('ultima_sessao_data', filters.dataInicio);
        }
        if (filters.dataFim) {
          query = query.lte('ultima_sessao_data', filters.dataFim);
        }
      }

      // 6. Ordenação
      query = query.order(sortConfig.key, {
        ascending: sortConfig.direction === 'asc',
        nullsFirst: false,
      });

      // 7. Paginação server-side
      const offset = (pageNumber - 1) * size;
      query = query.range(offset, offset + size - 1);

      return query;
    },
    [debouncedSearch, filters, sortConfig]
  );

  // Executa busca de uma página específica
  const fetchPage = useCallback(
    async (pageNumber: number, size: number): Promise<CacheEntry | null> => {
      const cacheKey = `${filtersSignature}_page_${pageNumber}_size_${size}`;
      const cached = cacheRef.current.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached;
      }

      try {
        const query = buildQuery(pageNumber, size);
        const { data, count, error } = await query;

        if (error) {
          console.error('[useClientesServerPagination] Erro na query:', error);
          return null;
        }

        const formattedData: ClienteResumo[] = (data || []).map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          nome: row.nome || '',
          nome_checkout: row.nome_checkout,
          email: row.email,
          telefone: row.telefone,
          whatsapp: row.whatsapp,
          origem: row.origem,
          data_nascimento: row.data_nascimento,
          created_at: row.created_at,
          updated_at: row.updated_at,
          avatar_url: row.avatar_url,
          conversas_contato_id: row.conversas_contato_id,
          dependente_nome: row.dependente_nome,
          dependente_tipo: row.dependente_tipo,
          sessoes_count: Number(row.sessoes_count) || 0,
          total_faturado: Number(row.total_faturado) || 0,
          total_pago: Number(row.total_pago) || 0,
          a_receber: Number(row.a_receber) || 0,
          ultima_sessao_data: row.ultima_sessao_data,
          categoria_recente: row.categoria_recente,
        }));

        const result: CacheEntry = {
          data: formattedData,
          totalCount: count ?? 0,
          timestamp: Date.now(),
        };

        cacheRef.current.set(cacheKey, result);
        return result;
      } catch (err) {
        console.error('[useClientesServerPagination] Falha de rede:', err);
        return null;
      }
    },
    [buildQuery, filtersSignature]
  );

  // Prefetch inteligente em background da próxima página
  const prefetchNextPage = useCallback(
    async (nextPage: number, size: number) => {
      const cacheKey = `${filtersSignature}_page_${nextPage}_size_${size}`;
      if (cacheRef.current.has(cacheKey)) return;

      try {
        setIsFetchingNext(true);
        await fetchPage(nextPage, size);
      } finally {
        setIsFetchingNext(false);
      }
    },
    [fetchPage, filtersSignature]
  );

  // Carrega a página atual
  const loadCurrentPage = useCallback(async () => {
    const cacheKey = `${filtersSignature}_page_${currentPage}_size_${pageSize}`;
    const cached = cacheRef.current.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setClientes(cached.data);
      setTotalCount(cached.totalCount);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await fetchPage(currentPage, pageSize);

    if (result) {
      setClientes(result.data);
      setTotalCount(result.totalCount);
    }

    setIsLoading(false);
  }, [currentPage, pageSize, filtersSignature, fetchPage]);

  useEffect(() => {
    loadCurrentPage();
  }, [loadCurrentPage]);

  // Função para forçar recarregamento (ex: após adicionar/editar cliente)
  const refetch = useCallback(() => {
    cacheRef.current.clear();
    loadCurrentPage();
  }, [loadCurrentPage]);

  // Troca de ordenação
  const handleSort = useCallback((key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Total de páginas calculado
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.periodo !== 'todos') count++;
    if (filters.categoria && filters.categoria !== 'todas') count++;
    if (filters.status !== 'todos') count++;
    if (filters.possuiSessoes) count++;
    if (filters.comValorAReceber) count++;
    if (filters.semSessoes) count++;
    if (filters.aniversariantes) count++;
    return count;
  }, [filters]);

  // Limpeza de filtros
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    clientes,
    totalCount,
    isLoading,
    isFetchingNext,
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
  };
}
