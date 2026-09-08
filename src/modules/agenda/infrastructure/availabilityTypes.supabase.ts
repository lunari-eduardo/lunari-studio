/**
 * Implementação de AvailabilityTypesRepository migrada para Supabase.
 * Contém rotina automática para migrar dados legados do localStorage 
 * garantindo ausência de regressões para os fotógrafos.
 */
import { supabase } from "@/integrations/supabase/client";
import type { AvailabilityType } from "@/types/availability";
import type { AvailabilityTypesRepository } from "../domain/ports.availabilityTypes";

const STORAGE_KEY = "agenda_availability_types";

const DEFAULTS: AvailabilityType[] = [
  { id: "1", name: "Disponível", color: "#10b981" },
  { id: "2", name: "Ocupado", color: "#ef4444" },
];

async function requireUser() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Usuário não autenticado");
  return data.user;
}

export class SupabaseAvailabilityTypesRepository implements AvailabilityTypesRepository {
  private async migrateIfNeeded(user_id: string): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    
    try {
      const parsed = JSON.parse(raw) as AvailabilityType[];
      if (parsed.length > 0) {
        // Verifica se a base de dados já tem algum registro
        const { count } = await supabase
          .from("availability_types")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user_id);
          
        if (count === 0) {
          const inserts = parsed.map(t => ({
            user_id,
            name: t.name,
            color: t.color,
            is_active: true
          }));
          await supabase.from("availability_types").insert(inserts);
          console.log("✅ Tipos de disponibilidade migrados do localStorage.");
        }
      }
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Falha ao migrar tipos de disponibilidade:", e);
    }
  }

  async list(): Promise<AvailabilityType[]> {
    try {
      const user = await requireUser();
      await this.migrateIfNeeded(user.id);

      const { data, error } = await supabase
        .from("availability_types")
        .select("id, name, color")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Se não há dados, retorna defaults para evitar quebrar a UX antes de qualquer adição
      return data && data.length > 0 ? data : DEFAULTS;
    } catch (error) {
      console.error("Erro listando tipos de disponibilidade:", error);
      return DEFAULTS;
    }
  }

  async add(data: Omit<AvailabilityType, "id">): Promise<AvailabilityType> {
    const user = await requireUser();
    const { data: inserted, error } = await supabase
      .from("availability_types")
      .insert({
        user_id: user.id,
        name: data.name,
        color: data.color
      })
      .select("id, name, color")
      .single();

    if (error) throw error;
    return inserted as AvailabilityType;
  }

  async update(id: string, updates: Partial<AvailabilityType>): Promise<void> {
    const user = await requireUser();
    // Impede alteração dos IDs defaults (se exibidos simuladamente)
    if (id === "1" || id === "2") return;
    
    const patch: any = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.color !== undefined) patch.color = updates.color;

    const { error } = await supabase
      .from("availability_types")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const user = await requireUser();
    if (id === "1" || id === "2") return;

    // Tenta hard delete
    const { error } = await supabase
      .from("availability_types")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.warn("Delete falhou (possível uso em link de agenda), inativando...", error);
      await supabase
        .from("availability_types")
        .update({ is_active: false })
        .eq("id", id)
        .eq("user_id", user.id);
    }
  }
}
