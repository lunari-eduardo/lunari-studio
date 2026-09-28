import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useConversasTemplates, ConversasTemplate } from '@/hooks/useConversasTemplates';

interface TemplateFormPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ConversasTemplate | null;
}

export const ETAPAS_LUA = [
  { value: 'primeiro_contato', label: 'Primeiro Contato' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'pre_ensaio', label: 'Pré-Ensaio' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'pos_venda', label: 'Pós-Venda' },
  { value: 'entrega', label: 'Entrega' },
];

export function TemplateFormPanel({ open, onOpenChange, template }: TemplateFormPanelProps) {
  const { createTemplate, updateTemplate, isCreating, isUpdating } = useConversasTemplates();
  const isLoading = isCreating || isUpdating;

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      nome: '',
      conteudo: '',
      etapa: '',
      ativo: true,
      // palavras_chave: '', // Para uso futuro, simplificado por ora
    }
  });

  const watchAtivo = watch('ativo');
  const watchEtapa = watch('etapa');

  useEffect(() => {
    if (open) {
      if (template) {
        reset({
          nome: template.nome || '',
          conteudo: template.conteudo || '',
          etapa: template.etapa || '',
          ativo: template.ativo !== false,
        });
      } else {
        reset({
          nome: '',
          conteudo: '',
          etapa: '',
          ativo: true,
        });
      }
    }
  }, [open, template, reset]);

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        nome: data.nome,
        conteudo: data.conteudo,
        etapa: data.etapa || null,
        ativo: data.ativo,
      };

      if (template?.id) {
        await updateTemplate({ id: template.id, ...payload });
      } else {
        await createTemplate(payload);
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{template ? 'Editar Modelo' : 'Novo Modelo'}</SheetTitle>
          <SheetDescription>
            Configure o rascunho. Use {'{nome}'} para injetar o nome do cliente.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="nome">Título interno</Label>
            <Input id="nome" placeholder="Ex: Envio de Orçamento" {...register('nome', { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="etapa">Etapa do Funil (Opcional)</Label>
            <Select 
              value={watchEtapa} 
              onValueChange={(val) => setValue('etapa', val === 'nenhuma' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma etapa..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Nenhuma etapa específica</SelectItem>
                {ETAPAS_LUA.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conteudo">Mensagem</Label>
            <Textarea 
              id="conteudo" 
              placeholder="Olá {nome}..." 
              className="min-h-[200px]"
              {...register('conteudo', { required: true })} 
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Ativo na Lua</Label>
              <p className="text-sm text-muted-foreground">
                Modelos inativos não serão sugeridos pela assistente.
              </p>
            </div>
            <Switch
              checked={watchAtivo}
              onCheckedChange={(checked) => setValue('ativo', checked)}
            />
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Modelo'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
