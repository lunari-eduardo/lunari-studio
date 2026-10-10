# Lunari Studio - Regras Globais e Diretrizes (CLAUDE.md)

Este arquivo define o contrato primário de engenharia e UI/UX do Lunari Studio. Aja de acordo com estas regras sempre que interagir com o repositório.

## 1. Comunicação e Postura
* **Idioma:** Sempre responda em **Português BR**.
* Mantenha um tom técnico, objetivo e colaborativo, respeitando a identidade premium e silenciosa da plataforma.

## 2. Validação e Integridade (Build Cego)
* **CRÍTICO:** O comando `npm run build` do Vite **NÃO FAZ typecheck** e não acusa variáveis inexistentes.
* **SEMPRE rode `npm run typecheck:changed`** antes de dar uma tarefa por concluída.
* Cuidado máximo com componentes globais (ex: `App.tsx`, `Layout.tsx`, `PhotographerApp.tsx`), falhas neles quebram o sistema via ErrorBoundary para todos os usuários.
* Certifique-se de salvar arquivos em **UTF-8** para prevenir corrupção (Mojibake) em acentuações.
* Não remova flags estruturais (ex: `hasBottomNav`) sem entender todo o impacto na UI global.

## 3. Design DNA, UI/UX e Ergonomia (Luxo Silencioso)
* **Paleta Proporção Áurea:** 85% Neutros (fundos limpos/cartões), 12% Preto Grafite (textos base e apoio), 3% Dourado Lunari (`#D4AF37`). Destaque dourado é estrito para status/CTA. **Nunca** crie grandes banners ou blocos inteiros dourados.
* **Componentes:** Bordas e cartões em `rounded-xl` ou `rounded-2xl`. Sombras suaves amplas (ex: `shadow-[0_4px_30px_rgba(0,0,0,0.06)]`), não use sombras rígidas escuras.
* **Feedback (Zero Toasts):** Ações corriqueiras (salvar forms/rascunhos) NÃO devem disparar toasts. Use feedback inline discreto (ex: badge verde de "Salvo agora"). Toasts são restritos a falhas graves ou confirmações críticas e destrutivas.
* **Ergonomia e Rolagem:** 
  * Áreas de rolagem verticais exigem respiro no rodapé: `style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}`.
  * Para documentos dinâmicos (A4, formulários extensos), nunca bloqueie a altura num `flex-row` que corte o texto. Utilize containers de bloco (`mx-auto h-auto`).

## 4. Arquitetura e Banco de Dados (Inquebráveis)
* **Cálculos Financeiros:** O frontend **NUNCA** recalcula ou envia chaves como `valor_pago`, `valor_total` ou `status_financeiro`. Tudo é resolvido de forma estrita via triggers no PostgreSQL.
* **Upload de Mídias (R2):** Fotos e arquivos grandes DEVEM ser eviados ao **Cloudflare R2** via `useR2Upload`. Supabase Storage é apenas para pequenos avatares ou legados.
* **RLS Mandatório:** Tabelas com informações de usuários exigem política restrita de isolamento de tenants (`auth.uid() = user_id`).
* **Ecossistema Compartilhado:** Banco é compartilhado com o **Lunari Gallery**. Qualquer alteração em sessão, cliente ou foto deve ser retrocompatível para não derrubar galerias públicas de fotógrafos.
* **Acesso / Planos:** A checagem de onboarding ocorre antes de paywall. Não contorne hooks como `useAccessControl`.
* **IDs de Sessão:** São gerados em strings textuais longas (não-UUID).

## 5. Código Legado (Não Reutilizar)
* **Billing/Pagamentos:** **Asaas** é o provedor atual. Códigos referentes ao Stripe (`plans`, `subscriptions`) e links `infinitepay-create-link` (use `gestao-infinitepay-create-link`) são legados estruturais.
* **Tabelas de Finanças:** A tabela `financial_items` é legada e substituída pela atual `fin_items_master`.

Para instruções avançadas de domínios específicos, leia as **Skills** localizadas em `.agents/skills/`.
