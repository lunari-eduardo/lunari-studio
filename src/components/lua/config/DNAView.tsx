import React from 'react';
import { useLuaSettings } from '@/hooks/lua/useLuaSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, FileText, Activity, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DNAView() {
  const { profile, isLoadingProfile } = useLuaSettings();

  if (isLoadingProfile) {
    return <div className="py-8 text-center text-muted-foreground animate-pulse">Carregando DNA de Atendimento...</div>;
  }

  if (!profile) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">DNA não inicializado</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Seu assistente ainda não analisou o seu histórico de atendimento. 
            Você pode alimentar o DNA selecionando conversas diretamente no chat.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { learning_metrics = {}, attributes = {} } = profile;
  const conversasAnalisadas = learning_metrics?.conversas_analisadas || 0;
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Nível do DNA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">v{profile.version}</div>
            <p className="text-xs text-muted-foreground mt-1">Status: <span className="text-emerald-500 font-medium">Ativo</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Fontes Analisadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversasAnalisadas}</div>
            <p className="text-xs text-muted-foreground mt-1">Conversas processadas</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Última Atualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(profile.updated_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              às {format(new Date(profile.updated_at), "HH:mm")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sumário de Tom de Voz</CardTitle>
          <CardDescription>
            Como a Lua interpreta a sua forma de se comunicar com os clientes baseada nas análises.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile.voice_summary ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{profile.voice_summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Resumo de voz ainda não gerado.</p>
          )}

          {Object.keys(attributes).length > 0 && (
            <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-2">
              {/* Extrair tags do attributes caso exista. O schema é aberto. */}
              {attributes.formalidade && <Badge variant="secondary">Formalidade: {attributes.formalidade}</Badge>}
              {attributes.estilo && <Badge variant="secondary">Estilo: {attributes.estilo}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
