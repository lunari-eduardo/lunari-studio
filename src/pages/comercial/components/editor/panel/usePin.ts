import { useCallback, useEffect, useState } from 'react';
import { safeStorage } from '@/lib/safeStorage';
import type { PinRef } from '../../../blocks/inspectorFocus';

const keyFor = (materialId?: string) => (materialId ? `lunari:proposal:pin:${materialId}` : '');

const read = (key: string): PinRef | null => {
  const v = key ? safeStorage.json<PinRef | null>(key, null) : null;
  return v && typeof v.blockId === 'string' ? v : null;
};

/**
 * Item fixado da proposta: preferência do aparelho (fora do documento, do histórico e do autosave).
 * Chaveado por `materialId`, nunca por `versionId` (muda no primeiro save sobre uma versão publicada).
 */
export function usePin(materialId?: string): [PinRef | null, (pin: PinRef | null) => void] {
  const key = keyFor(materialId);
  const [pin, setPin] = useState<PinRef | null>(() => read(key));
  useEffect(() => setPin(read(key)), [key]);
  const update = useCallback(
    (next: PinRef | null) => {
      setPin(next);
      if (!key) return;
      if (next) safeStorage.setJson(key, next);
      else safeStorage.remove(key);
    },
    [key]
  );
  return [pin, update];
}
