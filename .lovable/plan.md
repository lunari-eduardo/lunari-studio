# Agenda: correção dos erros e redesenho de Disponibilidade / Agendamento Online

## O que eu confirmei no sistema (não é suposição)

Consultei o banco de dados real e li o código dos painéis. Os achados:

1. **As tabelas novas realmente não existem no banco.** Consultei o catálogo do Supabase: existem apenas `availability_slots` e `pacotes`. **Não existem** `availability_types`, `agenda_online_links` nem `agenda_reservas_temp`. Por isso o navegador mostra "Could not find the table ... in the schema cache" — não é cache desatualizado, é ausência real.
2. **Os arquivos de migração criados anteriormente estão corrompidos.** `20260908184000_agendamento_online_fase1.sql` e `..._fase2.sql` têm dezenas de `END IF;` soltos, fora de qualquer bloco. É SQL inválido — nunca foi executado, e nunca vai executar do jeito que está.
3. **A coluna `availability_type_id` não existe em `availability_slots`.** Mas o código de gravação (`availability.supabase.ts`) envia esse campo em todo insert → o PostgREST devolve **400 Bad Request**. É a causa direta do "Erro ao salvar. Tente novamente." Ou seja: mesmo criando os tipos, salvar horários continuaria falhando.
4. **`pacotes.duracao_minutos` já existe** — essa parte não precisa de nada.
5. **A avalanche de requisições tem causa exata.** Em `AvailabilityConfigModal.tsx`, nos modos "Substituir existentes", "Bloquear dia inteiro" e "Remover deste período", o código roda `deleteAvailabilitySlot(a.id)` dentro de um `forEach`, **sem `await`**, uma requisição HTTP por horário e por dia. Selecionando 20 dias × 4 horários, são 80 DELETEs disparados de uma vez — e cada um invalida a query, provocando novo refetch. É isso que gera `ERR_INSUFFICIENT_RESOURCES`.
6. **O erro `reading 'startTime'`** vem de `reportAllChanges` — código de métricas de performance do navegador, não do Lunari. Não está ligado ao salvamento. Vou apenas garantir que não haja horário vazio chegando aos cálculos, mas não é a causa da falha.

---

## Fase 1 — Banco de dados (primeiro, sem isso nada funciona)

Uma migração única e idempotente, substituindo o SQL quebrado:

- `availability_types` (nome, cor, ativo) com GRANTs para `authenticated`/`service_role`, RLS e política por dono.
- `availability_slots.availability_type_id` → referência a `availability_types`, `ON DELETE SET NULL`.
- `agenda_online_links` (slug único, título, descrição, tipo de disponibilidade, categoria, pacotes permitidos, sinal, ativo) com RLS: dono gerencia tudo; leitura pública **apenas** de links ativos, com `GRANT SELECT` para `anon`.
- `agenda_reservas_temp` (link, data, horário, status, expiração, dados do cliente, pacote, cobrança) — RLS só para o dono; a criação pública passa pela função de reserva.
- Reescrita correta (SQL válido) das funções `confirm_online_appointment`, `reserve_online_slot` e do gatilho de cobrança paga, todas com `search_path` fixo.
- `NOTIFY pgrst, 'reload schema'` ao final.
- Semeadura: para cada usuário que ainda não tem tipos, criar "Disponível" (verde) e "Ocupado" (vermelho), e vincular os horários existentes ao tipo correspondente pelo campo de texto atual — assim nada do que já está na agenda se perde.

Os dois arquivos de migração corrompidos serão substituídos pela migração nova (não serão editados à mão).

---

## Fase 2 — Correção de lógica e desempenho

**`src/modules/agenda/infrastructure/availability.supabase.ts`**
- Novo método `deleteMany(ids: string[])`: um único `DELETE ... in (...)` em vez de N requisições.
- Só enviar `availability_type_id` quando for um identificador válido (já há verificação; será mantida e endurecida).

**`src/modules/agenda/presentation`**
- Nova mutação `useDeleteAvailabilitySlotsMutation` (lote), com uma única invalidação de cache no fim.

**`src/components/agenda/AvailabilityConfigModal.tsx` (e o painel que o substituirá)**
- Trocar todos os `forEach(deleteAvailabilitySlot)` por: coletar os identificadores → uma chamada em lote → um insert em lote → uma invalidação.
- `await` real em tudo, com botão em estado de carregamento e bloqueio de duplo clique.
- Ignorar horários vazios/mal formatados antes de qualquer cálculo de duração.
- Mensagem de erro específica ("não foi possível salvar os horários — nenhuma alteração foi aplicada") em vez do texto genérico, e nenhuma alteração parcial: exclusão e inserção na mesma sequência, abortando junto.

**`src/hooks/useAvailability.ts` / `useAvailabilityTypes.ts`**
- Estado de carregamento e de erro expostos, com `retry: 1` — hoje a falha some silenciosamente.
- Se a lista de tipos falhar, mostrar aviso no painel em vez de cair no padrão fantasma "1"/"2" (que hoje causa gravação de tipo inválido).

---

## Fase 3 — Redesenho: de modais empilhados para painel lateral

### `AvailabilityPanel` (substitui `AvailabilityConfigModal` + `AvailabilityTypesManagerModal`)

Painel deslizante à direita, `Sheet` do shadcn, com três seções em abas — o calendário da agenda continua visível ao fundo.

```
src/components/agenda/availability-panel/
  AvailabilityPanel.tsx        // Sheet + abas + rodapé fixo
  tabs/LiberarTab.tsx
  tabs/BloquearTab.tsx
  tabs/TiposTab.tsx            // CRUD de tipos, sem modal secundário
  parts/PeriodPicker.tsx       // calendário de intervalo + dias da semana
  parts/TimeSlotList.tsx       // lista de horários com validação
  parts/TypeBadgePicker.tsx    // seleção por etiqueta colorida
  useAvailabilityPanel.ts      // todo o estado e o salvamento em lote
```

- **Liberar**: período → dias da semana → horários → tipo (etiquetas coloridas) → modo criar/substituir.
- **Bloquear**: dia inteiro ou faixas de horário, com motivo.
- **Tipos**: criar, renomear, trocar cor, remover — dentro da mesma aba. Fim do modal sobre modal.
- Cabeçalho fixo com o período selecionado; rodapé fixo com "Remover neste período" à esquerda e Cancelar/Salvar à direita. Só a área central rola, e cada aba mostra bem menos de uma vez — acaba o rolar longo de hoje.
- Largura 520px no computador; no celular vira painel de tela cheia com as abas no topo.

### `AgendaOnlinePanel` (substitui `AgendaOnlineLinksModal`)

Mesmo padrão de painel lateral, em duas telas internas:
- **Lista**: cada link com título, endereço, botão de copiar em um clique, ativar/desativar e editar.
- **Formulário em etapas**: 1) Identificação (título, endereço, descrição) · 2) O que oferecer (tipo de disponibilidade, categoria, pacotes) · 3) Sinal e publicação. Prévia do endereço final sempre visível.
- Verificação de endereço já usado antes de salvar, com sugestão automática.

Ambos os painéis seguem o DNA visual (superfícies translúcidas, densidade baixa, sem toast de sucesso — apenas erro), e a agenda continua enxergando os mesmos ganchos de dados; nenhuma regra de negócio muda.

---

## Fase 4 — Estados e verificação

- Esqueleto de carregamento nas três abas; estado vazio com ação direta ("criar primeiro tipo").
- Se uma tabela ainda não responder, o painel mostra um aviso explicativo em vez de erro cru, e desabilita o salvamento.
- Verificação no navegador: criar tipo, liberar 20 dias × 4 horários (contando as requisições — deve ser 1 exclusão + 1 inserção), bloquear dia inteiro, remover período, criar link online e abrir o endereço público. Confiro também em largura de celular.

---

## Ordem de execução

1. Migração do banco + recarga do cache (Fase 1).
2. Exclusão/inserção em lote e tratamento de erro (Fase 2).
3. Painel lateral de disponibilidade com aba de tipos (Fase 3a).
4. Painel de agendamento online (Fase 3b).
5. Estados, responsividade e verificação no navegador (Fase 4).

Fases 1 e 2 já devolvem o sistema ao funcionamento; 3 e 4 entregam a nova experiência.
