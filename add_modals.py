import sys

with open('src/components/conversas/context/ChatContextPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

modals_str = """
      {/* --- Modais --- */}
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
    </Container>
"""

content = content.replace("    </Container>", modals_str)

with open('src/components/conversas/context/ChatContextPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
