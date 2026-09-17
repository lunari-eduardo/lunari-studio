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

  // Bottom nav is shown on mobile and tablet-portrait
  const hasBottomNav = isMobile || responsiveMode === 'tablet-portrait';

  return <div className="flex bg-background" style={{ height: '100dvh' }}>
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden relative bg-background">


        <TrialBanner />
        <Header />

        <main
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden p-1 md:p-2 px-[8px] scrollbar-elegant py-0 my-0 relative z-10",
            hasBottomNav && "pb-14"
          )}
          style={hasBottomNav ? { paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))' } : undefined}
        >
          <div className="animate-lunar">
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
