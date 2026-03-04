

# Plano: Créditos no Admin + Sistema de Cupons de Desconto

## Resumo

Adicionar ao painel Admin a gestão de pacotes de créditos Select (já existem na tabela `gallery_credit_packages`) e criar um sistema completo de cupons de desconto compartilhado entre Gestão e Gallery.

---

## 1. Gestão de Créditos no Admin

A tabela `gallery_credit_packages` já existe com a estrutura correta (name, credits, price_cents, active, sort_order). Basta adicionar uma seção no `AdminPlanos.tsx`:

- Nova seção "Créditos Select" com tabela editável (nome, créditos, preço em centavos, ativo)
- Mesma lógica de edição inline que já existe para planos
- Botão "Salvar" unificado salva planos + créditos de uma vez
- Possibilidade de adicionar/remover pacotes

## 2. Nova Tabela: `coupons`

Criar tabela para cupons de desconto:

```sql
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed_cents'
  discount_value integer NOT NULL, -- % (ex: 10) ou centavos (ex: 1000)
  applies_to text NOT NULL DEFAULT 'all', -- 'all' | 'studio' | 'transfer' | 'combo' | 'credits'
  plan_codes text[] DEFAULT '{}', -- códigos específicos, vazio = todos da família
  max_uses integer, -- NULL = ilimitado
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz, -- NULL = sem expiração
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read active coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (is_active = true);
```

## 3. Admin UI para Cupons

Nova seção no `AdminPlanos.tsx` (ou sub-tab):

- Listagem de cupons existentes
- Criar novo cupom: código, tipo (% ou fixo), valor, aplica-se a (família ou plano específico), limite de usos, validade
- Ativar/desativar cupom
- Ver quantidade de usos

## 4. Leitura nos Projetos (Gestão + Gallery)

**Hook compartilhado** `useCouponValidation`:
- Recebe código digitado pelo usuário
- Valida: ativo, dentro da validade, usos < max_uses, aplica-se ao plano selecionado
- Retorna desconto calculado

**Edge Functions** (asaas-create-subscription, asaas-create-payment):
- Recebem `couponCode` opcional no body
- Validam no banco antes de aplicar desconto
- Incrementam `current_uses` após uso bem-sucedido
- Registram o cupom usado nos metadados da assinatura/pagamento

## 5. Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Migration SQL | **Criar** tabela `coupons` |
| `src/pages/AdminPlanos.tsx` | **Editar** — adicionar seções Créditos + Cupons |
| `src/hooks/useCouponValidation.ts` | **Criar** — validação client-side de cupons |
| `supabase/functions/asaas-create-subscription/index.ts` | **Editar** — aceitar + validar cupom |
| `supabase/functions/asaas-create-payment/index.ts` | **Editar** — aceitar + validar cupom |

## Para o Gallery

Enviar ao projeto Gallery:
- Instruções para criar `useCouponValidation` (mesma lógica)
- Ler `gallery_credit_packages` do banco em vez de hardcoded (se ainda não faz)
- Adicionar campo de cupom no checkout

