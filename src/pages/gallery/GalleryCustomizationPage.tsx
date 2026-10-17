import { useState } from 'react';
import { Palette, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SaveStatus } from '@/components/ui/save-status';
import { useGallerySettings } from '@/hooks/useGallerySettings';
import { useUserProfile } from '@/hooks/useUserProfile';
import { CustomizationAppearanceTab } from '@/components/settings/customization/CustomizationAppearanceTab';
import { CustomizationCommunicationTab } from '@/components/settings/customization/CustomizationCommunicationTab';

export default function GalleryCustomizationPage() {
  const {
    settings,
    updateSettings,
    isUpdating,
    updateEmailTemplate,
    isUpdatingEmailTemplate
  } = useGallerySettings();
  const { profile } = useUserProfile();

  const [activeTab, setActiveTab] = useState('aparencia');

  if (!settings) return null;

  return (
    <div
      className="max-w-[79rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-8 animate-fade-in"
      style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}
    >
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Personalização
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Identidade visual e comunicação das suas galerias.
          </p>
        </div>
        <SaveStatus saving={isUpdating} />
      </div>

      {/* Abas de Configuração */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/60 inline-flex h-auto">
          <TabsTrigger
            value="aparencia"
            className="rounded-lg border-0 mb-0 px-4 py-2 text-xs sm:text-sm font-medium gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Palette className="w-4 h-4" />
            <span>Aparência</span>
          </TabsTrigger>
          <TabsTrigger
            value="comunicacao"
            className="rounded-lg border-0 mb-0 px-4 py-2 text-xs sm:text-sm font-medium gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Comunicação</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aparencia" className="mt-0 outline-none focus-visible:ring-0">
          <CustomizationAppearanceTab
            settings={settings}
            updateSettings={updateSettings}
            studioName={settings.studioName}
            studioLogoUrl={settings.studioLogo || profile?.logo_url || undefined}
          />
        </TabsContent>

        <TabsContent value="comunicacao" className="mt-0 outline-none focus-visible:ring-0">
          <CustomizationCommunicationTab
            settings={settings}
            updateSettings={updateSettings}
            updateEmailTemplate={updateEmailTemplate as any}
            isUpdatingEmailTemplate={isUpdatingEmailTemplate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
