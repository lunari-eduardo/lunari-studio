import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Card } from '@/components/ui/card';
import { OfflineScreen } from '@/components/OfflineScreen';
import { SessionExpiredScreen } from '@/components/SessionExpiredScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Routes that are allowed even without an active subscription
const SUBSCRIPTION_EXEMPT_ROUTES = [
  '/escolher-plano',
  '/escolher-plano/pagamento',
  '/minha-assinatura',
  '/minha-conta', // Needed for post-checkout sync
  '/onboarding', // Allow new users to complete onboarding
  '/integracoes', // Allow connecting payment providers
  '/integracoes/callback', // OAuth callback
];

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, isProfileError } = useUserProfile();
  const { accessState, loading: accessLoading, refetchAccess } = useAccessControl();
  const { isOnline, lastOnlineAt, isInitializing } = useOnlineStatus();
  const location = useLocation();

  // Guarda o estado indicando que estamos num callback OAuth
  // (evita Race Condition entre React Router limando a URL e Supabase pegando o PKCE code)
  const isOauthPending = React.useRef(
    location.search.includes('code=') || location.hash.includes('access_token=')
  );

  React.useEffect(() => {
    // Quando o usuário for finalmente carregado (ou se soubermos que falhou definitivamente)
    // a trava é liberada para fluxos normais operarem.
    if (user || (!authLoading && !user)) {
      // Pequeno timeout garantindo que qualquer processamento asíncrono finalizou
      const timer = setTimeout(() => {
        isOauthPending.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);

  // 1. Verificar autenticação. 
  // Seguramos no Spinner se a trava de OAuth estiver ativa (isOauthPending.current === true)
  if (
    authLoading || 
    profileLoading || 
    accessLoading || 
    (user && isProfileError && !profile) ||
    isOauthPending.current
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate 
        to={{ pathname: '/auth', search: location.search, hash: location.hash }} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // 2. Verificar conectividade - ANTES de verificar subscription
  // IMPORTANTE: Ignorar durante inicialização para evitar flash de "sem conexão"
  if (!isInitializing && (!isOnline || accessState.status === 'network_error')) {
    return (
      <OfflineScreen 
        onRetry={refetchAccess} 
        lastOnlineAt={lastOnlineAt}
        isNetworkError={accessState.status === 'network_error'}
      />
    );
  }

  // 3. Verificar sessão expirada
  if (accessState.status === 'session_expired') {
    const handleRelogin = async () => {
      await signOut();
      window.location.href = '/auth?reason=session_expired';
    };
    return <SessionExpiredScreen onRelogin={handleRelogin} />;
  }

  // 4. Verificar controle de acesso (assinatura)
  if (accessState.status === 'suspended') {
    signOut();
    return <Navigate to="/auth?reason=suspended" replace />;
  }

  // 6. Verificar onboarding ANTES da subscription wall
  // (novos usuários sem trial precisam completar onboarding para ativar o trial)
  if (location.pathname !== '/onboarding') {
    const needsOnboarding = !profile || !profile.is_onboarding_complete;
      
    if (needsOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
};
