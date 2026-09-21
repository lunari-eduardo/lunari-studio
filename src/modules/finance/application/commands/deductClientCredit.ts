import { z } from "zod";
import { defineCommand } from "@/shared/capability";
import { domainError, err, isOk, ok } from "@/shared/result";
import { supabase } from "@/integrations/supabase/client";
import { resolveUserId } from "../_auth";

/**
 * Capability `finance.credit.deduct` — deduz/remove crédito do cliente manualmente.
 * Lança um registro de débito com origem 'reversao_grant'.
 */
const Input = z
  .object({
    clienteId: z.string().uuid(),
    valor: z.number().positive(),
    motivo: z.string().max(240).optional(),
  })
  .strict();

const Output = z.object({ ledgerId: z.string() });

export const deductClientCredit = defineCommand({
  id: "finance.credit.deduct",
  title: "Deduzir crédito do cliente",
  description: "Remove ou estorna saldo da carteira do cliente registrando motivo.",
  input: Input,
  output: Output,
  permissions: ["finance:write"],
  sideEffects: [
    "db:cliente_creditos_ledger",
    "event:finance.credit.revoked",
  ],
  audit: "always",
  async handler({ clienteId, valor, motivo }, ctx) {
    const auth = await resolveUserId(ctx);
    if (!isOk(auth)) return auth;

    const { data, error } = await supabase.rpc("deduct_client_credit", {
      p_cliente_id: clienteId,
      p_valor: valor,
      p_motivo: motivo ?? null,
    });

    if (error) {
      ctx.log.error("deduct_client_credit falhou", { error });
      return err(
        domainError("EXTERNAL", error.message || "Não foi possível deduzir o crédito.", {
          retriable: true,
          cause: error,
        }),
      );
    }

    const ledgerId = String(data);
    await ctx.emit("finance.credit.revoked", {
      ledgerId,
      clienteId,
      valor,
      photographerId: auth.value,
    });

    return ok({ ledgerId });
  },
});
