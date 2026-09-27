import sys

with open('src/components/conversas/context/ChatContextPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
states = """  const navigate = useNavigate();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isChargeLinkModalOpen, setIsChargeLinkModalOpen] = useState(false);"""
content = content.replace("  const navigate = useNavigate();", states)

# Fix valorSugerido
calc_sugerido = """        <ChargeModal
          isOpen={isChargeLinkModalOpen}
          onClose={() => setIsChargeLinkModalOpen(false)}
          clienteId={getActiveSessionData()!.clienteId || ''}
          clienteNome={cliente?.nome || ''}
          sessionId={getActiveSessionData()!.id}
          valorSugerido={(sessoes?.[0]?.valor_total || 0) - (sessoes?.[0]?.valor_pago || 0)}
        />"""
content = content.replace("""        <ChargeModal
          isOpen={isChargeLinkModalOpen}
          onClose={() => setIsChargeLinkModalOpen(false)}
          clienteId={getActiveSessionData()!.clienteId || ''}
          clienteNome={cliente?.nome || ''}
          sessionId={getActiveSessionData()!.id}
        />""", calc_sugerido)

with open('src/components/conversas/context/ChatContextPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
