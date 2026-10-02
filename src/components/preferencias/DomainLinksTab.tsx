import { useState, useCallback } from 'react';
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
      <div className={cn(
        "bg-card border rounded-xl p-5 space-y-4 relative overflow-hidden transition-all",
        !hasPro && "opacity-95"
      )}>
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
            Aumente a autoridade da sua marca usando seu próprio domínio. Nós cuidamos do certificado SSL.
          </p>
        </div>

        <div className="space-y-2">
          <Input
            type="text"
            placeholder="estudio.com.br"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            disabled={!hasPro}
          />
          <p className="text-xs text-muted-foreground">
            Requer apontamento de CNAME no seu provedor de DNS após a configuração.
          </p>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-8">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Salvar Links
        </Button>
      </div>
    </div>
  );
}
