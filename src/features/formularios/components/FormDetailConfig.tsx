/**
 * FormDetailConfig — configurações do formulário (tab interna).
 *
 * Escopo enxuto (Fase 5):
 *  • Editar título, descrição e tempo estimado (campos reais do schema).
 *  • Ações em massa: arquivar / desarquivar (status = 'arquivado' | 'rascunho').
 *
 * Não cria campos novos. Não mexe em permissões.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Archive, ArchiveRestore, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import type { Formulario } from '@/types/formulario';

interface Props {
  form: Formulario;
}

export function FormDetailConfig({ form }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState(form.titulo);
  const [descricao, setDescricao] = useState(form.descricao ?? '');
  const [tempoEstimado, setTempoEstimado] = useState(form.tempo_estimado);
  const [saving, setSaving] = useState(false);

  const isArchived = form.status === 'arquivado';
  const isDirty =
    titulo !== form.titulo ||
    descricao !== (form.descricao ?? '') ||
    tempoEstimado !== form.tempo_estimado;

  // Reset state when the underlying form changes (navegação entre forms).
  useEffect(() => {
    setTitulo(form.titulo);
    setDescricao(form.descricao ?? '');
    setTempoEstimado(form.tempo_estimado);
  }, [form.id, form.titulo, form.descricao, form.tempo_estimado]);

  const handleSave = async () => {
    if (!user || !isDirty) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('formularios')
        .update({
          titulo: titulo.trim() || form.titulo,
          descricao: descricao.trim() || null,
          tempo_estimado: tempoEstimado,
        })
        .eq('id', form.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Configurações salvas.' });
      queryClient.invalidateQueries({ queryKey: ['formularios'] });
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!user) return;
    const novoStatus = isArchived ? 'rascunho' : 'arquivado';
    try {
      const { error } = await supabase
        .from('formularios')
        .update({ status: novoStatus })
        .eq('id', form.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: isArchived ? 'Formulário desarquivado.' : 'Formulário arquivado.',
      });
      queryClient.invalidateQueries({ queryKey: ['formularios'] });
    } catch (err) {
      toast({
        title: 'Erro ao alterar status',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* CTA para o novo editor — onde perguntas, opções e preview acontecem */}
      {!isArchived && (
        <div className="rounded-xl border border-border/60 bg-card p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-0.5">
            <h4 className="text-sm font-medium text-foreground">Editor do formulário</h4>
            <p className="text-xs text-muted-foreground">
              Adicione perguntas, configure tipos e visualize o resultado antes de publicar.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/app/formularios/${form.id}/editor`)}
            className="gap-1.5 bg-foreground text-background hover:bg-foreground/90"
          >
            <Pencil size={14} strokeWidth={1.8} /> Editar formulário
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="titulo" className="text-xs">Título</Label>
          <Input
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={isArchived}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descricao" className="text-xs">Descrição</Label>
          <Textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            disabled={isArchived}
            rows={3}
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tempo" className="text-xs">Tempo estimado (min)</Label>
          <Input
            id="tempo"
            type="number"
            min={0}
            max={120}
            value={tempoEstimado}
            onChange={(e) => setTempoEstimado(Number(e.target.value) || 0)}
            disabled={isArchived}
            className="h-9 w-32"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saving || isArchived}
            className="gap-1.5"
          >
            <Save size={14} strokeWidth={1.8} />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </div>

      {/* Ações de status */}
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
        <div>
          <h4 className="text-sm font-medium text-foreground">Status do formulário</h4>
          <p className="text-xs text-muted-foreground">
            Formulários arquivados ficam ocultos da lista principal, mas podem ser
            restaurados a qualquer momento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleArchive}
              className="gap-1.5"
            >
              <ArchiveRestore size={14} strokeWidth={1.8} />
              Desarquivar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleArchive}
              className="gap-1.5"
            >
              <Archive size={14} strokeWidth={1.8} />
              Arquivar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FormDetailConfigSkeleton() {
  return (
    <div className="space-y-4 max-w-2xl">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
