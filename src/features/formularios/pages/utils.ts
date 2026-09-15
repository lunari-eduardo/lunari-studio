/**
 * Utilitários para o editor de formulários.
 *
 *  - `newFieldId`        — gera IDs locais para novos campos.
 *  - `defaultCampoFor`   — cria um campo novo com defaults sensatos por tipo.
 *  - `duplicateCampo`    — copia um campo gerando novo id.
 *  - `reorderCampos`     — reordena lista após drag & drop.
 *  - `formulariosAreEqual` — comparação rasa dos campos para detectar
 *                            alterações (regra 20 — proteção contra perda).
 *
 * IDs locais (não-UUID): para campos do formulário usamos IDs client-side
 * no formato `campo_<timestamp>_<rand>` enquanto o rascunho não foi
 * persistido. Quando o formulário é salvo, o Supabase aceita o array
 * completo (campos é JSONB) e os IDs são preservados localmente — o
 * backend não sobrescreve.
 */
import type {
  FormularioCampo,
  FormularioCampoTipo,
} from '@/types/formulario';

const rand = () => Math.random().toString(36).slice(2, 8);

export function newFieldId(): string {
  return `campo_${Date.now()}_${rand()}`;
}

export function defaultCampoFor(
  tipo: FormularioCampoTipo,
  ordem: number,
): FormularioCampo {
  const id = newFieldId();
  const base: FormularioCampo = {
    id,
    tipo,
    label: '',
    descricao: undefined,
    obrigatorio: false,
    ordem,
  };

  switch (tipo) {
    case 'texto_curto':
    case 'texto_longo':
    case 'data':
    case 'selecao_cores':
      return { ...base, placeholder: '' };
    case 'selecao_unica':
    case 'multipla_escolha':
      return { ...base, opcoes: ['Opção 1', 'Opção 2'] };
    case 'upload_referencia':
    case 'upload_imagem':
      return {
        ...base,
        obrigatorio: false,
      };
  }
}

export function duplicateCampo(
  campo: FormularioCampo,
  ordem: number,
): FormularioCampo {
  return {
    ...campo,
    id: newFieldId(),
    ordem,
  };
}

export function reorderCampos(
  campos: FormularioCampo[],
  fromId: string,
  toId: string,
): FormularioCampo[] {
  const fromIdx = campos.findIndex((c) => c.id === fromId);
  const toIdx = campos.findIndex((c) => c.id === toId);
  if (fromIdx < 0 || toIdx < 0) return campos;
  const next = [...campos];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  // Reindexar ordem
  return next.map((c, idx) => ({ ...c, ordem: idx + 1 }));
}

/**
 * Compara dois arrays de campos por estrutura (ordem não importa; comparamos
 * pelo JSON dos campos ordenados por id). Detecta reordenação, edição de
 * label/descrição, adição, remoção, e mudança de obrigatoriedade.
 */
export function formulariosAreEqual(
  a: FormularioCampo[],
  b: FormularioCampo[],
): boolean {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort((x, y) => x.id.localeCompare(y.id));
  const bSorted = [...b].sort((x, y) => x.id.localeCompare(y.id));
  for (let i = 0; i < aSorted.length; i++) {
    if (JSON.stringify(aSorted[i]) !== JSON.stringify(bSorted[i])) {
      return false;
    }
  }
  return true;
}
