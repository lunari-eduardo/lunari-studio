# Skill: lunari-edge-integrations

**Propósito**: Guiar o desenvolvimento na camada distribuída, gerenciando endpoints e integrações arquitetadas sobre Cloudflare Workers, bem como interações com APIs externas de Pagamento, IA e Armazenamento R2.

## A Arquitetura Cloudflare Workers
A decisão arquitetural do projeto definiu que funções de alta escalabilidade e integrações externas focadas fiquem sob a responsabilidade do ecossistema Cloudflare Workers (em vez de exclusivamente no Supabase).
**Regra Importante**: Não crie novas Edge Functions no Supabase por mera conveniência se a responsabilidade (APIs, R2, previews) pertencer à arquitetura definida no Cloudflare Workers para este projeto.

Existem três ambientes de Workers ativos:
1. **`workers/proposals-ai`**: Processa a geração e sanitização de propostas via Inteligência Artificial. Tem acesso restrito e próprio ao Supabase.
2. **`edge-workers/api`**: Exposição de APIs públicas e endpoints para integrações, como a Agenda Online (slots/reservas), Contracts Native (assinaturas/PDFs), e gestão segura de uploads/signed URLs para o Cloudflare R2.
3. **`edge-workers/previews`**: Especializado em geração dinâmica de imagens e links OpenGraph (SEO) para páginas de preview de pagamentos e galerias públicas.

## Regras Críticas e Contratos

### Webhooks de Pagamento e Integrações
* As funções de webhook que lidam com Asaas e InfinitePay possuem contratos estritos definidos.
* **Regra de Conciliação**: O código baseia-se na busca do campo **`ip_order_nsu`** como identificador forte de conciliação para atualizações do status de transações. Não remova essa validação e não invente novos contratos de request/response que não existam nos provedores reais.

### Resiliência e Timeouts
* APIs externas de IA e armazenamento em nuvem (R2) estão sujeitas a falhas ou demoras. Ao alterar um Worker, assegure-se de que o tratamento de erro e fallbacks amigáveis existam.

### Passagem de Tokens
* O repasse de autenticação (`Bearer tokens`, validações JWT personalizadas) e passagem do contexto do usuário deve ser verificado em cada transação inter-worker, respeitando o modelo serverless configurado (frequentemente usando bibliotecas leves adaptadas ao limite do Worker).
