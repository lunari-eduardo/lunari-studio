import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Verifica se um slug está disponível (único no sistema).
 * Permite editar o slug sem colidir com outros links.
 */
export function useSlugAvailability(slug: string, excludeLinkId?: string) {
  return useQuery({
    queryKey: ['agenda-slug-availability', slug, excludeLinkId],
    queryFn: async () => {
      if (!slug || slug.length < 3) return { available: false, reason: 'muito-curto' as const };

      const { data, error } = await supabase
        .from('agenda_online_links')
        .select('id')
        .eq('slug', slug)
        .limit(1);

      if (error) throw error;

      const conflict = (data || []).find(d => d.id !== excludeLinkId);
      if (conflict) {
        return { available: false, reason: 'em-uso' as const };
      }

      return { available: true as const, reason: null };
    },
    enabled: !!slug && slug.length >= 3,
    staleTime: 30_000,
  });
}
