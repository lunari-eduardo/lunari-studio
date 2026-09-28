import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useLuaSettings, LuaStudioKnowledge } from '@/hooks/lua/useLuaSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Check, Loader2 } from 'lucide-react';
import debounce from 'lodash/debounce';

export function StudioKnowledgeEditor() {
  const { knowledge, isLoadingKnowledge, updateKnowledge } = useLuaSettings();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const { register, watch, reset, getValues } = useForm<Partial<LuaStudioKnowledge>>({
    defaultValues: {
      hours: '',
      policies: '',
      services: '',
      pix_reference: '',
      websites: '',
      socials: '',
      notes: ''
    }
  });

  useEffect(() => {
    if (knowledge) {
      reset({
        hours: knowledge.hours || '',
        policies: knowledge.policies || '',
        services: knowledge.services || '',
        pix_reference: knowledge.pix_reference || '',
        websites: knowledge.websites || '',
        socials: knowledge.socials || '',
        notes: knowledge.notes || ''
      });
    }
  }, [knowledge, reset]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(async (data: Partial<LuaStudioKnowledge>) => {
      setSaveStatus('saving');
      try {
        await updateKnowledge(data);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        setSaveStatus('idle');
      }
    }, 1000),
    [updateKnowledge]
  );

  useEffect(() => {
    const subscription = watch((value) => {
      debouncedSave(getValues());
    });
    return () => subscription.unsubscribe();
  }, [watch, debouncedSave, getValues]);

  if (isLoadingKnowledge) {
    return <div className="py-8 text-center text-muted-foreground animate-pulse">Carregando conhecimento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Conhecimento Declarado</h3>
          <p className="text-sm text-muted-foreground">
            Instruções e dados factuais que a Lua usará em todos os rascunhos.
          </p>
        </div>
        
        <div className="flex items-center h-8">
          {saveStatus === 'saving' && (
            <span className="flex items-center text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Salvando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center text-xs text-emerald-500">
              <Check className="w-3 h-3 mr-1" /> Salvo
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Horário de Atendimento & SLA</Label>
              <Textarea 
                id="hours" 
                placeholder="Ex: Seg a Sex, das 09h às 18h. Tempo de resposta médio de 2h."
                className="resize-none h-20"
                {...register('hours')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pix_reference">Chave Pix Padrão</Label>
              <Input 
                id="pix_reference" 
                placeholder="Ex: CNPJ 12.345.678/0001-90"
                {...register('pix_reference')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="websites">Links e Portfólio</Label>
              <Input 
                id="websites" 
                placeholder="Ex: https://meusite.com.br"
                {...register('websites')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="policies">Políticas de Cancelamento / Reagendamento</Label>
              <Textarea 
                id="policies" 
                placeholder="Ex: Cancelamentos com menos de 24h retêm o sinal."
                className="resize-none h-20"
                {...register('policies')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="services">Serviços e Entregas (Resumo)</Label>
              <Textarea 
                id="services" 
                placeholder="Ex: Trabalhamos com ensaios corporativos e retratos femininos."
                className="resize-none h-20"
                {...register('services')}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="notes">Instruções Extras para a Lua</Label>
              <Textarea 
                id="notes" 
                placeholder="Ex: Nunca ofereça descontos maiores que 10%. Prefira sempre convidar para uma call."
                className="resize-none min-h-[100px]"
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
