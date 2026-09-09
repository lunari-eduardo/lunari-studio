# Novo modelo de acesso: 30 dias completos → nível gratuito com Pro bloqueado

## Como vai funcionar

- Todo novo usuário ganha 30 dias com tudo liberado (todas as páginas, integrações, 500 créditos de seleção e 500 MB de transferência). A contagem começa ao concluir a configuração inicial, como hoje.
- Ao terminar os 30 dias sem assinatura, a conta **não é mais expulsa** para a tela de planos. Ela continua funcionando num nível gratuito com acesso a:
  - Agenda — sem tarefas, sem cobrança por link, sem configuração de horários/disponibilidade, sem agendamento online.
  - Workflow, incluindo criação de galerias de seleção e entrega — sem contratos, briefing e cobrança por link.
  - Clientes — sem a área de documentos (contratos e formulários).
  - Configurações — sem formulários e contratos.
  - Menu do usuário: tudo liberado, exceto Integrações e Pagamentos.
- Créditos de seleção não usados permanecem (são vitalícios) e param de renovar. O armazenamento de transferência cai para 0 MB — arquivos existentes não são apagados, apenas novos envios ficam bloqueados.
- Nada some da tela: itens restritos ficam opacos e, ao clique, abrem um modal elegante Lunari (dark e light) explicando que é recurso do plano Pro, com botão de assinar.
- Ao assinar o Pro, tudo volta imediatamente. Ao vencer sem renovar, volta ao nível gratuito. Dados nunca são apagados — apenas em "excluir conta".
- O plano Starter deixa de ser vendido: abaixo do Pro existe apenas o nível gratuito.

## Fase 1 — Fundação de permissões (banco)

Uma única fonte de verdade no banco, consumida por front e edge functions.

- Ampliar `get_access_state` para nunca mais devolver `trial_expired` como bloqueio total: passa a devolver `status: 'ok'`, `tier: 'free' | 'trial' | 'pro'` e um objeto `entitlements` (lista de chaves liberadas).
- Nova função `public.has_entitlement(_user_id uuid, _key text)` (SECURITY DEFINER, STABLE, `search_path=public`), derivando o tier de: admin → `allowed_emails` → VIP → assinatura ativa em `subscriptions_asaas` (`includes_studio`) → trial vigente em `profiles.studio_trial_*` → gratuito.
- Nova tabela `public.plan_entitlements` (chave da funcionalidade × tier), com GRANT de leitura para `authenticated`/`anon`, RLS ligada e política de leitura pública, para não hardcodar a matriz.
- Trial passa a conceder 500 créditos e 500 MB de forma explícita em `start_studio_trial` (grava `photographer_accounts.free_transfer_bytes = 536870912` e crédito inicial via ledger, idempotente).
- Ao expirar o trial sem assinatura: `free_transfer_bytes` vira 0; créditos de seleção permanecem intactos. Feito por função `expire_studio_trial_storage()` avaliada sob demanda (não job destrutivo), garantindo idempotência e reversão automática quando o Pro é assinado.
- Backfill: usuários hoje em `trial_expired` passam a nível gratuito sem perder nada.

Chaves de entitlement previstas: `tasks`, `charge_links`, `agenda_availability`, `agenda_online`, `contracts`, `forms`, `client_documents`, `integrations`, `payments`, `finance`, `pricing`, `sales_analysis`, `leads`, `commercial`, `transfer_upload`, `select_credits_renewal`.

## Fase 2 — Segurança no servidor (RLS e Edge Functions)

O bloqueio visual nunca é a única barreira.

- Políticas de escrita nas tabelas restritas passam a exigir `has_entitlement(auth.uid(), '<chave>')` em INSERT/UPDATE, mantendo leitura liberada (dados históricos continuam visíveis):
  - `contratos`, `contrato_templates`, `contrato_audit_logs` → `contracts`
  - `formularios`, `formulario_templates`, `formulario_respostas` → `forms`
  - `tasks`, `task_statuses`, `task_tags`, `task_people`, `task_attachments` → `tasks`
  - `availability_slots`, `availability_types`, `agenda_online_links`, `agenda_reservas_temp` → `agenda_availability` / `agenda_online`
  - `usuarios_integracoes`, `platform_integrations` → `integrations`
  - `cobrancas` / `cobranca_parcelas` quando originadas de link de pagamento → `charge_links`
- Guarda equivalente nas edge functions de cobrança e integrações (`create-asaas-payment`, checkout público, geração de link, callbacks de integração): verificação do entitlement antes de executar; erro tratado, sem 500.
- Envio de novos arquivos de transferência valida armazenamento disponível (0 MB no gratuito) na função de upload.

## Fase 3 — Camada de acesso no aplicativo

- `useAccessControl` passa a expor `tier`, `entitlements` e `can(key)`; `hasPro` vira derivado, sem quebrar chamadas existentes.
- `ProtectedRoute`: remove o redirecionamento forçado de trial expirado; mantém bloqueio apenas para conta suspensa e sessão expirada.
- `PlanRestrictionGuard` passa a receber uma chave de entitlement e continua bloqueando páginas Pro (Financeiro, Precificação, Análise de vendas, Leads, Comercial, Tarefas).
- Novos componentes compartilhados:
  - `ProGate` — envolve botão/aba/campo, aplica opacidade e intercepta o clique.
  - `ProUpgradeModal` — modal Lunari, tokens semânticos (dark/light), texto por funcionalidade e ação "Conhecer o Pro".
  - `useProGate()` — abre o modal a partir de qualquer lugar.

## Fase 4 — Aplicação ponto a ponto na interface

Agenda, Workflow, Clientes, Configurações e menu do usuário recebem o `ProGate` nos pontos exatos listados no início. Nada é ocultado.

## Fase 5 — Planos, cobrança e retorno ao Pro

- Starter sai da vitrine (`is_active = false` em `unified_plans`), sem afetar quem já assina.
- Ao ativar/renovar assinatura Pro (webhook Asaas), o tier muda na hora: reativa armazenamento, renovação de créditos e todas as chaves. Ao vencer/cancelar, volta ao gratuito automaticamente na próxima leitura, sem apagar dados.
- Telas de assinatura e banner de teste passam a comunicar o novo modelo.

## Fase 6 — Testes e verificação

Percursos verificados: novo usuário no teste; teste expirado; volta ao Pro; Pro vencido; admin/VIP; tentativa de burlar pela API (deve falhar no banco); troca de tema no modal.

## Detalhes técnicos — arquivos afetados

**Banco (migrações novas)**
- `get_access_state`, `start_studio_trial` (reescritas), `has_entitlement`, `expire_studio_trial_storage` (novas)
- `plan_entitlements` (tabela nova, com GRANT + RLS + política de leitura)
- Políticas RLS: `contratos`, `contrato_templates`, `contrato_audit_logs`, `formularios`, `formulario_templates`, `formulario_respostas`, `tasks`, `task_statuses`, `task_tags`, `task_people`, `task_attachments`, `availability_slots`, `availability_types`, `agenda_online_links`, `agenda_reservas_temp`, `usuarios_integracoes`, `platform_integrations`, `cobrancas`, `cobranca_parcelas`
- Backfill de `photographer_accounts.free_transfer_bytes`

**Núcleo de acesso**
- `src/hooks/useAccessControl.ts`
- `src/contexts/AccessControlContext.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/auth/PlanRestrictionGuard.tsx`
- `src/app-photographer/PhotographerApp.tsx`
- novos: `src/lib/entitlements.ts`, `src/hooks/useEntitlements.ts`, `src/components/access/ProGate.tsx`, `src/components/access/ProUpgradeModal.tsx`, `src/components/access/ProLockedBadge.tsx`

**Interface**
- `src/components/layout/Sidebar.tsx`, `src/components/layout/Header.tsx`
- `src/pages/Agenda.tsx`, `src/components/agenda/AgendaHeader.tsx`, `AgendaTasksSection.tsx`, `AgendaModals.tsx`, `availability-panel/*`, `agenda-online-panel/*`, `ShareAvailabilityModal.tsx`, `session-panel/*`
- `src/pages/Workflow.tsx`, `src/components/workflow/details/ExpandedActions.tsx`, `CardCollapsedModals.tsx`, `CardGalleryButtons.tsx`
- `src/pages/Clientes.tsx`, `src/pages/ClienteDetalhe.tsx`
- `src/pages/Configuracoes.tsx`
- `src/pages/Integracoes.tsx`, `src/components/preferencias/IntegracoesTab.tsx`, `src/components/integracoes/PaymentSettings.tsx`
- `src/components/subscription/TrialBanner.tsx`, `TrialWelcomeToast.tsx`
- `src/pages/EscolherPlano.tsx`, `src/pages/MinhaAssinatura.tsx`, `src/lib/planConfig.ts`, `src/lib/transferPlans.ts`

**Servidor**
- `supabase/functions/_shared/` (novo verificador de entitlement), funções de cobrança/link, integrações e upload de transferência
