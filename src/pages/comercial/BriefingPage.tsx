import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import FormulariosConfig from '@/components/configuracoes/FormulariosConfig';
import { PAGE_SCROLL_SHELL } from '@/components/layout/PageTabs';

export default function BriefingPage() {
  return (
    <div className={PAGE_SCROLL_SHELL}>
      <PageContainer className="py-4 pb-10">
        <PageHeader
          title="Briefing"
          description="Crie e gerencie templates de formulários e briefings para seus clientes."
        />
        <div className="mt-6">
          <FormulariosConfig />
        </div>
      </PageContainer>
    </div>
  );
}
