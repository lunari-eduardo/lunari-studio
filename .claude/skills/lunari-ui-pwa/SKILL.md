# Skill: lunari-ui-pwa

**Propósito**: Guiar o desenvolvimento do Design System, componentes UI, arquitetura de layout responsivo, além da infraestrutura de build Vite e Service Worker (PWA).

## Stack Frontend Base
* **Core**: React 18 + Vite + TypeScript.
* **Componentes**: shadcn/ui e Radix UI (`src/components/ui/`).
* **Estilização e Tokens**: Tailwind CSS (`tailwind.config.ts`), integrado com `class-variance-authority` (cva) e `tailwind-merge`.
* **Temas**: Suporte Dark/Light configurado nativamente com classes de prefixo padrão (`bg-background`, `text-primary`).

## Padrões de Organização e Componentização
* **Organização**: Os componentes de domínio encontram-se estruturados por pastas (`admin/`, `agenda/`, `workflow/`). Prefira sempre colocar um componente próximo do domínio onde será usado, a menos que seja puramente genérico.
* **Estado Global**: A aplicação baseia-se em Context Providers de topo. Qualquer novo contexto que preserve estado deve possuir lógicas claras de limpeza (`logout`) para evitar vazamento de dados de sessão entre usuários.
* **Custom Hooks**: O projeto possui uma grande biblioteca de custom hooks (~130 hooks). **Procure o hook existente antes de criar outro** (ex: debounce, manipulação de UI, queries específicas).
* **Modais**: O padrão é concentrar lógicas complexas de formulários em modais especialistas (ex: `ManualPaymentModal.tsx`).

## Regras Críticas do PWA e Build (Vite/Workbox)
A aplicação depende criticamente de seu funcionamento como PWA. Regressões aqui podem quebrar a aplicação offline ou travar atualizações (o infame `ChunkLoadError`).

* **`globIgnores` (Precache)**: **Não permita** que chunks massivos gerados por bibliotecas pesadas (como `mermaid`, `wasm`, `shiki`, gramáticas complexas) entrem no precache do ServiceWorker (`vite.config.ts`).
* **Update do Service Worker**: O mecanismo atual de atualização exige um "prompt" de confirmação. Não reverta isso para `skipWaiting` automático sem entender o impacto de chunks dinâmicos.
* **Recuperação de Erros (`ChunkLoadError`)**: O Service Worker atual possui estratégias e um `RootErrorBoundary` para limpar caches desatualizados e desregistrar o worker em caso de carregamento de chunk falho.
* **Cache Busting**: O versionamento agressivo via injeção de `__BUILD_COMMIT__` diretamente no arquivo `index.html` deve ser mantido intacto. Não mude a estratégia de define string replacement.
