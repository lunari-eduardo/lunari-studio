import type { BlockData } from '@/hooks/useMaterialEditor';
import { isEmptyValue } from './normalization';

/**
 * Base segura no Cloudflare R2 para fotos de exemplo do sistema.
 * Arquivos neste prefixo são somente de leitura para os fotógrafos e
 * nunca são excluídos nas rotinas de limpeza de propostas de usuários.
 */
export const EXAMPLE_PHOTO_BASE = 'https://media.lunarihub.com/gestao/system/exemplos/';

export const isExamplePhoto = (url: unknown): url is string =>
  typeof url === 'string' && url.startsWith(EXAMPLE_PHOTO_BASE);

/**
 * Caminho pontuado -> URL da foto de exemplo.
 * Sem prefixo = content (ex: 'image_url', 'packages.0.image_ref').
 * Com 'props.' = props (ex: 'props.photo_a.image_ref').
 */
export type ExampleSlotMapping = Record<string, string>;

/** slot_id do bloco no modelo -> mapeamento de fotos para seus campos */
export type ExampleCollectionManifest = Record<string, ExampleSlotMapping>;

/**
 * Manifesto de fotos de exemplo por coleção temática.
 * Cada coleção define suas imagens associadas aos slots estruturais (sn_* no caso de Natal).
 */
export const EXAMPLE_PHOTOS: Record<string, ExampleCollectionManifest> = {
  natal: {
    // Será alimentado com as URLs finais mapeadas da proposta modelo
  },
};

/** Retorna a miniatura de capa para a vitrine quando o template pertence a uma coleção temática */
export function getTemplateExampleThumbnail(tags?: string[] | null): string | null {
  if (!tags || !Array.isArray(tags)) return null;
  if (tags.includes('natal')) {
    return (
      EXAMPLE_PHOTOS.natal?.sn_cover_arcos?.image_url ??
      EXAMPLE_PHOTOS.natal?.sn_cover_arcos?.photo_b ??
      null
    );
  }
  return null;
}

function getPath(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const keys = path.split('.');
  let cursor = obj;
  for (const k of keys) {
    if (cursor == null || typeof cursor !== 'object') return undefined;
    cursor = cursor[k];
  }
  return cursor;
}

function setPath(obj: Record<string, any>, path: string, value: any): Record<string, any> {
  const keys = path.split('.');
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  let cursor: any = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    cursor[k] = Array.isArray(cursor[k]) ? [...cursor[k]] : { ...(cursor[k] ?? {}) };
    cursor = cursor[k];
  }
  const lastKey = keys[keys.length - 1];
  if (lastKey !== '__proto__' && lastKey !== 'constructor' && lastKey !== 'prototype') {
    cursor[lastKey] = value;
  }
  return clone as Record<string, any>;
}

/**
 * Overlay puro e imutável de fotos de exemplo.
 * Só preenche slots que estiverem VAZIOS no bloco e que possuam correspondência
 * no manifesto da coleção ativa. Se o usuário já enviou sua própria foto, ela é mantida.
 */
export function withExamplePhotos(blocks: BlockData[], collection?: string | null): BlockData[] {
  if (!collection || !EXAMPLE_PHOTOS[collection] || !Array.isArray(blocks) || blocks.length === 0) {
    return blocks;
  }

  const manifest = EXAMPLE_PHOTOS[collection];
  let anyBlockChanged = false;

  const result = blocks.map((block) => {
    if (!block || typeof block !== 'object') return block;

    // slot_id é preservado pelo hidratador; se ausente (bloco cru de preview), usa o próprio id do modelo
    const slotId = (block.props?.slot_id || block.id) as string | undefined;
    if (!slotId || !manifest[slotId]) return block;

    const mapping = manifest[slotId];
    let content = block.content;
    let props = block.props;
    let blockChanged = false;

    for (const [path, exampleUrl] of Object.entries(mapping)) {
      if (!exampleUrl) continue;

      if (path.startsWith('props.')) {
        const subPath = path.slice('props.'.length);
        const currentVal = getPath(props, subPath);
        if (isEmptyValue(currentVal)) {
          props = setPath(props ?? {}, subPath, exampleUrl);
          blockChanged = true;
        }
      } else {
        const currentVal = getPath(content, path);
        if (isEmptyValue(currentVal)) {
          content = setPath(content ?? {}, path, exampleUrl);
          blockChanged = true;
        }
      }
    }

    if (!blockChanged) return block;

    anyBlockChanged = true;
    return {
      ...block,
      content,
      props,
    };
  });

  return anyBlockChanged ? result : blocks;
}

/**
 * Higienizador profundo: substitui qualquer ocorrência de URL de exemplo por string vazia ('').
 * Impede que fotos mockadas sejam persistidas no banco ou salvas em versões de materiais.
 */
export function stripExamplePhotos<T>(value: T): T {
  if (value == null) return value;

  if (typeof value === 'string') {
    return (isExamplePhoto(value) ? '' : value) as unknown as T;
  }

  if (Array.isArray(value)) {
    let changed = false;
    const cleaned = value.map((item) => {
      const next = stripExamplePhotos(item);
      if (next !== item) changed = true;
      return next;
    });
    return (changed ? cleaned : value) as unknown as T;
  }

  if (typeof value === 'object') {
    let changed = false;
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      const next = stripExamplePhotos(v);
      if (next !== v) changed = true;
      cleaned[k] = next;
    }
    return (changed ? cleaned : value) as unknown as T;
  }

  return value;
}
