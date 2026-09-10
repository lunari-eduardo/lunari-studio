import React from 'react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { EntitlementKey } from '@/lib/entitlements';
import { useProModal } from './ProUpgradeModal';

interface ProGateProps {
  children: React.ReactNode;
  entitlement?: EntitlementKey;
  fallback?: React.ReactNode;
  opacity?: boolean;
}

export function ProGate({ children, entitlement, fallback, opacity = false }: ProGateProps) {
  const { hasEntitlement, isFree } = useEntitlements();
  const { openModal } = useProModal();

  const hasAccess = entitlement ? hasEntitlement(entitlement) : !isFree;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (opacity) {
    return (
      <div 
        className="relative group cursor-pointer" 
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openModal(entitlement);
        }}
      >
        <div className="opacity-40 pointer-events-none filter blur-[1px] transition-all group-hover:blur-[2px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background/95 text-foreground px-3 py-1.5 rounded-full shadow-lg border text-sm font-medium flex items-center gap-2">
            <span className="text-amber-500">👑</span>
            Recurso Pro
          </div>
        </div>
      </div>
    );
  }

  return null;
}
