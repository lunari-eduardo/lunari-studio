

# Diagnostico e Correcao: Deslogamento, Agenda Vazia e Status Cinza

## Causas Raiz Identificadas

### 1. Status cinza apos re-login: `isInitialized` singleton
`ConfigurationContext.tsx` linha 11 e 302-308: variavel module-level `let isInitialized = false` nunca reseta. Como o `ConfigurationProvider` esta montado FORA do `ProtectedRoute` (App.tsx linha 107), apos logout+login o componente **nao remonta** e o `isInitialized` continua `true` — dados nunca recarregam, etapas ficam vazias, cores ficam cinza.

### 2. Agenda vazia apos re-login: sem reatividade a auth
`AgendaContext.tsx` linha 131-199: o `useEffect` que carrega dados e configura realtime roda uma unica vez (deps estavel). Nao reage a mudancas de autenticacao. O realtime usa `getUser()` (request HTTP) que pode falhar durante transicao de auth.

### 3. Carregamento de TODOS agendamentos
`SupabaseAgendaAdapter.loadAppointments()` linha 25-41: faz SELECT sem filtro de data — carrega TUDO.

### 4. Providers fora do ProtectedRoute
`ConfigurationProvider`, `WorkflowCacheProvider`, `AppProvider` e `AgendaProvider` estao todos montados permanentemente no App.tsx (linhas 107-220), independente do estado de auth. Nunca remontam apos logout/login.

---

## Plano de Correcao

### Correcao 1: ConfigurationContext — remover singleton e reagir a auth

**Arquivo: `src/contexts/ConfigurationContext.tsx`**
- Remover variaveis module-level `isInitialized` e `activeInstances`
- Adicionar dependencia de `user.id` via `useAuth()` ao `useEffect` de carga inicial
- Quando `user` muda (login/logout), recarregar todos os dados
- Limpar estado quando user for null (logout)
- Resetar `RealtimeSubscriptionManager` no logout para recriar canais com novo user

### Correcao 2: AgendaContext — reagir a auth

**Arquivo: `src/contexts/AgendaContext.tsx`**
- Importar `useAuth` e usar `user` como dependencia no efeito principal
- Substituir `getUser()` por `getSession()` no setup de realtime (evitar HTTP request)
- Quando `user` muda para null, limpar state (appointments, availability, etc.)
- Quando `user` muda para um valor valido, recarregar dados e reconectar realtime

### Correcao 3: Smart loading de agendamentos (mes atual ± 1)

**Arquivo: `src/adapters/SupabaseAgendaAdapter.ts`**
- Alterar `loadAppointments()` para aceitar parametro de range de datas (opcional)
- Criar novo metodo `loadAppointmentsByRange(startDate, endDate)` que filtra por `.gte('date', start).lte('date', end)`
- Default: mes atual - 1 mes ate mes atual + 1 mes (3 meses)

**Arquivo: `src/services/AgendaService.ts`**
- Propagar parametros de range para o adapter

**Arquivo: `src/contexts/AgendaContext.tsx`**
- No `loadData`, calcular range automatico (mes anterior, atual, proximo)
- Ao navegar para mes fora do range, carregar sob demanda e adicionar ao state
- Expor funcao `loadMonthData(year, month)` no contexto para carregamento on-demand

### Correcao 4: RealtimeSubscriptionManager — reset no logout

**Arquivo: `src/services/RealtimeSubscriptionManager.ts`**
- Chamar `cleanupAll()` quando usuario desloga
- Integrar com onAuthStateChange ou ser chamado pelo ConfigurationContext/AgendaContext no cleanup

### Correcao 5: getUser() → getSession() nos hot paths

**Arquivos afetados:**
- `src/adapters/SupabaseAgendaAdapter.ts` (linhas 26, 66, 330, etc.)
- `src/contexts/AgendaContext.tsx` (linha 136)

Substituir `supabase.auth.getUser()` por `supabase.auth.getSession()` em todas as operacoes de leitura (hot paths) para evitar requests HTTP redundantes — usar `session.user` em vez de `data.user`.

---

## Resumo de Impacto

| Problema | Causa | Correcao |
|---|---|---|
| Status cinza | `isInitialized` singleton | Remover singleton, reagir a auth |
| Agenda vazia | Sem reatividade a auth | Adicionar `user` como dependencia |
| Performance | Carrega TODOS agendamentos | Smart loading mes ± 1 |
| Lentidao auth | `getUser()` HTTP em hot paths | `getSession()` local |
| Realtime morto | Canais nao recriados | Reset no logout/login |

