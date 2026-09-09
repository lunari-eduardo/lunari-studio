import { useMemo } from 'react';
import {
  useAvailabilityQuery,
  useAddAvailabilityMutation,
  useClearAvailabilityMutation,
  useDeleteAvailabilitySlotMutation,
  useDeleteAvailabilitySlotsMutation,
} from '@/modules/agenda/presentation';
import { useAvailabilityTypes } from './useAvailabilityTypes';
import type { AvailabilitySlot } from '@/types/availability';

/**
 * @deprecated Prefira hooks especializados de `@/modules/agenda` e
 * `@/hooks/useAvailabilityTypes`. Este shim agrega as APIs antigas para
 * compatibilidade. Não depende mais de `AgendaContext` (removido na onda 7d3).
 */

// Range amplo: `listAvailability` ignora o range (input vazio no schema),
// então estes valores apenas servem como queryKey estável.
const WIDE_RANGE = { start: '1970-01-01', end: '2999-12-31' } as const;

export const useAvailability = () => {
  const { data } = useAvailabilityQuery(WIDE_RANGE);
  const types = useAvailabilityTypes();
  const addMut = useAddAvailabilityMutation();
  const clearMut = useClearAvailabilityMutation();
  const deleteMut = useDeleteAvailabilitySlotMutation();
  const deleteSlotsMut = useDeleteAvailabilitySlotsMutation();

  const availability = (data ?? []) as AvailabilitySlot[];

  return useMemo(
    () => ({
      availability,
      availabilityTypes: types.availabilityTypes,
      addAvailabilitySlots: async (slots: Omit<AvailabilitySlot, 'id'>[]) => {
        await addMut.mutateAsync({ slots });
      },
      clearAvailabilityForDate: async (date: string) => {
        await clearMut.mutateAsync({ date });
      },
      deleteAvailabilitySlot: async (id: string) => {
        await deleteMut.mutateAsync({ id });
      },
      deleteAvailabilitySlots: async (ids: string[]) => {
        await deleteSlotsMut.mutateAsync({ ids });
      },
      addAvailabilityType: types.addAvailabilityType,
      updateAvailabilityType: types.updateAvailabilityType,
      deleteAvailabilityType: types.deleteAvailabilityType,
    }),
    [availability, types, addMut, clearMut, deleteMut, deleteSlotsMut],
  );
};
