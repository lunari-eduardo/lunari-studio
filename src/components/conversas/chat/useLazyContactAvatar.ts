/**
 * Hook para carregamento sob demanda da foto de perfil do contato via Evolution API.
 * Dispara apenas quando o elemento entra no viewport (IntersectionObserver)
 * e evita requisições duplicadas usando cache em memória.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const avatarCache = new Map<string, string | null>();
const pendingFetches = new Set<string>();

export function useLazyContactAvatar(
  instanceId?: string,
  phone?: string | null,
  chatId?: string,
  currentAvatar?: string | null,
) {
  const [avatar, setAvatar] = useState<string | null>(currentAvatar ?? null);
  const elementRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (currentAvatar) {
      setAvatar(currentAvatar);
      return;
    }

    if (!phone || !instanceId) return;

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (avatarCache.has(cleanPhone)) {
      const cached = avatarCache.get(cleanPhone);
      if (cached) setAvatar(cached);
      return;
    }

    const el = elementRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    let observer: IntersectionObserver | null = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          observer?.disconnect();
          observer = null;

          if (pendingFetches.has(cleanPhone)) return;
          pendingFetches.add(cleanPhone);

          void (async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) return;

              const workerUrl = import.meta.env.VITE_EDGE_API_URL;
              if (!workerUrl) return;

              const res = await fetch(`${workerUrl}/api/conversas/fetch-avatar`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  instanceId,
                  phone: cleanPhone,
                  chatId,
                }),
              });

              if (res.ok) {
                const data = await res.json();
                const fetchedUrl = data?.avatarUrl ?? null;
                avatarCache.set(cleanPhone, fetchedUrl);
                if (fetchedUrl) {
                  setAvatar(fetchedUrl);
                }
              } else {
                avatarCache.set(cleanPhone, null);
              }
            } catch {
              avatarCache.set(cleanPhone, null);
            } finally {
              pendingFetches.delete(cleanPhone);
            }
          })();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(el);

    return () => {
      observer?.disconnect();
    };
  }, [instanceId, phone, chatId, currentAvatar]);

  return { avatar, elementRef };
}
