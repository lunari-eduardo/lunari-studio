import React, { createContext, useContext } from 'react';

// Handle de edição inline fornecido pelo VisualRenderer para cada bloco
export interface InlineEditHandle {
  editable: boolean;
  set: (path: string, value: any) => void;
  /** Campo de texto selecionado para ajuste de tamanho (clique único em modo editor). */
  activeTextField?: string | null;
  /** Callback para selecionar um campo de texto e abrir o popover de tamanho. */
  onSelectTextField?: (fieldKey: string | null, anchorEl: HTMLElement | null) => void;
}

export const InlineEditContext = createContext<InlineEditHandle | null>(null);

export function useInlineEdit(): InlineEditHandle | null {
  return useContext(InlineEditContext);
}
