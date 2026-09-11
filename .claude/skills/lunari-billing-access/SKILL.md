# Skill: lunari-billing-access

**Propósito**: Guiar o desenvolvimento, manutenção e refatoração nas camadas de Autenticação, Controle de Acesso, Onboarding e Integração de Assinaturas (Billing).

## O Fluxo de Controle de Acesso
A segurança e validação de planos no frontend ocorrem em uma cadeia estrita que **deve ser preservada**:

1. **`AuthContext`**: Gerencia a autenticação bruta do Supabase (estar ou não logado).
2. **RPC `get_access_state()`**: No backend, determina o nível real de acesso verificando sequencialmente: `user_roles` (Admin) > `vip_users` > `subscriptions_asaas` (Assinatura Ativa) > `profiles` (Trial).
3. **`useAccessControl`**: Hook central que consome a RPC, implementa cache e retry (resiliência a rede).
4. **`ProtectedRoute`**: Componente de barreira de acesso.
5. **`PlanRestrictionGuard`**: Barreira especializada para impedir que usuários de plano Starter acessem módulos Pro.

### Regra Crítica da Ordem de Rotas
Dentro do `ProtectedRoute`, **a verificação de Onboarding deve ocorrer ANTES do Paywall (verificação de assinatura)**. Se isso for invertido, o usuário fica preso em um deadlock.

## Assinaturas e Gateways (Edge Functions)
O provedor atual e definitivo de assinaturas é o **Asaas**. As operações são gerenciadas via Supabase Edge Functions (`asaas-*`).

### Regras para Edge Functions e Webhooks:
* O processamento de pagamentos para InfinitePay e Asaas utiliza webhooks que dependem fundamentalmente do campo `ip_order_nsu` para conciliação robusta.
* Tabelas de estado: A fonte de verdade das assinaturas ativas é `subscriptions_asaas`. Os planos disponíveis são ditados por `unified_plans`.
* **Atenção ao Legado**: NÃO permita a utilização de estruturas, Edge Functions ou lógicas baseadas no Stripe (ex: tabelas `subscriptions`, `plans`) sem uma justificativa explícita de migração de dados antigos. O provedor atual é o Asaas.
