import { useQuery } from '@tanstack/react-query';
import { invokeEdgeWorker } from '@/integrations/edge-client';

export interface PublicThemeData {
  primaryColor: string | null;
  studioName: string | null;
  studioLogoUrl: string | null;
}

export function usePublicTheme(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-theme', userId],
    queryFn: async (): Promise<PublicThemeData> => {
      if (!userId) return { primaryColor: null, studioName: null, studioLogoUrl: null };

      const { data, error } = await invokeEdgeWorker('previews', 'get-public-theme', {
        body: { userId },
      });

      if (error) {
        console.warn('Erro ao carregar tema público:', error);
        return { primaryColor: null, studioName: null, studioLogoUrl: null };
      }

      return {
        primaryColor: (data?.primaryColor as string | null) ?? null,
        studioName: (data?.studioName as string | null) ?? null,
        studioLogoUrl: (data?.studioLogoUrl as string | null) ?? null,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
