import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Activity, CheckCircle2, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LogRow = {
  id: string;
  user_id: string;
  provider: string;
  model_used: string;
  duration_sec: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
  users?: {
    nome_completo: string | null;
    email: string | null;
  } | null;
};

export default function ConversasAiAdminPage() {
  const [apiKey, setApiKey] = useState("");
  const [savedKeyLength, setSavedKeyLength] = useState<number | null>(null);
  const [modelName, setModelName] = useState("gemini-1.5-flash");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const loadSettings = async () => {
    try {
      // Carrega settings de app_settings
      const { data: appSettings } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["conversas_ai_model", "conversas_ai_enabled"]);
        
      if (appSettings) {
        const mod = appSettings.find((s) => s.key === "conversas_ai_model")?.value;
        const isEnabled = appSettings.find((s) => s.key === "conversas_ai_enabled")?.value;
        
        if (mod && typeof mod === "string") setModelName(mod);
        if (isEnabled === "true" || isEnabled === true) setEnabled(true);
      }

      // Verificar tamanho da key criptografada no Vault global (conversas_gemini)
      const { data: keysData, error: keysErr } = await (supabase.rpc as any)("admin_get_platform_keys_status");
      if (!keysErr && keysData && Array.isArray(keysData)) {
        const vaultKey = keysData.find((k: any) => k.provider_name === "conversas_gemini");
        if (vaultKey) {
          setSavedKeyLength((vaultKey as any).key_length);
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await (supabase as any)
        .from("conversas_ai_logs")
        .select("id, user_id, provider, model_used, duration_sec, success, error_message, created_at, users(nome_completo, email)")
        .order("created_at", { ascending: false })
        .limit(30);
        
      if (data) {
        setLogs(data as any[]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  const saveSettings = async () => {
    const hasValidSavedKey = typeof savedKeyLength === "number" && savedKeyLength >= 30;
    if (!apiKey.trim() && !hasValidSavedKey) {
      toast.error("Por favor, digite a Chave de API do Gemini.");
      return;
    }
    
    setSaving(true);
    try {
      // 1. Salvar configs no app_settings
      await supabase.from("app_settings").upsert([
        { key: "conversas_ai_model", value: modelName },
        { key: "conversas_ai_enabled", value: enabled.toString() }
      ]);

      // 2. Salvar chave secreta
      if (apiKey.trim()) {
        const { error } = await supabase.functions.invoke("admin-platform-integration-upsert", {
          body: {
            action: "set_assistant_key",
            provider_name: "conversas_gemini",
            api_key: apiKey.trim(),
            model_id: modelName,
          },
        });
        if (error) throw error;
        setApiKey(""); // Limpa input
        setSavedKeyLength(apiKey.trim().length);
      }
      
      toast.success("Configurações de Conversas AI salvas com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#D4AF37]" />
          Transcrição AI (Conversas)
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gerencie o modelo acústico do Gemini e a API Key para transcrição on-demand dos áudios no módulo de conversas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Cofre & API de Transcrição</CardTitle>
          <CardDescription>
            Defina o provedor do Google Studio (Gemini) e se a funcionalidade está ativa no momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/60">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Habilitar Funcionalidade</Label>
              <p className="text-xs text-muted-foreground">Exibe o botão de transcrever nos áudios do WhatsApp.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>Chave de API (Google AI Studio)</Label>
            <Input 
              type="password" 
              placeholder={savedKeyLength ? "•••••••••••••••• (Chave já salva)" : "Cole a sua API Key do Gemini aqui"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            {savedKeyLength && !apiKey && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Uma chave criptografada já está salva no cofre (provider: conversas_gemini).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Modelo Alvo</Label>
            <Input 
              type="text" 
              placeholder="Ex: gemini-1.5-flash"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Para testes prefira "gemini-1.5-flash". Assim que liberado, substitua por "gemini-3.8-flash".
            </p>
          </div>

          <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Métricas Recentes
          </CardTitle>
          <CardDescription>
            Últimas 30 transcrições processadas pelos Cloudflare Workers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Tempo (s)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingLogs ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      Carregando métricas...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Nenhuma transcrição realizada ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.users?.nome_completo || log.users?.email || log.user_id}
                      </TableCell>
                      <TableCell className="text-xs">{log.model_used}</TableCell>
                      <TableCell className="text-xs">{log.duration_sec.toFixed(2)}s</TableCell>
                      <TableCell>
                        {log.success ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="flex items-center gap-1 text-red-500" title={log.error_message || "Erro"}>
                            <XCircle className="w-4 h-4" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
