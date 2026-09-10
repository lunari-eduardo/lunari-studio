export type EntitlementKey = 
  | 'tasks'
  | 'charge_links'
  | 'agenda_availability'
  | 'agenda_online'
  | 'contracts'
  | 'forms'
  | 'client_documents'
  | 'integrations'
  | 'payments'
  | 'finance'
  | 'pricing'
  | 'sales_analysis'
  | 'leads'
  | 'commercial'
  | 'transfer_upload'
  | 'select_credits_renewal'
  | 'email_automations';

export const ENTITLEMENT_NAMES: Record<EntitlementKey, string> = {
  tasks: 'Tarefas',
  charge_links: 'Cobrança por Link',
  agenda_availability: 'Configuração de Disponibilidade',
  agenda_online: 'Agendamento Online',
  contracts: 'Contratos',
  forms: 'Formulários (Briefing)',
  client_documents: 'Documentos do Cliente',
  integrations: 'Integrações',
  payments: 'Configuração de Pagamentos',
  finance: 'Financeiro',
  pricing: 'Precificação',
  sales_analysis: 'Análise de Vendas',
  leads: 'Gestão de Leads',
  commercial: 'Comercial',
  transfer_upload: 'Upload de Transfer',
  select_credits_renewal: 'Renovação de Créditos Select',
  email_automations: 'Automação de E-mails'
};
