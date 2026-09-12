import { useState, useEffect, useCallback } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../types';

interface UseClientGalleryAuthProps {
  identifier?: string;
  galleryResponse?: any;
  refetchGallery: () => Promise<any>;
}

export function useClientGalleryAuth({
  identifier,
  galleryResponse: initialGalleryResponse,
  refetchGallery,
}: UseClientGalleryAuthProps) {
  // Password state
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [sessionPassword, setSessionPassword] = useState<string | null>(() => {
    return identifier ? sessionStorage.getItem(`gallery_password_${identifier}`) : null;
  });

  // Visitor state (public galleries)
  const [requiresVisitor, setRequiresVisitor] = useState(false);
  const [visitorError, setVisitorError] = useState<string | undefined>();
  const [isRegisteringVisitor, setIsRegisteringVisitor] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(() => {
    return identifier ? localStorage.getItem(`gallery_visitor_${identifier}`) : null;
  });
  const [visitorName, setVisitorName] = useState<string | null>(() => {
    return identifier ? localStorage.getItem(`gallery_visitor_name_${identifier}`) : null;
  });

  // Sincroniza resposta da galeria com o estado de autenticação
  const syncGalleryResponse = useCallback((res: any, error?: any) => {
    // Se a API retornou que a senha informada no sessionStorage está incorreta ou requer autenticação
    if (error?.message === 'Senha incorreta' || (error as any)?.code === 'WRONG_PASSWORD') {
      if (identifier) {
        sessionStorage.removeItem(`gallery_password_${identifier}`);
      }
      setSessionPassword(null);
      setRequiresPassword(true);
      setPasswordError('Senha incorreta');
      return;
    }

    if (res?.requiresPassword) {
      setRequiresPassword(true);
      if (res.error) setPasswordError(res.error);
    } else if (res?.photos || res?.deliver) {
      setRequiresPassword(false);
      setPasswordError(undefined);
    }

    if (res?.requiresVisitor) {
      setRequiresVisitor(true);
    } else if (res?.photos || res?.deliver) {
      setRequiresVisitor(false);
    }

    // Recuperar info de visitante da resposta
    const currentVisitorId = visitorId || (identifier ? localStorage.getItem(`gallery_visitor_${identifier}`) : null);
    const respVisitorId = res?.visitorId || res?.gallery?.visitorId;
    const respVisitorName = res?.visitorName || res?.gallery?.visitorName;

    if (respVisitorId && !currentVisitorId && identifier) {
      setVisitorId(respVisitorId);
      setVisitorName(respVisitorName || null);
      localStorage.setItem(`gallery_visitor_${identifier}`, respVisitorId);
      if (respVisitorName) {
        localStorage.setItem(`gallery_visitor_name_${identifier}`, respVisitorName);
      }
    }
  }, [identifier, visitorId]);

  // Handle password and visitor requirement from initial response if provided
  useEffect(() => {
    if (initialGalleryResponse) {
      syncGalleryResponse(initialGalleryResponse);
    }
  }, [initialGalleryResponse, syncGalleryResponse]);

  // Handle password submit
  const handlePasswordSubmit = async (password: string) => {
    if (!identifier) return;
    const cleanPassword = password.trim();
    if (!cleanPassword) return;

    setIsCheckingPassword(true);
    setPasswordError(undefined);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gallery-access`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ 
          token: identifier, 
          password: cleanPassword, 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        if (result.code === 'WRONG_PASSWORD') {
          setPasswordError('Senha incorreta');
          sessionStorage.removeItem(`gallery_password_${identifier}`);
          return;
        }
        throw new Error(result.error || 'Erro ao acessar galeria');
      }
      
      // Senha validada com sucesso
      sessionStorage.setItem(`gallery_password_${identifier}`, cleanPassword);
      setSessionPassword(cleanPassword);
      setRequiresPassword(false);
      setPasswordError(undefined);

      // Reexecuta query da galeria
      await refetchGallery();
    } catch (error: any) {
      setPasswordError(error?.message || 'Erro ao verificar senha');
      sessionStorage.removeItem(`gallery_password_${identifier}`);
    } finally {
      setIsCheckingPassword(false);
    }
  };

  // Handle visitor identification for public galleries
  const handleVisitorSubmit = async (data: { nome: string; contato: string; contatoTipo: 'email' | 'whatsapp' }) => {
    if (!identifier) return;
    setIsRegisteringVisitor(true);
    setVisitorError(undefined);
    
    try {
      // Generate simple device hash
      const deviceHash = btoa(`${data.contato}:${navigator.userAgent}`).slice(0, 64);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gallery-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: identifier, 
          password: sessionPassword,
          visitorData: {
            nome: data.nome,
            contato: data.contato,
            contatoTipo: data.contatoTipo,
            deviceHash,
          },
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setVisitorError(result.error || 'Erro ao registrar');
        return;
      }
      
      const newVisitorId = result.visitorId || result.gallery?.visitorId;
      const newVisitorName = result.visitorName || result.gallery?.visitorName;
      
      if (newVisitorId) {
        setVisitorId(newVisitorId);
        setVisitorName(newVisitorName || data.nome);
        localStorage.setItem(`gallery_visitor_${identifier}`, newVisitorId);
        localStorage.setItem(`gallery_visitor_name_${identifier}`, newVisitorName || data.nome);
        setRequiresVisitor(false);
        await refetchGallery();
      } else {
        setVisitorError('Erro ao criar sessão do visitante');
      }
    } catch (error) {
      setVisitorError('Erro ao conectar');
    } finally {
      setIsRegisteringVisitor(false);
    }
  };

  return {
    requiresPassword,
    setRequiresPassword,
    passwordError,
    isCheckingPassword,
    sessionPassword,
    handlePasswordSubmit,
    requiresVisitor,
    setRequiresVisitor,
    visitorError,
    isRegisteringVisitor,
    visitorId,
    visitorName,
    handleVisitorSubmit,
    syncGalleryResponse,
  };
}
