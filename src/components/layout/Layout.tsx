import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { useResponsiveMode } from '@/hooks/useResponsiveMode';
import { EquipmentSyncNotification } from '@/components/equipments/EquipmentSyncNotification';
import { useEquipmentSync } from '@/hooks/useEquipmentSync';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { cn } from '@/lib/utils';
import { AssistantLauncher } from '@/modules/assistant';

export default function Layout() {
  const isMobile = useIsMobile();
  const responsiveMode = useResponsiveMode();
  const location = useLocation();

  // Inicializar monitoramento de equipamentos
  useEquipmentSync();

  // Bottom nav is shown on mobile and tablet-portrait (except in full-screen editor mode)
  const isEditor = location.pathname.startsWith('/app/comercial/construtor')
    || location.pathname === '/app/comercial/contratos/novo'
    || /^\/app\/comercial\/contratos\/[^/]+\/editor$/.test(location.pathname);

  const isConversas = location.pathname.startsWith('/app/conversas');
  const searchParams = new URLSearchParams(location.search);
  const isConversasChatMobile = (isMobile || responsiveMode === 'tablet-portrait') && isConversas && Boolean(searchParams.get('chat'));

  const isFullScreen = isEditor || isConversas;

  const hasBottomNav = (isMobile || responsiveMode === 'tablet-portrait') && !isEditor && !isConversasChatMobile;

  return <div className="flex bg-background" style={{ height: '100dvh' }}>
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden relative bg-background">


        {!isConversasChatMobile && <TrialBanner />}
        {!isConversasChatMobile && <Header />}

        <main
          className={cn(
            "flex-1 relative z-10",
            isFullScreen
              ? "flex flex-col min-h-0 overflow-hidden p-0 m-0"
              : "overflow-y-auto overflow-x-hidden p-1 md:p-2 px-[8px] scrollbar-elegant py-0 my-0",
            hasBottomNav && "pb-14"
          )}
          style={hasBottomNav ? { paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))' } : undefined}
        >
          <div className={cn("animate-lunar", isFullScreen && "flex-1 min-h-0 flex flex-col h-full")}>
            <Outlet />
          </div>
        </main>

      </div>
      
      {/* Equipment sync notifications */}
      <EquipmentSyncNotification />
      
      {/* Assistente Lu (Onda E.3) */}
      <AssistantLauncher />
    </div>;
}
