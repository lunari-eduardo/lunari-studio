import React from 'react';
import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProModal } from './ProUpgradeModal';
import { EntitlementKey } from '@/lib/entitlements';
import { useEntitlements } from '@/hooks/useEntitlements';

interface ProLockedBadgeProps {
  entitlement?: EntitlementKey;
  onClick?: () => void;
}

export function ProLockedBadge({ entitlement, onClick }: ProLockedBadgeProps) {
  const { openModal } = useProModal();
  const { hasEntitlement, isFree } = useEntitlements();

  const hasAccess = entitlement ? hasEntitlement(entitlement) : !isFree;

  if (hasAccess) return null;

  return (
    <Badge 
      variant="secondary" 
      className="ml-2 cursor-pointer bg-amber-100/50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClick) {
          onClick();
        } else {
          openModal(entitlement);
        }
      }}
    >
      <Crown className="w-3 h-3 mr-1" />
      Pro
    </Badge>
  );
}
