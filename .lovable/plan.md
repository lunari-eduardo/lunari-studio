
# Correcao: "Disponivel" marca diretamente o horario

## Problema

Ao clicar em "Disponivel" no menu de tres pontinhos, o sistema abre o modal completo de configuracao de disponibilidade. O comportamento esperado e marcar o horario como disponivel imediatamente, sem abrir nenhum modal -- igual ao "Bloquear" que ja funciona de forma direta.

## Solucao

Criar uma funcao `handleMarkAvailable` no `DailyView.tsx` que marca o horario diretamente como "Disponivel" usando `addAvailabilitySlots`, seguindo o mesmo padrao do `handleBlockSlot`. O primeiro tipo de disponibilidade cadastrado sera usado como padrao (nome e cor).

## Alteracoes

### `src/components/agenda/DailyView.tsx`

1. Importar `availabilityTypes` do hook `useAvailability`
2. Criar funcao `handleMarkAvailable(time: string)`:
   - Remove availability existente para aquele horario (evitar duplicatas)
   - Pega o primeiro tipo de disponibilidade cadastrado (`availabilityTypes[0]`)
   - Cria um slot com `label` e `color` desse tipo (ou fallback "Disponivel" / cor verde)
   - Exibe toast de confirmacao
3. Alterar o `onAvailable` do `TimeSlotOptionsMenu` nos slots vazios para chamar `handleMarkAvailable(time)` em vez de `onOpenAvailability`
4. Manter o `onOpenAvailability` apenas no menu dos slots **ja marcados como disponiveis** (para permitir reconfigurar se necessario)

### Logica da funcao

```text
handleMarkAvailable(time):
  1. Remover availability existente para (dateKey, time)
  2. tipo = availabilityTypes[0] || { name: 'Disponivel', color: '#10b981' }
  3. addAvailabilitySlots([{ date, time, duration: 60, label: tipo.name, color: tipo.color }])
  4. toast.success('Horario marcado como disponivel')
```

### Nenhum outro arquivo precisa ser alterado

A mudanca e apenas no `DailyView.tsx` -- a logica do menu e dos callbacks.
