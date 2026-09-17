export type SortKey = 'nome' | 'totalFaturado' | 'totalPago' | 'aReceber' | 'sessoes';

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
