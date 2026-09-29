/**
 * Motor Determinístico de Intenção Comercial (v1)
 *
 * Analisa mensagens recentes de um contato para detectar intenção de compra
 * e identificar o serviço/categoria de interesse.
 *
 * Decisões de Design:
 * - Função pura, sem estado React → testável via unit test isolado.
 * - Complexidade O(n) onde n = total de palavras nas mensagens filtradas.
 * - Roda somente sobre mensagens `inbound` (do contato) das últimas 48h.
 * - Threshold de ativação = score >= 3 para evitar falsos positivos.
 * - Futuramente a Lu (IA) substituirá apenas esta função, mantendo a
 *   interface `CommercialIntent` intacta para o restante do sistema.
 */

// ─── Tipos Públicos ───────────────────────────────────────────────────────────

export interface CommercialIntent {
  /** Se intenção comercial foi detectada com confiança suficiente */
  detected: boolean;
  /** Categoria/serviço identificado (nome exato do estúdio, se houver match) */
  service: string | undefined;
  /** Score normalizado de confiança entre 0 e 1 */
  confidence: number;
  /** Palavras-chave que contribuíram para a detecção */
  matchedKeywords: string[];
  /** Score bruto (para debugging) */
  rawScore: number;
  /** A mensagem exata que gerou a maior pontuação (para contexto do modal) */
  triggerMessage?: string;
}

export interface IntentMessage {
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: string;
  type?: string;
}

// ─── Dicionário de Pesos ──────────────────────────────────────────────────────

interface WeightedTerm {
  /** Padrão regex para match (case-insensitive, sem acentos) */
  pattern: RegExp;
  /** Peso aditivo ao score (+positivo = comercial, -negativo = operacional) */
  weight: number;
  /** Rótulo legível para exibição em matchedKeywords */
  label: string;
}

/**
 * Gatilhos de venda: termos que indicam interesse em contratar um serviço.
 * Peso alto (+3 a +4) pois são indicadores fortes.
 */
const SALE_TRIGGERS: WeightedTerm[] = [
  { pattern: /\bvalor(es)?\b/, weight: 4, label: 'valor' },
  { pattern: /\bpre[cç]o(s)?\b/, weight: 4, label: 'preço' },
  { pattern: /\bor[cç]amento(s)?\b/, weight: 4, label: 'orçamento' },
  { pattern: /\bpacote(s)?\b/, weight: 3, label: 'pacote' },
  { pattern: /\bquanto\s+(custa|fica|cobr|sai)\b/, weight: 4, label: 'quanto custa' },
  { pattern: /\bdisponibilidade\b/, weight: 3, label: 'disponibilidade' },
  { pattern: /\bgostaria\s+de\b/, weight: 2, label: 'gostaria de' },
  { pattern: /\bquero\s+(fazer|saber|agendar|marcar|contratar)\b/, weight: 3, label: 'quero' },
  { pattern: /\binteresse\b/, weight: 2, label: 'interesse' },
  { pattern: /\binforma[cç][oõ](es|o)\b/, weight: 2, label: 'informação' },
  { pattern: /\bcomo\s+funciona\b/, weight: 2, label: 'como funciona' },
  { pattern: /\bdata(s)?\s+dispon[ií]ve(is|l)\b/, weight: 3, label: 'datas disponíveis' },
  { pattern: /\bagendar\b/, weight: 2, label: 'agendar' },
  { pattern: /\bmarcar\b/, weight: 2, label: 'marcar' },
  { pattern: /\bfaz(em)?\s+(ensaio|foto|sess[aã]o)\b/, weight: 3, label: 'faz ensaio/foto' },
];

/**
 * Gatilhos operacionais: termos que indicam pós-venda/logística.
 * Peso negativo alto para suprimir falsos positivos.
 */
const OPERATIONAL_TRIGGERS: WeightedTerm[] = [
  { pattern: /\bcomprovante\b/, weight: -5, label: 'comprovante' },
  { pattern: /\bpix\b/, weight: -5, label: 'pix' },
  { pattern: /\bboleto\b/, weight: -4, label: 'boleto' },
  { pattern: /\bpagamento\b/, weight: -4, label: 'pagamento' },
  { pattern: /\bpaguei\b/, weight: -5, label: 'paguei' },
  { pattern: /\btransfer[iê]\b/, weight: -5, label: 'transferi' },
  { pattern: /\breagend(ar|amento)\b/, weight: -4, label: 'reagendar' },
  { pattern: /\bgaleria\b/, weight: -4, label: 'galeria' },
  { pattern: /\blink\b/, weight: -3, label: 'link' },
  { pattern: /\breceb(i|ido|eu)\b/, weight: -3, label: 'recebido' },
  { pattern: /\bobrigad[oa]\b/, weight: -2, label: 'obrigado' },
  { pattern: /\bcontrato\b/, weight: -3, label: 'contrato' },
  { pattern: /\bassin(ar|ei|atura)\b/, weight: -3, label: 'assinar' },
  { pattern: /\benderec[oç]o\b/, weight: -3, label: 'endereço' },
  { pattern: /\bchegu(ei|ando)\b/, weight: -4, label: 'cheguei' },
  { pattern: /\batraso\b/, weight: -3, label: 'atraso' },
  { pattern: /\bentrega\b/, weight: -2, label: 'entrega' },
  { pattern: /\bselec[ioã]\b/, weight: -3, label: 'seleção' },
];

/**
 * Termos de serviço/categoria: usados para identificar QUAL serviço
 * o contato está interessado. Peso moderado (+1) porque sozinhos
 * não indicam intenção comercial, mas combinados com gatilhos de venda sim.
 */
const SERVICE_TERMS: WeightedTerm[] = [
  { pattern: /\bensaio\b/, weight: 1, label: 'ensaio' },
  { pattern: /\bsess[aã]o\b/, weight: 1, label: 'sessão' },
  { pattern: /\bfotos?\b/, weight: 1, label: 'foto' },
  { pattern: /\bgestante\b/, weight: 1, label: 'Gestante' },
  { pattern: /\bnewborn\b/, weight: 1, label: 'Newborn' },
  { pattern: /\brec[eé]m[\s-]?nascid[oa]\b/, weight: 1, label: 'Newborn' },
  { pattern: /\binfantil\b/, weight: 1, label: 'Infantil' },
  { pattern: /\bcrian[cç]a(s)?\b/, weight: 1, label: 'Infantil' },
  { pattern: /\bdia\s+das\s+crian[cç]as\b/, weight: 2, label: 'Infantil' },
  { pattern: /\banivers[aá]rio\b/, weight: 1, label: 'Infantil' },
  { pattern: /\bsmash\s*(the)?\s*cake\b/, weight: 1, label: 'Smash the Cake' },
  { pattern: /\bbebe\b/, weight: 1, label: 'Newborn' },
  { pattern: /\bbeb[eê]\b/, weight: 1, label: 'Newborn' },
  { pattern: /\bcasamento\b/, weight: 1, label: 'Casamento' },
  { pattern: /\bnoiv[oa](s)?\b/, weight: 1, label: 'Casamento' },
  { pattern: /\bpre[\s-]?wedding\b/, weight: 1, label: 'Casamento' },
  { pattern: /\bcasal\b/, weight: 1, label: 'Casal' },
  { pattern: /\bfam[ií]lia\b/, weight: 1, label: 'Família' },
  { pattern: /\bnatal\b/, weight: 2, label: 'Natal' },
  { pattern: /\bp[aá]scoa\b/, weight: 2, label: 'Páscoa' },
  { pattern: /\b15\s*anos?\b/, weight: 1, label: '15 Anos' },
  { pattern: /\bdebutante\b/, weight: 1, label: '15 Anos' },
  { pattern: /\bbatizado\b/, weight: 1, label: 'Batizado' },
  { pattern: /\bformatura\b/, weight: 1, label: 'Formatura' },
  { pattern: /\bcorporativ[oa]\b/, weight: 1, label: 'Corporativo' },
  { pattern: /\bempresa(rial)?\b/, weight: 1, label: 'Corporativo' },
  { pattern: /\bbook\b/, weight: 1, label: 'Book' },
  { pattern: /\bretrato\b/, weight: 1, label: 'Retrato' },
];

// Todos os dicionários consolidados para iteração única
const ALL_TERMS: WeightedTerm[] = [
  ...SALE_TRIGGERS,
  ...OPERATIONAL_TRIGGERS,
  ...SERVICE_TERMS,
];

// ─── Configuração ─────────────────────────────────────────────────────────────

/** Score mínimo para considerar intenção detectada */
const DETECTION_THRESHOLD = 3;

/** Limite superior de score para normalização da confiança */
const MAX_EXPECTED_SCORE = 12;

/** Máximo de mensagens inbound a considerar */
const MAX_MESSAGES = 5;

/** Janela temporal em ms (48 horas) */
const TIME_WINDOW_MS = 48 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Remove acentos e converte para minúsculas.
 * Usa NFD + remoção de diacríticos para matching robusto.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Tenta fazer match de um nome de categoria do estúdio com os termos de serviço detectados.
 * Retorna o nome exato da categoria se houver correspondência (preservando case do estúdio).
 */
function matchServiceToCategory(
  detectedService: string,
  availableCategories: string[]
): string | undefined {
  if (!detectedService || availableCategories.length === 0) return undefined;

  const normalizedService = normalizeText(detectedService);

  // Match exato (case-insensitive, sem acento)
  const exactMatch = availableCategories.find(
    (cat) => normalizeText(cat) === normalizedService
  );
  if (exactMatch) return exactMatch;

  // Match parcial (a categoria contém o serviço ou vice-versa)
  const partialMatch = availableCategories.find((cat) => {
    const normalizedCat = normalizeText(cat);
    return (
      normalizedCat.includes(normalizedService) ||
      normalizedService.includes(normalizedCat)
    );
  });
  if (partialMatch) return partialMatch;

  return undefined;
}

// ─── Função Principal ─────────────────────────────────────────────────────────

/**
 * Detecta intenção comercial nas mensagens recentes de uma conversa.
 *
 * @param messages - Array de mensagens do chat (todas as direções)
 * @param availableCategories - Nomes das categorias configuradas pelo fotógrafo
 * @returns Objeto CommercialIntent com resultado da análise
 *
 * @example
 * ```ts
 * const intent = detectCommercialIntent(messages, ['Infantil', 'Newborn', 'Gestante']);
 * // → { detected: true, service: 'Infantil', confidence: 0.82, matchedKeywords: ['valor', 'infantil'], rawScore: 5 }
 * ```
 */
export function detectCommercialIntent(
  messages: IntentMessage[],
  availableCategories: string[] = []
): CommercialIntent {
  const emptyResult: CommercialIntent = {
    detected: false,
    service: undefined,
    confidence: 0,
    matchedKeywords: [],
    rawScore: 0,
  };

  if (!messages || messages.length === 0) return emptyResult;

  // ─── Filtrar: apenas inbound (do contato), das últimas 48h ──────────
  const now = Date.now();
  const recentInbound = messages
    .filter((m) => {
      if (m.direction !== 'inbound') return false;
      // Apenas texto possui conteúdo analisável
      if (m.type && m.type !== 'text') return false;
      if (!m.content || m.content.trim().length === 0) return false;
      // Filtro temporal
      const msgTime = new Date(m.timestamp).getTime();
      return !isNaN(msgTime) && now - msgTime <= TIME_WINDOW_MS;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_MESSAGES);

  if (recentInbound.length === 0) return emptyResult;

  // ─── Scoring por Mensagem ──────────────────────────────────────────
  let totalScore = 0;
  const matchedKeywords: Set<string> = new Set();
  const detectedServiceLabels: Set<string> = new Set();

  let highestScoreMessage: string | undefined = undefined;
  let highestMsgScore = -999;

  for (const msg of recentInbound) {
    const normalizedText = normalizeText(msg.content);
    let msgScore = 0;

    // 1. Scoring via Dicionário de Termos
    for (const term of ALL_TERMS) {
      const normalizedPattern = new RegExp(
        term.pattern.source.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        term.pattern.flags + (term.pattern.flags.includes('i') ? '' : 'i')
      );

      if (normalizedPattern.test(normalizedText)) {
        msgScore += term.weight;
        totalScore += term.weight;
        matchedKeywords.add(term.label);

        if (term.weight > 0 && SERVICE_TERMS.includes(term)) {
          detectedServiceLabels.add(term.label);
        }
      }
    }

    // 2. Tentar match direto com categorias do estúdio
    for (const cat of availableCategories) {
      const normalizedCat = normalizeText(cat);
      if (normalizedCat.length >= 3 && normalizedText.includes(normalizedCat)) {
        if (!detectedServiceLabels.has(cat)) {
          detectedServiceLabels.add(cat);
          msgScore += 1;
          totalScore += 1;
          matchedKeywords.add(cat);
        }
      }
    }

    if (msgScore > 0 && msgScore > highestMsgScore) {
      highestMsgScore = msgScore;
      highestScoreMessage = msg.content;
    }
  }

  // ─── Resolver o serviço principal ───────────────────────────────────
  let resolvedService: string | undefined;
  for (const label of detectedServiceLabels) {
    const matched = matchServiceToCategory(label, availableCategories);
    if (matched) {
      resolvedService = matched;
      break;
    }
  }
  if (!resolvedService && detectedServiceLabels.size > 0) {
    resolvedService = [...detectedServiceLabels][0];
  }

  // ─── Calcular confiança normalizada ─────────────────────────────────
  const clampedScore = Math.max(0, totalScore);
  const confidence = Math.min(1, clampedScore / MAX_EXPECTED_SCORE);

  // ─── Resultado ──────────────────────────────────────────────────────
  return {
    detected: totalScore >= DETECTION_THRESHOLD,
    service: totalScore >= DETECTION_THRESHOLD ? resolvedService : undefined,
    confidence: Math.round(confidence * 100) / 100,
    matchedKeywords: Array.from(matchedKeywords),
    rawScore: totalScore,
    triggerMessage: highestScoreMessage,
  };
}