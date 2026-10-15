import { createContext, useContext } from 'react';
import type { ItemRef } from '../../../blocks/inspectorFocus';

/**
 * Navegação lista → detalhe do inspetor, entregue às listas ricas (pacotes, grupos, adicionais,
 * depoimentos). Sem provedor (ex.: harness antigo), as listas voltam ao acordeão no lugar.
 */
export interface InspectorNav {
  /** Última linha aberta: volta marcada na lista. */
  last: ItemRef | null;
  /** Abre o detalhe do item. */
  openItem: (ref: ItemRef) => void;
  /** Grupos da árvore de pacotes recolhidos pelo fotógrafo (ausente = regra padrão). */
  collapsed?: string[];
  setCollapsed: (keys: string[]) => void;
}

export const InspectorNavContext = createContext<InspectorNav | null>(null);
export const useInspectorNav = () => useContext(InspectorNavContext);
