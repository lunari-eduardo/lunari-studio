-- Fix missing InfinitePay transaction for Lisiane - Otávio session
-- The cobranca (id: 2e63ba6f) shows as paid but no clientes_transacoes record exists
INSERT INTO clientes_transacoes (user_id, cliente_id, session_id, valor, tipo, data_transacao, descricao) 
VALUES (
  'db0ca3d8-8848-4194-aa74-40d265b73849', 
  'ec03d80d-c216-4685-bb7b-e83e3e5397f4', 
  'workflow-1771610846081-03ol8fqdrkbm', 
  115, 
  'pagamento', 
  '2026-03-04', 
  'Pagamento InfinitePay (Link) - fotos extras [retroativo]'
)
ON CONFLICT DO NOTHING;