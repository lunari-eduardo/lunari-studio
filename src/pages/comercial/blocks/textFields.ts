/**
 * Resolução semântica de campos de texto no Editor de Propostas.
 * Mapeia caminhos de dados (ex: 'title', 'subtitle', 'packages.0.description', 'details.1.label')
 * para suas categorias tipográficas, rótulos amigáveis e limites de tamanho.
 */

export type TextRole = 'display' | 'subtitle' | 'body' | 'highlight' | 'script' | 'accent';

export interface FieldInfo {
  fieldKey: string;
  role: TextRole;
  label: string;
  min: number;
  max: number;
  defaultSize: number;
  /** Fonte própria por instância (ex.: nome de cada pacote), em vez da fonte global da categoria. */
  localFontOverride?: boolean;
}

const BOUNDS_BY_KEY: Record<string, Omit<FieldInfo, 'fieldKey'>> = {
  title: {
    role: 'display',
    label: 'Título Principal',
    min: 24,
    max: 120,
    defaultSize: 44,
  },
  title_italic: {
    role: 'highlight',
    label: 'Destaque em Itálico',
    min: 20,
    max: 120,
    defaultSize: 36,
  },
  subtitle: {
    role: 'subtitle',
    label: 'Subtítulo',
    min: 12,
    max: 36,
    defaultSize: 18,
  },
  eyebrow: {
    role: 'subtitle',
    label: 'Rótulo Superior',
    min: 9,
    max: 20,
    defaultSize: 11,
  },
  photographer_name: {
    role: 'subtitle',
    label: 'Assinatura',
    min: 9,
    max: 22,
    defaultSize: 12,
  },
  btnText: {
    role: 'subtitle',
    label: 'Botão de Ação',
    min: 11,
    max: 24,
    defaultSize: 14,
  },
  cta_text: {
    role: 'display',
    label: 'Chamada de Ação',
    min: 24,
    max: 120,
    defaultSize: 48,
  },
  description: {
    role: 'body',
    label: 'Descrição / Texto',
    min: 11,
    max: 32,
    defaultSize: 16,
  },
  body: {
    role: 'body',
    label: 'Descrição / Texto',
    min: 11,
    max: 32,
    defaultSize: 16,
  },
  detail_label: {
    role: 'subtitle',
    label: 'Rótulo do Detalhe',
    min: 9,
    max: 20,
    defaultSize: 11,
  },
  detail_value: {
    role: 'body',
    label: 'Valor do Detalhe',
    min: 12,
    max: 28,
    defaultSize: 16,
  },
  feature: {
    role: 'body',
    label: 'Item Incluso',
    min: 11,
    max: 24,
    defaultSize: 14,
  },
  price: {
    role: 'accent',
    label: 'Preço / Valor',
    min: 14,
    max: 60,
    defaultSize: 24,
  },
  caption: {
    role: 'body',
    label: 'Legenda',
    min: 10,
    max: 24,
    defaultSize: 14,
  },
  aside: {
    role: 'highlight',
    label: 'Frase de Destaque',
    min: 14,
    max: 40,
    defaultSize: 22,
  },
  terms: {
    role: 'body',
    label: 'Condições & Prazos',
    min: 10,
    max: 20,
    defaultSize: 12,
  },
};

/**
 * Normaliza qualquer caminho de edição (inclusive com arrays ou pontos)
 * para uma definição semântica e limites visuais para a barra flutuante.
 */
export function resolveFieldInfo(path: string): FieldInfo {
  if (!path) {
    return {
      fieldKey: 'body',
      role: 'body',
      label: 'Texto',
      min: 11,
      max: 32,
      defaultSize: 16,
    };
  }

  // Nome de cada pacote: cartão próprio, não deve herdar nem compartilhar tamanho/cor/fonte
  // com o Título Principal da seção nem com os demais pacotes (chave única por índice).
  // Aceita tanto o caminho bruto ("packages.0.name") quanto a própria fieldKey já resolvida
  // ("package_0_name") — a barra flutuante chama resolveFieldInfo de novo sobre o valor
  // resolvido, então a função precisa ser idempotente ou perde o label/role corretos.
  const idx = /^packages\.(\d+)\.name$/.exec(path)?.[1] ?? /^package_(\d+)_name$/.exec(path)?.[1];
  if (idx !== undefined) {
    return {
      fieldKey: `package_${idx}_name`,
      role: 'display',
      label: 'Nome do Pacote',
      min: 14,
      max: 64,
      defaultSize: 24,
      localFontOverride: true,
    };
  }

  // Remove índices numéricos e limpa segmentos
  const segments = path.split('.').filter((s) => !/^\d+$/.test(s));
  const last = segments[segments.length - 1] || path;
  const parent = segments.length > 1 ? segments[segments.length - 2] : '';

  let normalizedKey = last;

  if (last === 'label' && parent === 'details') {
    normalizedKey = 'detail_label';
  } else if (last === 'value' && parent === 'details') {
    normalizedKey = 'detail_value';
  } else if (last === 'features' || parent === 'features') {
    normalizedKey = 'feature';
  } else if (last === 'price' || last === 'price_cents' || last === 'price_unit') {
    normalizedKey = 'price';
  } else if (last === 'description' || last === 'body' || last === 'text' || last === 'note') {
    normalizedKey = 'description';
  } else if (last === 'subtitle') {
    normalizedKey = 'subtitle';
  } else if (last === 'title' || last === 'name') {
    normalizedKey = 'title';
  } else if (last === 'title_italic' || last === 'cta_italic') {
    normalizedKey = 'title_italic';
  } else if (last === 'eyebrow' || last === 'vertical_label' || last === 'side_label') {
    normalizedKey = 'eyebrow';
  } else if (last === 'btnText' || last === 'button_text') {
    normalizedKey = 'btnText';
  } else if (last === 'photographer_name' || last === 'signature' || last === 'copyright') {
    normalizedKey = 'photographer_name';
  }

  const def = BOUNDS_BY_KEY[normalizedKey] ?? {
    role: 'body' as TextRole,
    label: last.charAt(0).toUpperCase() + last.slice(1),
    min: 11,
    max: 48,
    defaultSize: 16,
  };

  return {
    fieldKey: normalizedKey,
    ...def,
  };
}
