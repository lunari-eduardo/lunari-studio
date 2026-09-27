# Auditoria Completa e Plano de Implementação

Após analisar as 4 imagens enviadas e o estado atual do painel de contexto (`ChatContextPanel`), estruturei a implementação para ser executada em 3 fases limpas e progressivas, focando em replicar exatamente a interface solicitada sem perder o vínculo real com o backend (sem dados mockados).

## 1. O Que Identificamos na Auditoria

1. **Top Card (Cabeçalho do Contato):**
   - Atualmente, o texto `"PAINEL DO CONTATO"` está sobrecarregando o topo. Você deseja removê-lo para ganhar espaço vertical.
   - O nome e a tag ("Cliente", etc.) devem ficar lado a lado no primeiro bloco.
   - A tag do cliente deve ser expansível para incluir novos status do Lead (Orçamento enviado, Follow-up, Agendado), e essa tag deve ser um gatilho clicável para alterar manualmente o status na tabela `leads` (refletindo no Kanban).

2. **Card Principal da Sessão (`SmartSessionCard`):**
   - Você deseja remover a formatação antiga e adotar exatamente o layout da imagem 4:
     - Bloco único cinza escuro.
     - Ícone e texto no cabeçalho (ex: `[Icone] Orçamento enviado`, ou `[Icone] Próxima sessão`).
     - Metadados: Categoria, Pacote, Descrição e Data.
     - Botão/Ação de base: Exibe se foi "Pago" (verde), "Agendada", etc. Se for orçamento, mostra "Ver orçamento".
   - Os dados financeiros de cobrança em destaque do último patch não são necessários aqui, pois já existe um painel dedicado ("Financeiro da Sessão").
   
3. **Card Financeiro (`FinancialSummaryCard`):**
   - Atualmente, ele está consultando a tabela errada (`cobrancas` avulsas) ou mostrando "R$ 0,00".
   - Deve ser condicionado a só aparecer caso exista uma sessão ativa no `SmartSessionCard`.
   - Deve receber os dados exatos da sessão (`valor_total`, `valor_pago`, etc.) diretamente da RPC.

4. **Ações Rápidas (`QuickActionsCard`):**
   - Remover "Criar Tarefa" e o botão "Mais".
   - Trocar "Registrar Pagamento" para abrir diretamente o `WorkflowPaymentsModal` (importando do Kanban) e conectá-lo à sessão aberta.
   - Adicionar o botão "Cobrar via link", conectando-o ao modal do InfinitePay já existente.
   - Corrigir "Abrir Workflow" para disparar a função que navega para o kanban na sessão exata.

---

## 2. Plano de Implementação Fase a Fase

### Fase 1: Limpeza do Topo e Ações Rápidas
Nesta primeira fase, focaremos em arrumar a moldura externa sem quebrar o componente complexo da sessão.
- Remover o título "PAINEL DO CONTATO" de `ChatContextPanel.tsx`.
- Reescrever o `ContactHeaderCard.tsx` para colocar a Label/Badge ("Cliente") lado a lado com o Nome.
- Inserir no `ContactHeaderCard` o seletor visual de Status do Lead abaixo do nome, integrado com o `supabase` para atualizar a coluna `status` do `lead_id` em realtime.
- Atualizar o componente `QuickActionsCard.tsx` e injetar o `WorkflowPaymentsModal` para que, ao clicar em "Registrar Pagamento", a tela do Financeiro seja chamada diretamente sobre a conversa.

### Fase 2: O Novo SmartSessionCard (Réplica da Imagem 4)
Aqui vamos refazer completamente o visual do cartão de sessão.
- Modificar o componente `SmartSessionCard.tsx` para adotar o design "Card de Fases".
- Lógica de variantes (3 visuais da imagem 4):
  - **Se houver Orçamento e não houver Sessão:** Mostra layout amarelado (`Orçamento enviado`).
  - **Se houver Sessão Futura:** Mostra layout azul (`Próxima sessão`), exibindo o pacote, descrição do local/ensaio e data de agendamento.
  - **Se não houver Futura, mas houver Passada:** Mostra layout azul escuro (`Última sessão`), focando na conclusão.
- Remover os valores financeiros do canto e adicionar os status/labels da base (Pago/Agendada/Concluída).

### Fase 3: Consistência Financeira (Card Financeiro Ocultável)
- O `FinancialSummaryCard.tsx` deixará de depender do loop cego de `cobrancas`.
- Passaremos para ele a `mainSession` identificada na Fase 2.
- Se `mainSession` for nula, o card some (retorna `null`).
- Se houver `mainSession`, ele calculará "Total", "Recebido" e "Pendente" subtraindo o `valor_total` e `valor_pago` recebidos da `clientes_sessoes`.

---
**Podemos prosseguir com a Fase 1?** Assim validamos a interface do Topo e o link de Pagamentos sem sobrecarregar a etapa de componentização das sessões.
