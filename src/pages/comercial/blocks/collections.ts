import { createContext, useContext } from 'react';

// ============================================================
// COLEÇÕES TEMÁTICAS (sem JSX: testado em scripts/test_template_instantiation.ts)
// Variantes e temas de uma coleção (ex.: Natal) só aparecem nas propostas daquela
// coleção. Liberar algo para os modelos padrão = remover o `collection` da variante.
// A proposta guarda a coleção em global_settings.data.collection (vem do modelo);
// o modelo é reconhecido na vitrine pela tag com o mesmo nome.
// ============================================================

export const PROPOSAL_COLLECTIONS: Record<string, { label: string }> = {
  natal: { label: 'Natal' },
};

/** Coleção de um modelo da vitrine (pela tag). Ausente = modelo padrão. */
export function templateCollection(tags?: string[] | null): string | undefined {
  return (tags ?? []).find((t) => !!PROPOSAL_COLLECTIONS[t]);
}

/**
 * Opções oferecidas (variantes, temas): numa proposta de coleção, as exclusivas dela quando o
 * bloco tem alguma (curadoria do modelo); senão, as padrão. O que está em uso nunca some.
 */
export function forCollection<T extends { collection?: string }>(
  items: T[],
  collection: string | undefined,
  inUse: (item: T) => boolean = () => false
): T[] {
  const own = collection ? items.filter((i) => i.collection === collection) : [];
  const pool = own.length ? own : items.filter((i) => !i.collection);
  return items.filter((i) => pool.includes(i) || inUse(i));
}

/** Coleção da proposta aberta no editor. */
export const ProposalCollectionContext = createContext<string | undefined>(undefined);
export const useProposalCollection = () => useContext(ProposalCollectionContext);
