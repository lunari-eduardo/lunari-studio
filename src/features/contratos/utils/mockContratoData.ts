/**
 * Mock de dados para simulação realista na pré-visualização de contratos.
 */

export interface MockContractValues {
  [key: string]: string;
}

export const MOCK_CONTRACT_DATA: MockContractValues = {
  // Cliente
  nome_cliente: 'Maria Clara Silveira',
  cpf_cliente: '123.456.789-00',
  rg_cliente: '12.345.678-9 SSP/SP',
  documento_cliente: '123.456.789-00',
  email_cliente: 'maria.clara@exemplo.com.br',
  cidade_cliente: 'São Paulo',
  estado_cliente: 'SP',
  cliente_nome: 'Maria Clara Silveira',
  cliente_email: 'maria.clara@exemplo.com.br',
  cliente_telefone: '(11) 98765-4321',
  cliente_endereco: 'Av. Paulista, 1000 - Bela Vista',

  // Fotógrafo / Estúdio
  nome_fotografo: 'Lunari Studio Fotografia',
  documento_fotografo: '12.345.678/0001-90',
  cidade_fotografo: 'São Paulo - SP',
  email_fotografo: 'contato@lunaristudio.com.br',
  fotografo_nome: 'Lunari Studio Fotografia',
  fotografo_email: 'contato@lunaristudio.com.br',

  // Sessão / Evento
  data_sessao: '15 de Outubro de 2026',
  data_evento: '15 de Outubro de 2026',
  sessao_data: '15 de Outubro de 2026',
  horario_sessao: '14:30',
  horario_inicio: '14:30',
  horario_termino: '16:30',
  duracao_sessao: '2',
  duracao_maxima: '3',
  tipo_ensaio: 'Ensaio Gestante',
  tipo_evento: 'Ensaio Externo',
  sessao_categoria: 'Gestante',
  local_ensaio: 'Parque Ibirapuera / Estúdio',
  local_evento: 'Parque Ibirapuera',

  // Valores & Condições Comerciais
  valor_total: 'R$ 2.400,00',
  sessao_valor_total: 'R$ 2.400,00',
  valor_sinal: 'R$ 600,00',
  valor_hora_extra: 'R$ 250,00',
  valor_foto_extra: 'R$ 45,00',
  taxa_deslocamento: 'R$ 120,00',
  valor_taxa_dano: 'R$ 150,00',
  forma_pagamento: 'Entrada via PIX e restante em até 3x no cartão de crédito',
  descricao_forma_pagamento: 'Entrada de 25% na assinatura e saldo quitado no dia da sessão',
  quantidade_fotos: '30 fotos digitais tratadas',
  prazo_entrega: '20 dias úteis',
  prazo_entrega_final: '20 dias úteis',
  prazo_selecao: '5 dias úteis',
  dias_aviso_previo: '7',
  dias_multa_cancelamento: '15',
  porcentagem_multa: '30%',
  fornecimento_figurino: 'inclui 2 vestidos do acervo exclusivo',

  // Newborn
  nome_bebe: 'Theo',

  // Sistema
  data_atual: new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
};

/**
 * Interpola as variáveis {{chave}} no HTML do contrato usando os valores simulados.
 * Se highlightVariables = true, envolve o valor com uma tag <mark> estilizável.
 */
export function interpolateContractPreview(
  html: string,
  highlightVariables = false,
  customValues: MockContractValues = {}
): string {
  if (!html) return '';

  const values = { ...MOCK_CONTRACT_DATA, ...customValues };

  return html.replace(/\{\{([^}]+)\}\}/g, (_match, keyRaw) => {
    const key = keyRaw.trim();
    const val = values[key] || `[${key}]`;

    if (highlightVariables) {
      return `<mark class="contrato-var-highlight px-1 py-0.5 rounded text-[12px] bg-[hsl(var(--accent-gold))]/25 text-foreground font-medium border border-[hsl(var(--accent-gold))]/40" title="Variável: {{${key}}}">${val}</mark>`;
    }

    return val;
  });
}
