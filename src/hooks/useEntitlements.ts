import { useAccessControl } from './useAccessControl';
import { EntitlementKey } from '../lib/entitlements';

export function useEntitlements() {
  const { accessState } = useAccessControl();
  
  const hasEntitlement = (key: EntitlementKey): boolean => {
    // If admin, always true
    if (accessState?.isAdmin) return true;
    
    // Fallback to true if entitlements map is missing (defensive)
    if (!accessState?.entitlements) return true;
    
    return !!accessState.entitlements[key];
  };

  return {
    tier: accessState?.tier || 'pro',
    hasEntitlement,
    entitlements: accessState?.entitlements || {},
    isAdmin: accessState?.isAdmin || false,
    isTrial: accessState?.isTrial || false,
    isFree: accessState?.tier === 'free',
  };
}
