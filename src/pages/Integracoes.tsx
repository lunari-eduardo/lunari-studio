import { IntegracoesTab } from '@/components/preferencias/IntegracoesTab';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { PAGE_SCROLL_SHELL } from '@/components/layout/PageTabs';
import { PlanRestrictionGuard } from "@/components/auth/PlanRestrictionGuard";

export default function Integracoes() {
  return (
    <div className={PAGE_SCROLL_SHELL}>
      <PageContainer className="py-4 pb-10">
        <PageHeader
          title="Integrações"
          description="Gerencie as integrações e conexões da sua conta"
        />
        <PlanRestrictionGuard entitlement="integrations">
          <IntegracoesTab />
        </PlanRestrictionGuard>
      </PageContainer>
    </div>
  );
}
