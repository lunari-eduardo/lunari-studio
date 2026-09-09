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

      if (error) {
        // Table might not exist yet if migration pending
        if (error.code === '42P01') return DEFAULTS;
        throw error;
      }
      
      if (!data || data.length === 0) {
        // Insere os defaults reais no banco em vez de usar IDs simulados
        const inserts = DEFAULTS.map(d => ({
          user_id: user.id,
          name: d.name,
          color: d.color,
          is_active: true
        }));
        
        const { data: inserted, error: insertError } = await supabase
          .from("availability_types")
          .insert(inserts)
          .select("id, name, color");
          
        if (insertError) {
          console.error("Falha ao criar tipos padrões:", insertError);
          return DEFAULTS;
        }
        
        return inserted as AvailabilityType[];
      }

      // Garante que ambos Disponível e Ocupado existam
      const hasDisponivel = data.some(t => t.name.trim().toLowerCase() === 'disponível' || t.name.trim().toLowerCase() === 'disponivel');
      const hasOcupado = data.some(t => t.name.trim().toLowerCase() === 'ocupado');
      const missingInserts: any[] = [];

      if (!hasDisponivel) {
        missingInserts.push({ user_id: user.id, name: 'Disponível', color: '#10b981', is_active: true });
      }
      if (!hasOcupado) {
        missingInserts.push({ user_id: user.id, name: 'Ocupado', color: '#ef4444', is_active: true });
      }

      if (missingInserts.length > 0) {
        const { data: newInserted } = await supabase
          .from("availability_types")
          .insert(missingInserts)
          .select("id, name, color");
        if (newInserted) {
          return [...data, ...newInserted] as AvailabilityType[];
        }
      }
      
      return data;
    } catch (error) {
      console.error("Erro listando tipos de disponibilidade:", error);
      return DEFAULTS;
    }
  }

  async add(data: Omit<AvailabilityType, "id">): Promise<AvailabilityType> {
    try {
      const user = await requireUser();
      const norm = data.name.trim().toLowerCase();
      if (norm === 'ocupado' || norm === 'disponível' || norm === 'disponivel') {
        throw new Error("Já existe um tipo padrão do sistema com esse nome");
      }

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
    } catch (error: any) {
      console.error("Erro ao adicionar tipo de disponibilidade:", error);
      throw new Error(error.message || "Falha ao adicionar tipo de disponibilidade");
    }
  }

  async update(id: string, updates: Partial<AvailabilityType>): Promise<void> {
    try {
      const user = await requireUser();

      const { data: existing } = await supabase
        .from("availability_types")
        .select("name")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const norm = existing.name.trim().toLowerCase();
        if (norm === 'ocupado' || norm === 'disponível' || norm === 'disponivel') {
          throw new Error("Tipos padrão do sistema não podem ser alterados");
        }
      }
      
      const patch: any = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.color !== undefined) patch.color = updates.color;

      const { error } = await supabase
        .from("availability_types")
        .update(patch)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Erro ao atualizar tipo de disponibilidade:", error);
      throw new Error(error.message || "Falha ao atualizar tipo de disponibilidade");
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const user = await requireUser();

      const { data: existing } = await supabase
        .from("availability_types")
        .select("name")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const norm = existing.name.trim().toLowerCase();
        if (norm === 'ocupado' || norm === 'disponível' || norm === 'disponivel') {
          throw new Error("Tipos padrão do sistema não podem ser excluídos");
        }
      }

      // Tenta hard delete
      const { error } = await supabase
        .from("availability_types")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.warn("Delete falhou (possível uso em link de agenda), inativando...", error);
        const { error: updateError } = await supabase
          .from("availability_types")
          .update({ is_active: false })
          .eq("id", id)
          .eq("user_id", user.id);
          
        if (updateError) throw updateError;
      }
    } catch (error: any) {
      console.error("Erro ao excluir tipo de disponibilidade:", error);
      throw new Error(error.message || "Falha ao excluir tipo de disponibilidade");
    }
  }
}
