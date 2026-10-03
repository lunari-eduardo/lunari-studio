import { useState, useCallback, useEffect } from 'react';
import { Globe, Link as LinkIcon, Crown, CheckCircle2, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserProfile } from '@/services/ProfileService';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useProModal } from '@/components/access/ProUpgradeModal';
import { getPublicShareBaseUrl } from '@/utils/domainUtils';
import { cn } from '@/lib/utils';

interface DomainLinksTabProps {
  profile: Partial<UserProfile>;
  onSaveProfile: (data: Partial<UserProfile>) => Promise<boolean>;
}

export function DomainLinksTab({ profile, onSaveProfile }: DomainLinksTabProps) {
  const { hasPro } = useAccessControl();
  const { openModal } = useProModal();
  
  const [isSaving, setIsSaving] = useState(false);
  const [namespace, setNamespace] = useState(profile.public_namespace || '');
  const [customDomain, setCustomDomain] = useState(profile.custom_domain || '');

  const sanitizeNamespace = (val: string) => {
    // Remove acentos, espaços e caracteres especiais, converte pra minúsculas
    return val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const sanitizeDomain = (val: string) => {
    // Basic domain cleanup
    return val
      .toLowerCase()
      .replace(/https?:\/\//, '')
      .replace(/\/.*$/, '')
      .trim();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanNamespace = namespace ? sanitizeNamespace(namespace) : null;
      const cleanDomain = customDomain && hasPro ? sanitizeDomain(customDomain) : null;
      
      const success = await onSaveProfile({
        public_namespace: cleanNamespace,
        custom_domain: cleanDomain
      });
      
      if (success) {
        setNamespace(cleanNamespace || '');
        setCustomDomain(cleanDomain || '');
        toast.success('Configurações de link atualizadas com sucesso!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar configurações de link.');
    } finally {
      setIsSaving(false);
    }
  };

  const previewBaseUrl = getPublicShareBaseUrl({
    namespace: namespace ? sanitizeNamespace(namespace) : 'meu-estudio',
    customDomain: customDomain && hasPro ? sanitizeDomain(customDomain) : null
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Globe className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Links Públicos & Domínio</h2>
          <p className="text-sm text-muted-foreground">Personalize como os clientes verão os links do seu estúdio.</p>
        </div>
      </div>

      {/* Namespace / Link Base Lunari */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label className="text-base">Link do Estúdio</Label>
            <Badge variant="secondary" className="font-normal text-xs">Gratuito</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Escolha um identificador único para o seu estúdio. Ele será usado em galerias, propostas e orçamentos.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex rounded-md shadow-sm">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted/50 px-3 text-muted-foreground sm:text-sm">
              lunarihub.com/
            </span>
            <Input
              type="text"
              placeholder="seu-estudio"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="rounded-l-none focus-visible:z-10"
            />
          </div>
          
          <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-sm flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-muted-foreground">
              Exemplo de galeria:{' '}
              <span className="text-foreground font-medium break-all">
                https://lunarihub.com/{namespace ? sanitizeNamespace(namespace) : 'seu-estudio'}/g/xyz
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Domínio Personalizado */}
      <CustomDomainSection 
        profile={profile} 
        hasPro={hasPro} 
        openModal={openModal} 
        onSaveProfile={onSaveProfile} 
      />

      <div className="pt-4 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-8">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Salvar Links
        </Button>
      </div>
    </div>
  );
}

const WORKER_URL = 'https://lunari-domains-api.eduardo22diehl.workers.dev';

function CustomDomainSection({ profile, hasPro, openModal, onSaveProfile }: any) {
  const [domainInput, setDomainInput] = useState(profile.custom_domain || '');
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Hook inicial para pegar o status se já existir domínio
  useEffect(() => {
    if (profile.custom_domain && hasPro) {
      checkDomainStatus(profile.custom_domain);
    }
  }, []);

  const getAuthToken = async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const sanitizeDomain = (val: string) => {
    return val.toLowerCase().replace(/https?:\/\//, '').replace(/\/.*$/, '').trim();
  };

  const checkDomainStatus = async (domainToCheck: string) => {
    setIsChecking(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${WORKER_URL}/status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainToCheck })
      });
      const data = (await res.json()) as any;
      if (data?.success) setStatus(data.hostname);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAddDomain = async () => {
    if (!domainInput) return;
    setIsLoading(true);
    try {
      const cleanDomain = sanitizeDomain(domainInput);
      const token = await getAuthToken();
      const res = await fetch(`${WORKER_URL}/add`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain })
      });
      const data = (await res.json()) as any;
      
      if (!res.ok) throw new Error(data?.error || 'Erro ao adicionar domínio');
      
      setStatus(data?.hostname);
      setDomainInput(cleanDomain);
      toast.success('Domínio registrado! Veja as instruções de DNS.');
      
      // Update local profile state if needed
      await onSaveProfile({ custom_domain: cleanDomain });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!profile.custom_domain && !domainInput) return;
    setIsLoading(true);
    try {
      const cleanDomain = sanitizeDomain(profile.custom_domain || domainInput);
      const token = await getAuthToken();
      const res = await fetch(`${WORKER_URL}/delete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain })
      });
      
      if (!res.ok) throw new Error('Erro ao remover domínio');
      
      setStatus(null);
      setDomainInput('');
      toast.success('Domínio removido com sucesso.');
      await onSaveProfile({ custom_domain: null });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("bg-card border rounded-xl p-5 space-y-4 relative overflow-hidden transition-all", !hasPro && "opacity-95")}>
      {!hasPro && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl">
          <div className="bg-card border shadow-lg rounded-xl p-6 text-center max-w-sm mx-auto">
            <div className="mx-auto w-12 h-12 bg-accent-gold/10 rounded-full flex items-center justify-center mb-4">
              <Crown className="h-6 w-6 text-accent-gold" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Domínio Personalizado</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Assine o Plano Pro para usar seu próprio domínio (ex: www.seuestudio.com.br) em todos os links do Lunari.
            </p>
            <Button onClick={() => openModal()} className="w-full bg-accent-gold hover:bg-accent-gold/90 text-primary-foreground">
              Fazer Upgrade
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Label className="text-base">Domínio Próprio</Label>
          <Badge className="bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 border-accent-gold/20 font-normal">
            <Crown className="w-3 h-3 mr-1" /> Pro
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Aumente a autoridade da sua marca usando seu próprio domínio.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="estudio.com.br"
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          disabled={!hasPro || !!status}
        />
        {!status ? (
          <Button onClick={handleAddDomain} disabled={isLoading || !domainInput || !hasPro}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
          </Button>
        ) : (
          <Button variant="destructive" onClick={handleRemoveDomain} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remover'}
          </Button>
        )}
      </div>

      {status && (
        <div className="mt-4 p-4 bg-muted/30 border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              Status do Domínio: 
              {status.status === 'active' ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>
              ) : (
                <Badge variant="secondary" className="text-yellow-600">Pendente</Badge>
              )}
            </h4>
            <Button variant="outline" size="sm" onClick={() => checkDomainStatus(domainInput)} disabled={isChecking}>
              {isChecking ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null} Atualizar
            </Button>
          </div>

          {status.status !== 'active' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Para ativar, você precisa criar estes dois registros no painel do seu provedor de domínio (Registro.br, GoDaddy, Hostinger, etc):
              </p>
              
              <div className="bg-background border rounded-md p-3 space-y-2 text-sm font-mono break-all">
                <div>
                  <span className="text-muted-foreground">1. CNAME de Apontamento</span><br/>
                  <strong>Tipo:</strong> CNAME<br/>
                  <strong>Nome:</strong> @ (ou o subdomínio se for o caso)<br/>
                  <strong>Destino:</strong> fallback.lunarihub.com
                </div>
                {status.ownership_verification && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">2. TXT de Verificação do Cloudflare</span><br/>
                    <strong>Tipo:</strong> TXT<br/>
                    <strong>Nome:</strong> {status.ownership_verification.name}<br/>
                    <strong>Valor:</strong> {status.ownership_verification.value}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <DnsHelpAccordion />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



function DnsHelpAccordion() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border rounded-md mt-4">
      <button 
        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent-gold" /> 
          Como configurar isso no meu provedor?
        </span>
        <span className="text-muted-foreground">{isOpen ? 'Ocultar' : 'Ver tutoriais'}</span>
      </button>

      {isOpen && (
        <div className="p-4 border-t space-y-5 text-sm text-muted-foreground bg-muted/20">
          <div className="space-y-2">
            <h5 className="font-semibold text-foreground">Registro.br</h5>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Acesse o painel do seu domínio no Registro.br.</li>
              <li>Role até a seção "DNS" e clique em <strong>"Configurar Zona DNS"</strong>.</li>
              <li>Se o botão disser apenas "Alterar Servidores DNS", clique primeiro no botão <strong>MODO AVANÇADO</strong> (no rodapé da janela) para liberar a criação de TXT e CNAME.</li>
              <li>Clique em <strong>Nova Entrada</strong> e adicione o CNAME e o TXT conforme solicitado acima.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-foreground">Hostinger</h5>
            <ol className="list-decimal pl-4 space-y-1">
              <li>No hPanel, vá em Domínios e selecione o seu domínio.</li>
              <li>No menu lateral, clique em <strong>DNS / Nameservers</strong>.</li>
              <li>Em "Gerenciar registros DNS", preencha os campos para criar o CNAME (Destino: fallback.lunarihub.com) e depois o TXT.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-foreground">GoDaddy</h5>
            <ol className="list-decimal pl-4 space-y-1">
              <li>No painel de produtos da GoDaddy, clique em <strong>DNS</strong> ao lado do seu domínio.</li>
              <li>Clique no botão <strong>Adicionar Novo Registro</strong>.</li>
              <li>Crie a entrada CNAME. Depois, repita o processo para criar a entrada TXT.</li>
            </ol>
          </div>

          <div className="bg-accent-gold/10 p-3 rounded-md text-accent-gold/90 mt-2 flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Importante:</strong> Após salvar lá no seu provedor, pode demorar de 10 minutos até 24 horas para a internet propagar esses registros (normalmente é bem rápido). Quando propagar, o status aqui mudará sozinho para Ativo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
