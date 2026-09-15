/**
 * Editor utilities — helpers para o editor de formulários.
 *
 * Mantém a regra de "mínimo 1s para evitar reorder acidental" do dnd-kit
 * (touch) centralizada e provê função de criar novo campo vazio a partir
 * de um tipo, replicando defaults já usados no `FormularioTemplateEditor`.
 */
import type {
  FormularioCampo,
  FormularioCampoTipo,
} from '@/types/formulario';

/**
 * Gera um id estável para um novo campo. Mantém compatibilidade com o
 * `crypto.randomUUID()` já usado no editor de templates.
 */
export function newFieldId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `f_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

/**
 * Defaults para cada tipo de campo. Espelha o que `FormularioTemplateEditor`
 * já fazia no template editor.
 */
export function defaultCampoFor(tipo: FormularioCampoTipo, ordem: number): FormularioCampo {
  const base: FormularioCampo = {
    id: newFieldId(),
    tipo,
    label: '',
    ordem,
    obrigatorio: false,
  };

  if (tipo === 'selecao_unica' || tipo === 'multipla_escolha') {
    return { ...base, opcoes: ['Opção 1', 'Opção 2'] };
  }
  return base;
}

/**
 * Duplica um campo preservando configurações. Gera novo id, ajusta ordem e
 * adiciona " (cópia)" ao label.
 */
export function duplicateCampo(
  campo: FormularioCampo,
  newOrdem: number,
): FormularioCampo {
  return {
    ...campo,
    id: newFieldId(),
    label: `${campo.label} (cópia)`,
    ordem: newOrdem,
    opcoes: campo.opcoes ? [...campo.opcoes] : undefined,
  };
}

/**
 * Reordena array de campos após drag & drop, mantendo `ordem` consistente
 * com a posição no array (1-indexed).
 */
export function reorderCampos(
  campos: FormularioCampo[],
  fromId: string,
  toId: string,
): FormularioCampo[] {
  if (fromId === toId) return campos;
  const fromIdx = campos.findIndex((c) => c.id === fromId);
  const toIdx = campos.findIndex((c) => c.id === toId);
  if (fromIdx === -1 || toIdx === -1) return campos;

  const next = [...campos];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);

  return next.map((c, idx) => ({ ...c, ordem: idx + 1 }));
}

/**
 * Compare raso profundo o bastante para detectar "isDirty" entre `saved` e
 * `draft`. Não compara `updated_at` nem `created_at` (mudam após save).
 */
export function formulariosAreEqual(
  a: FormularioCampo[] | undefined,
  b: FormularioCampo[] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.tipo !== y.tipo ||
      x.label !== y.label ||
      x.placeholder !== y.placeholder ||
      x.ordem !== y.ordem ||
      x.obrigatorio !== y.obrigatorio ||
      x.descricao !== y.descricao ||
      (x.opcoes?.length ?? 0) !== (y.opcoes?.length ?? 0)
    )
      return false;
    if (x.opcoes && y.opcoes) {
      for (let j = 0; j < x.opcoes.length; j++) {
        if (x.opcoes[j] !== y.opcoes[j]) return false;
      }
    }
  }
  return true;
}
