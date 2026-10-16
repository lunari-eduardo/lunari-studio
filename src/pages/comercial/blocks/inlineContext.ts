import React, { createContext, useContext } from 'react';

// Handle de edição inline fornecido pelo VisualRenderer para cada bloco
export interface InlineEditHandle {
  editable: boolean;
  set: (path: string, value: any) => void;
  /** Campo de texto selecionado para ajuste de tamanho (clique único em modo editor). */
  activeTextField?: string | null;
  /** Callback para selecionar um campo de texto e abrir o popover de tamanho. */
  onSelectTextField?: (fieldKey: string | null, anchorEl: HTMLElement | null) => void;
  /** Tamanhos e cores de texto da seção (props.typography): EditableText com fieldKey aplica no editor e no público. */
  typography?: Record<string, number | string | undefined>;
  /** Foto da galeria selecionada nesta seção (índice em content.images). */
  selectedImage?: number | null;
  /** Clique simples numa foto da galeria: abre a barra da foto (tamanho, proporção, ordem). */
  onSelectImage?: (index: number, anchorEl: HTMLElement) => void;
  /** Item de lista aberto no painel desta seção ("packages:ID", "groups:KEY", "items:ID"): o cartão ganha contorno. */
  selectedItem?: string | null;
  /** Se verdadeiro, permite renderizar fotos de exemplo de coleções temáticas (modo editor ou preview de escolha) */
  showExamples?: boolean;
}

export const InlineEditContext = createContext<InlineEditHandle | null>(null);

export function useInlineEdit(): InlineEditHandle | null {
  return useContext(InlineEditContext);
}

/**
 * Âncora de um item de lista na arte (cartão de pacote, cabeçalho de grupo, adicional): só no editor.
 * `data-item` deixa o clique abrir o detalhe do item no painel; `data-selected` marca o aberto.
 * O público não recebe nenhum `data-*` (o HTML publicado não muda).
 */
export function useItemAnchor() {
  const inline = useInlineEdit();
  return (list: string, id?: string): Record<string, string> => {
    if (!inline?.editable || !id) return {};
    const key = `${list}:${id}`;
    return { 'data-item': key, ...(inline.selectedItem === key && { 'data-selected': 'true' }) };
  };
}
