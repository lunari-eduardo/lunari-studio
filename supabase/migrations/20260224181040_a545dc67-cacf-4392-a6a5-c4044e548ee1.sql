
-- Inserir transação faltante para a sessão afetada (fotos extras R$25)
-- O trigger recompute_session_paid recalculará valor_pago automaticamente
INSERT INTO public.clientes_transacoes (
  user_id, cliente_id, session_id, valor, tipo, data_transacao, descricao
) VALUES (
  'db0ca3d8-8848-4194-aa74-40d265b73849',
  'fbb86f3f-cc13-4c9f-8c29-cf8a11ffd1a0',
  'workflow-1770819329231-lt1vtcjy9n',
  25,
  'pagamento',
  '2026-02-24',
  'Pagamento InfinitePay (Link) - 1 foto extra - Vicente - 4 meses [retroativo]'
);
