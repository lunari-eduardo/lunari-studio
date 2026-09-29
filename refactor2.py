import re
with open('d:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/conversas/context/ChatContextPanel.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

find = """          <RelationshipSummaryCard 
             context={unifiedContext}
             onCreateLead={() => setIsLeadModalOpen(true)}
             onLinkClient={() => setIsClientLinkModalOpen(true)}
          />

          {nextSession && (
            <>
              <SmartSessionCard 
                sessoes={[nextSession]} 
                onOpenWorkflow={handleOpenWorkflow} 
                onNavigate={navigate} 
                variant="next"
              />
              <FinancialSummaryCard sessao={nextSession} onNavigate={navigate} />
            </>
          )}

          {(activeWorkflow || state === 'ACTIVE_SESSION') && (activeWorkflow || lastSession) && (activeWorkflow || lastSession)?.id !== nextSession?.id && (
            <SmartSessionCard 
              sessoes={[activeWorkflow || lastSession]} 
              onOpenWorkflow={handleOpenWorkflow} 
              onNavigate={navigate} 
              variant="post_production"
            />
          )}

          <SessionHistoryList
            sessoes={sessoes.filter(s => s.id !== nextSession?.id && s.id !== (activeWorkflow || (state === 'ACTIVE_SESSION' ? lastSession : null))?.id)}
            onOpenWorkflow={handleOpenWorkflow}
          />"""

replace = """          {/* STATE MACHINE: Apenas um contexto ativo */}
          {state === 'NEW_CONTACT' || state === 'CLIENT' || state === 'OPEN_OPPORTUNITY' ? (
            <RelationshipSummaryCard 
               context={unifiedContext}
               onCreateLead={() => setIsLeadModalOpen(true)}
               onLinkClient={() => setIsClientLinkModalOpen(true)}
            />
          ) : null}

          {state === 'NEXT_SESSION' && nextSession && (
            <>
              <SmartSessionCard 
                sessoes={[nextSession]} 
                onOpenWorkflow={handleOpenWorkflow} 
                onNavigate={navigate} 
                variant="next"
              />
              <FinancialSummaryCard sessao={nextSession} onNavigate={navigate} />
            </>
          )}

          {state === 'ACTIVE_SESSION' && activeWorkflow && (
            <>
              <SmartSessionCard 
                sessoes={[activeWorkflow]} 
                onOpenWorkflow={handleOpenWorkflow} 
                onNavigate={navigate} 
                variant="post_production"
              />
              <FinancialSummaryCard sessao={activeWorkflow} onNavigate={navigate} />
            </>
          )}

          <SessionHistoryList
            sessoes={sessoes.filter(s => s.id !== nextSession?.id && s.id !== activeWorkflow?.id)}
            onOpenWorkflow={handleOpenWorkflow}
          />"""

text = text.replace(find, replace)
with open('d:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/conversas/context/ChatContextPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Phase 2 - ChatContextPanel cleaned")
