export interface Cliente {
  id: string;
  nome: string;
  nome_checkout?: string | null;
  email: string;
  telefone: string;
  whatsapp?: string;
  endereco?: string;
  avatar_url?: string | null;
  observacoes?: string;
  origem?: string;
  // Novos campos opcionais para perfil completo
  dataNascimento?: string;
  conjuge?: {
    nome?: string;
    dataNascimento?: string;
  };
  filhos?: Array<{
    id: string;
    nome?: string;
    dataNascimento?: string;
  }>;
  categoria_manual_id?: string | null;
  categoria_ia_id?: string | null;
}

export interface OrigemCliente {
  id: string;
  nome: string;
  cor?: string;
}