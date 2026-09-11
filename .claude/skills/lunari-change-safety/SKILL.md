# Skill: lunari-change-safety

**Propósito**: Orientar o agente a como realizar alterações seguras no Lunari Studio, prevenindo regressões em uma arquitetura complexa e interdependente.

## Princípio Fundamental: O Menor Impacto Possível
Quando uma tarefa puder ser resolvida com uma alteração localizada, **não refatore ou reestruture partes não solicitadas do sistema**. Se uma mudança necessária revelar um problema estrutural diretamente relacionado à tarefa, documente o problema e proponha a correção mais segura, mas não mascare problemas estruturais com soluções temporárias.

## Procedimento de Alteração

### 1. Antes de alterar
* **Identifique o domínio afetado**: A alteração é em UI, Banco de Dados, Workers ou Core Business (Workflow/Billing)?
* **Procure implementações existentes**: O Lunari já possui ~130 custom hooks e muitos componentes base. Não crie soluções do zero se um padrão já existe.
* **Identifique dependências (Cross-Domain)**: Essa alteração afeta o `AppContext`, `WorkflowCacheContext` ou o `useAccessControl`?
* **Ecossistema Compartilhado**: A tabela ou regra alterada é usada pelo **Lunari Gallery** (ex: `clientes_sessoes`, `galerias`)? 

### 2. Durante a implementação
* **Verifique as Regras Inquebráveis**:
  - Se for criar uma tabela com dados de usuário, incluiu a policy RLS (`auth.uid() = user_id`)?
  - Se estiver editando sessão, está deixando o backend calcular `valor_pago` e `valor_total`?
* **Evite duplicação**: Utilize os helpers e contexts globais adequados em vez de repetir lógica.
* **Faça a menor alteração necessária**: Respeite os padrões do projeto e não insira bibliotecas ou complexidades não requisitadas.
* **Não utilize código legado**: Certifique-se de que não está copiando lógica relacionada ao Stripe ou `infinitepay-create-link`.

### 3. Depois da implementação
* **Valide os efeitos colaterais**:
  - Componentes dependentes de Context Providers continuam renderizando corretamente?
  - O Service Worker (PWA) não está sendo sobrecarregado com novos chunks dinâmicos pesados?
* **Execute testes**: Rode os linters ou verificações disponíveis localmente (ex: `bun run lint`).

### Quando parar e investigar
* Se a mudança exige contornar a função `get_access_state()` ou as Edge Functions de assinatura.
* Se for necessário desativar um trigger crítico no Postgres para fazer uma operação de UI funcionar.
* Pare e reporte a situação ao usuário antes de forçar a solução.
