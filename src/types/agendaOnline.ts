export interface AgendaOnlineLink {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description?: string | null;
  availability_type_id: string;
  categoria_id: string;
  pacotes_permitidos: string[];
  require_deposit: boolean;
  deposit_type?: 'fixed' | 'percentage' | null;
  deposit_value?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type NewAgendaOnlineLink = Omit<AgendaOnlineLink, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
