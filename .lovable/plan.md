

# Refatorar pagina de planos com design do Gallery + upgrade/downgrade inteligente

## Contexto
A pagina atual `EscolherPlano.tsx` tem um design simples com cards e formulario de pagamento inline. O Gallery tem um design muito mais sofisticado com hero section, prorata calculado, downgrade agendado, e pagina de pagamento separada (`CreditsPayment`). Precisamos replicar esse design e logica no Gestao, adaptado para planos Studio e Combos.

## Arquivos a criar/modificar

### 1. Criar `src/lib/planConfig.ts` -- Mapa centralizado de planos
Adaptar `transferPlans.ts` do Gallery para o contexto Studio:
- `ALL_PLAN_PRICES` (studio_starter, studio_pro, combo_pro_select2k, combo_completo)
- `PLAN_FAMILIES`, `PLAN_INCLUDES`, `PLAN_DISPLAY_NAMES`
- `STUDIO_PLAN_ORDER` array para validar upgrade vs downgrade
- Helper `getPlanDisplayName()`, `isPlanUpgrade()`, `isPlanDowngrade()`

### 2. Criar `src/hooks/useAsaasSubscription.ts` -- Hook de assinaturas Asaas
Copiar e adaptar do Gallery:
- Query `subscriptions_asaas` filtrando por `user_id` e status ACTIVE/PENDING/OVERDUE
- Mutations: `createCustomer`, `createSubscription`, `createPayment`, `upgradeSubscription`, `downgradeSubscription`, `cancelSubscription`, `reactivateSubscription`, `cancelDowngrade`
- Helpers: `studioSub`, `transferSub` por familia
- Usar `useAuth()` do projeto (nao `useAuthContext`)

### 3. Reescrever `src/pages/EscolherPlano.tsx` -- Design identico ao Gallery
Seguir estrutura do `CreditsCheckout.tsx` do Gallery:
- **Hero section** com gradient, Badge "GESTAO", titulo e subtitulo
- **Banner de plano atual** quando ha assinatura ativa (mostra prorata e dias restantes)
- **BillingToggle** mensal/anual com badge "-15%"
- **Plan cards** (Starter + Pro) em grid 2 colunas com:
  - Badge "Mais Popular" no Pro
  - Badge "Plano atual" no plano ativo
  - Preco com calculo de prorata para upgrades
  - Botao contextual: "Plano atual" / "Fazer upgrade" / "Fazer downgrade" / "Selecionar"
- **Secao Combos** abaixo dos planos Studio (combo_pro_select2k e combo_completo)
- **Downgrade Dialog** com checkbox de confirmacao
- Ao clicar em plano, navegar para `/escolher-plano/pagamento` com state

### 4. Criar `src/pages/EscolherPlanoPagamento.tsx` -- Pagina de pagamento separada
Adaptar `CreditsPayment.tsx` do Gallery:
- Layout: header com voltar + grid 2 colunas (form + resumo)
- **OrderSummary** sticky com detalhes do pedido e prorata
- **CardCheckoutForm** reutilizavel com:
  - Campos cartao (nome, numero, MM, AAAA, CVV)
  - Campos titular (nome, CPF/CNPJ, CEP, telefone, email)
  - Formatacao automatica (CPF/CNPJ, telefone, CEP, cartao)
- **Installment selector** para planos anuais (1-12x)
- Fluxo: createCustomer -> createSubscription (mensal) / createPayment (anual) / upgradeSubscription (upgrade)
- Redirect para `/app` apos sucesso

### 5. Atualizar `src/pages/MinhaAssinatura.tsx` -- Design do Gallery
Adaptar `SubscriptionManagement.tsx` do Gallery:
- Card detalhado com: nome do plano, status badge, valor, proxima cobranca, data de criacao
- Notice de cancelamento com botao "Desfazer cancelamento"
- Notice de downgrade agendado com botao "Cancelar downgrade"
- Acoes: Upgrade/Downgrade, Cancelar assinatura (com AlertDialog)
- Usar `useAsaasSubscription` hook

### 6. Atualizar `src/App.tsx` -- Adicionar rota de pagamento
- Adicionar rota `/escolher-plano/pagamento` -> `EscolherPlanoPagamento`
- Manter rota `/escolher-plano` existente
- Adicionar rota na lista de exempt routes do `ProtectedRoute`

### 7. Atualizar `src/components/auth/ProtectedRoute.tsx`
- Adicionar `/escolher-plano/pagamento` na lista `SUBSCRIPTION_EXEMPT_ROUTES`

## Regras de negocio implementadas

**Upgrade** (plano mais caro):
- Calculo prorata: `credito = precoAtual * (diasRestantes / diasTotalCiclo)`
- `cobranca = max(0, precoNovo - credito)`
- Efeito imediato, mesmo ciclo de cobranca mantido
- Mensal->Anual: credito do mensal como desconto, reinicia ciclo

**Downgrade** (plano mais barato):
- NAO aplica imediatamente -- agendado para proxima renovacao
- Salva `pending_downgrade_plan` via edge function
- Usuario mantem acesso ao plano atual ate vencimento
- Dialog de confirmacao com checkbox

**Anual->Mensal**:
- So permitido no fim do ciclo anual (tratado como downgrade agendado)

