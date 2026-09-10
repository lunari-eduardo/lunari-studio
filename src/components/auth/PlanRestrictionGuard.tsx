import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useEntitlements } from "@/hooks/useEntitlements";
import { EntitlementKey, ENTITLEMENT_NAMES } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, ArrowRight } from "lucide-react";

interface PlanRestrictionGuardProps {
  children: ReactNode;
  requiredPlan?: "pro" | "starter";
  entitlement?: EntitlementKey;
}

export function PlanRestrictionGuard({ 
  children, 
  requiredPlan,
  entitlement
}: PlanRestrictionGuardProps) {
  const { loading } = useAccessControl();
  const { hasEntitlement, isFree } = useEntitlements();
  const navigate = useNavigate();

  // Se ainda está carregando, mostra loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Determine access based on entitlement or fallback to general 'pro' check
  const hasAccess = entitlement ? hasEntitlement(entitlement) : !isFree;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Starter tentando acessar feature Pro
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <Crown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-xl">Recurso exclusivo do plano Pro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {entitlement 
              ? `A funcionalidade de ${ENTITLEMENT_NAMES[entitlement]} está disponível apenas no plano Pro.`
              : `Este recurso está disponível apenas para assinantes do plano Pro.`}
            <br/><br/>
            Faça upgrade para desbloquear todas as funcionalidades ilimitadas.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate("/escolher-plano")}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Crown className="mr-2 h-4 w-4" />
              Fazer upgrade para Pro
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="w-full"
            >
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
