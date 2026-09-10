# Galerias expiradas — diagnóstico e plano de correção

## O que está acontecendo hoje

### 1. Galeria de seleção expirada continua aberta para o cliente
A função pública que entrega a galeria (`supabase/functions/gallery-access/index.ts`) **não verifica prazo nenhum**. Ela busca a galeria pelo link, confere senha, e devolve as fotos — sem olhar `prazo_selecao` nem o status `expirado`. Confirmado na leitura do arquivo: entre a busca da galeria e a resposta não existe nenhuma checagem de data.

A tela "Galeria expirada" existe (`ClientGalleryExpired.tsx`) e é exibida quando a resposta traz o campo `expired`. Como esse campo nunca é enviado, a tela é código morto. Hoje há no banco 9 galerias de seleção e 4 de entrega com status `expirado` — todas acessíveis pelo link.

### 2. Entrega reativada aparece como "não encontrada"
Três causas somadas:

- A reativação (`DeliverHeader.tsx`) grava novo prazo e status `enviado`, mas nenhuma das ações de galeria invalida o cache `gallery-by-id` — a página de detalhe segue lendo o dado antigo por até 1 minuto.
- O painel de galerias tem uma rotina automática que regrava status `expirado` a partir da lista em cache (`GalleryDashboard.tsx`). Se a lista ainda está desatualizada logo após a reativação, ela marca a galeria como expirada de novo.
- `useGalleryById.ts` tem um fallback para a tabela `galerias_arquivadas`, que **não existe no banco**. Quando a galeria foi realmente removida (a exclusão é definitiva, via `delete_gallery_complete`, inclusive pela rotina automática de 12 meses), o fallback falha e a tela mostra "Galeria não encontrada" sem explicar nada.

### 3. Texto assustador
"Galeria não encontrada" aparece em `DeliverDetail.tsx`, `GalleryDetail.tsx`, `GalleryEdit.tsx` e na tela pública de erro (`ClientGallery.tsx`).

## Plano

### Fase 1 — Bloqueio real de galerias expiradas (servidor)
`supabase/functions/gallery-access/index.ts` (+ `tokenResolver.ts`)
- Após localizar a galeria, calcular expiração: status em (`expirado`, `expirada`, `expired`) **ou** `prazo_selecao` no passado.
- Responder `200` com `{ expired: true }` junto de nome da sessão, tema e dados do estúdio (logo/nome), **sem fotos** — o cliente vê uma tela com a identidade do fotógrafo.
- Não promover status para `selecao_iniciada` quando expirada.
- Vale para seleção **e** entrega.

`supabase/functions/client-selection/*` e `confirm-selection/*`: reforçar a recusa de ações em galeria expirada (seleção já bloqueia; confirmar cobre o mesmo caso).

### Fase 2 — Tela do cliente
- `src/pages/gallery/ClientGallery.tsx`: tratar `expired` antes do ramo de entrega, para que entrega expirada também caia na tela de indisponível; trocar "Galeria não encontrada" por "Galeria não disponível" com texto de contato.
- `src/pages/gallery/client/components/ClientGalleryExpired.tsx`: novo texto — título "Galeria não disponível", apoio "O período de acesso a esta galeria foi encerrado." e "Entre em contato com o fotógrafo para solicitar a liberação." Mantém logo, tema claro/escuro e fonte da sessão.
- `src/pages/gallery/ClientDeliverGallery.tsx`: receber o estado indisponível vindo do componente pai (sem renderizar capa nem fotos).

### Fase 3 — Reativação confiável (área do fotógrafo)
- `src/hooks/useSupabaseGalleries.ts`: incluir `['gallery-by-id', id]` em todas as invalidações de mutação.
- `src/pages/gallery/deliver/detail/components/DeliverHeader.tsx`: reativação em uma única escrita (prazo + status + `updated_at`), invalidando `galleries`, `gallery-by-id` e `client-gallery`.
- `src/pages/gallery/GalleryDashboard.tsx`: a rotina de auto-expiração passa a rodar só sobre dados frescos e a ignorar galerias reativadas nos últimos minutos, evitando reexpirar o que acabou de ser liberado.
- `src/hooks/useGalleryById.ts`: remover o fallback para a tabela inexistente e devolver um motivo (`deleted` vs `not_found`) usando `galerias_sessao_historico`, que registra exclusões.

### Fase 4 — Textos internos
Trocar "Galeria não encontrada" por "Galeria não disponível" com explicação curta ("esta galeria foi excluída ou não está mais acessível") em:
`src/pages/gallery/DeliverDetail.tsx`, `src/pages/gallery/GalleryDetail.tsx`, `src/pages/gallery/GalleryEdit.tsx`.

### Fase 5 — Testes
- Link de seleção expirada: mostra indisponível, sem fotos na resposta.
- Link de entrega expirada: mesma tela.
- Reativar entrega: link volta a abrir imediatamente e a página de detalhe reflete o novo prazo sem recarregar.
- Galeria excluída: mensagem de indisponível, não de erro.
- Claro e escuro, celular e desktop.
- Nenhuma foto ou dado é apagado por expiração.

## Arquivos alterados
- `supabase/functions/gallery-access/index.ts`
- `supabase/functions/gallery-access/tokenResolver.ts`
- `supabase/functions/client-selection/photoActions.ts`
- `src/pages/gallery/ClientGallery.tsx`
- `src/pages/gallery/client/components/ClientGalleryExpired.tsx`
- `src/pages/gallery/ClientDeliverGallery.tsx`
- `src/hooks/useSupabaseGalleries.ts`
- `src/hooks/useGalleryById.ts`
- `src/pages/gallery/GalleryDashboard.tsx`
- `src/pages/gallery/deliver/detail/components/DeliverHeader.tsx`
- `src/pages/gallery/DeliverDetail.tsx`
- `src/pages/gallery/GalleryDetail.tsx`
- `src/pages/gallery/GalleryEdit.tsx`

Sem migração de banco: nenhuma coluna nova é necessária e nada é excluído.
