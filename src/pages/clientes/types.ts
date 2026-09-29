export type SortKey = 
  | 'nome' 
  | 'total_faturado' 
  | 'total_pago' 
  | 'a_receber' 
  | 'sessoes_count' 
  | 'ultima_sessao_data' 
  | 'created_at';

export interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

export type ViewMode = 'cards' | 'list';

export interface ClienteFormData {
  nome: string;
  email: string;
  telefone: string;
  origem: string;
  data_nascimento?: string;
  whatsapp?: string;
  cep?: string;
  endereco?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cpf_cnpj?: string;
  observacoes?: string;
  familia?: {
    conjuge?: { nome: string; dataNascimento: string };
    filhos?: Array<{ id: string; nome: string; dataNascimento: string }>;
  };
}

export interface ClienteResumo {
  id: string;
  user_id: string;
  nome: string;
  nome_checkout?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  origem?: string | null;
  data_nascimento?: string | null;
  created_at: string;
  updated_at?: string | null;
  avatar_url?: string | null;
  conversas_contato_id?: string | null;
  dependente_nome?: string | null;
  dependente_tipo?: string | null;
  sessoes_count: number;
  total_faturado: number;
  total_pago: number;
  a_receber: number;
  ultima_sessao_data?: string | null;
  categoria_recente?: string | null;
}

export type PeriodoFilter = 'todos' | 'mes_atual' | 'ano_atual' | 'custom';
export type StatusFilter = 'todos' | 'ativo' | 'novo';

export interface ClientAdvancedFilters {
  periodo: PeriodoFilter;
  dataInicio: string;
  dataFim: string;
  categoria: string;
  status: StatusFilter;
  possuiSessoes: boolean;
  comValorAReceber: boolean;
  semSessoes: boolean;
  aniversariantes: boolean;
}
