import re
import sys

with open('src/components/conversas/context/ChatContextPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import WorkflowPaymentsModal
import_statement = "import { WorkflowPaymentsModal } from '@/components/workflow/WorkflowPaymentsModal';\nimport { ChargeModal } from '@/components/cobranca/ChargeModal';\nimport type { SessionData } from '@/types/workflow';\n"
content = content.replace("import { ContactHeaderCard }", import_statement + "import { ContactHeaderCard }")

# 2. Add handleOpenWorkflow
open_workflow_func = """
  const handleOpenWorkflow = (id?: string) => {
    if (!id && sessoes?.[0]?.id) {
      id = sessoes[0].id;
    }
    if (!id) {
      navigate('/app/workflow');
      return;
    }
    const sessao = sessoes?.find((s) => s.id === id);
    if (sessao?.data_sessao) {
      const dataObj = new Date(sessao.data_sessao);
      const month = dataObj.getMonth();
      const year = dataObj.getFullYear();
      navigate(`/app/workflow?open_session=${id}&month=${month}&year=${year}`);
    } else {
      navigate(`/app/workflow?open_session=${id}`);
    }
  };

  const getActiveSessionData = (): SessionData | null => {
    if (!sessoes || sessoes.length === 0) return null;
    const sess = sessoes[0];
    return {
      id: sess.id,
      sessionId: sess.session_id,
      valorTotal: sess.valor_total,
      clienteId: cliente?.id,
    } as unknown as SessionData;
  };
"""

content = content.replace("const chatState = useChatStateResolver({ cliente, lead, sessoes });", "const chatState = useChatStateResolver({ cliente, lead, sessoes });" + open_workflow_func)

# 3. Replace <SmartSessionCard onOpenWorkflow={(id) => {...}} /> with <SmartSessionCard onOpenWorkflow={handleOpenWorkflow} />
content = re.sub(r'<SmartSessionCard\s+sessoes={sessoes}\s+onOpenWorkflow={\(id\) => \{.*?\n\s*\}\}\s*/>', '<SmartSessionCard sessoes={sessoes} onOpenWorkflow={handleOpenWorkflow} />', content, flags=re.DOTALL)

# 4. Update QuickActionsCard
quick_actions_repl = """<QuickActionsCard 
              state={chatState} 
              hasCliente={!!cliente?.id} 
              onNavigate={navigate} 
              onOpenWorkflow={() => handleOpenWorkflow()}
              onOpenPayment={() => setIsPaymentModalOpen(true)}
              onOpenChargeLink={() => setIsChargeLinkModalOpen(true)}
            />"""

content = re.sub(r'<QuickActionsCard state=\{chatState\} hasCliente=\{.*?\} onNavigate=\{navigate\} />', quick_actions_repl, content)

# 5. Add Modals before final div
modals_str = """
      {/* ─── Modais ──────────────────────────────────────────────────────── */}
      {isPaymentModalOpen && getActiveSessionData() && (
        <WorkflowPaymentsModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          sessionData={getActiveSessionData()!}
          onPaymentUpdate={() => {}}
        />
      )}
      {isChargeLinkModalOpen && getActiveSessionData() && (
        <ChargeModal
          isOpen={isChargeLinkModalOpen}
          onClose={() => setIsChargeLinkModalOpen(false)}
          clienteId={getActiveSessionData()!.clienteId || ''}
          clienteNome={cliente?.nome || ''}
          sessionId={getActiveSessionData()!.id}
        />
      )}
    </div>
"""
content = content.replace("    </div>\n  );\n}", modals_str + "  );\n}")

with open('src/components/conversas/context/ChatContextPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)



