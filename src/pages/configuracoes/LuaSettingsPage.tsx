import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PAGE_TABS_LIST, PAGE_TABS_TRIGGER, PAGE_TABS_CONTENT, PAGE_SCROLL_SHELL } from '@/components/layout/PageTabs';
import { Brain, BookOpen, Library, TerminalSquare } from 'lucide-react';

import { DNAView } from '@/components/lua/config/DNAView';
import { StudioKnowledgeEditor } from '@/components/lua/config/StudioKnowledgeEditor';
import { BibliotecaInteligente } from '@/components/lua/biblioteca/BibliotecaInteligente';
import { TestLuaPlayground } from '@/components/lua/config/TestLuaPlayground';

export default function LuaSettingsPage() {
  const [tabAtiva, setTabAtiva] = useState('dna');

  return (
    <div className={PAGE_SCROLL_SHELL}>
      <PageContainer className="py-4 pb-10">
        <PageHeader
          title="Assistente Lua"
          description="Configure o DNA de atendimento, conhecimento e modelos para sua IA."
        />

        <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="w-full">
          <TabsList className={PAGE_TABS_LIST}>
            <TabsTrigger value="dna" className={PAGE_TABS_TRIGGER} title="DNA de Atendimento">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">DNA de Atendimento</span>
            </TabsTrigger>
            <TabsTrigger value="conhecimento" className={PAGE_TABS_TRIGGER} title="Conhecimento">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Conhecimento</span>
            </TabsTrigger>
            <TabsTrigger value="biblioteca" className={PAGE_TABS_TRIGGER} title="Biblioteca">
              <Library className="h-4 w-4" />
              <span className="hidden sm:inline">Biblioteca de Modelos</span>
            </TabsTrigger>
            <TabsTrigger value="teste" className={PAGE_TABS_TRIGGER} title="Testar Lua">
              <TerminalSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Testar Lua</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dna" className={PAGE_TABS_CONTENT}>
            <DNAView />
          </TabsContent>
          
          <TabsContent value="conhecimento" className={PAGE_TABS_CONTENT}>
            <StudioKnowledgeEditor />
          </TabsContent>
          
          <TabsContent value="biblioteca" className={PAGE_TABS_CONTENT}>
            <div className="py-2">
              <BibliotecaInteligente />
            </div>
          </TabsContent>
          
          <TabsContent value="teste" className={PAGE_TABS_CONTENT}>
            <div className="max-w-3xl mx-auto py-2">
              <TestLuaPlayground />
            </div>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </div>
  );
}
