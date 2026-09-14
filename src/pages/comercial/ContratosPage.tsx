import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import ContratosConfig from '@/components/configuracoes/ContratosConfig';
import { PAGE_SCROLL_SHELL } from '@/components/layout/PageTabs';

export default function ContratosPage() {
  return (
    <div className={PAGE_SCROLL_SHELL}>
      <PageContainer className="py-4 pb-10">
        <PageHeader
          title="Contratos"
          description="Crie e gerencie templates de contratos para seus clientes."
        />
        <div className="mt-6">
          <ContratosConfig />
        </div>
      </PageContainer>
    </div>
  );
}
