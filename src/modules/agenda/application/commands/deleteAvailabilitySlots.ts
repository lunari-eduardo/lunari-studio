import { z } from "zod";
import { defineCommand } from "@/shared/capability";
import { ok } from "@/shared/result";
import { getAgendaDeps } from "../../infrastructure/container";

export const deleteAvailabilitySlots = defineCommand({
  id: "agenda.availability.deleteSlots",
  title: "Excluir slots de disponibilidade em lote",
  description: "Remove múltiplos slots de disponibilidade pelos seus IDs.",
  input: z.object({ ids: z.array(z.string().min(1)).min(1) }),
  output: z.object({ ok: z.literal(true), count: z.number() }),
  permissions: ["agenda:write"],
  sideEffects: ["db:availability_slots", "event:agenda.availability.changed"],
  audit: "on-success",
  idempotencyKey: (i) => `agenda.availability.deleteSlots:${i.ids.join(",")}`,
  async handler({ ids }, ctx) {
    const { availability } = getAgendaDeps();
    await availability.deleteMany(ids);
    await ctx.emit("agenda.availability.changed", { date: "", operation: "delete" });
    return ok({ ok: true as const, count: ids.length });
  },
});
