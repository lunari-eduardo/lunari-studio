/**
 * FormDetailShare — tab de compartilhamento do formulário.
 *
 * Mostra:
 *  • Token público (campo `public_token` do schema, sempre presente).
 *  • Link público derivado do token + origin da app.
 *  • Botão de copiar.
 *
 * Princípio: sem mock. Se o formulário ainda não tem token (raro), informa ao
 * usuário. Outras funções de envio (email/whatsapp) ficam fora do escopo aqui —
 * pertencem a fluxos já existentes no Comercial → Briefing.
 */
import { useState, useMemo } from 'react';
import { Copy, Check, ExternalLink, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import type { Formulario } from '@/types/formulario';
import { getFormPublicUrl } from '../utils/publicUrl';

interface Props {
  form: Formulario;
}

export function FormDetailShare({ form }: Props) {
  const [copied, setCopied] = useState(false);

  /** URL pública do formulário baseada no `public_token`. */
  const publicUrl = useMemo(() => getFormPublicUrl(form), [form]);

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({ title: 'Link copiado!' });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Tente selecionar e copiar manualmente.',
        variant: 'destructive',
      });
    }
  };

  if (!publicUrl) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-center max-w-2xl">
        <Link2 size={20} className="mx-auto text-muted-foreground mb-2" strokeWidth={1.5} />
        <p className="text-sm font-medium text-foreground">Link público indisponível</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Este formulário ainda não possui um token público. Salve as configurações
          para gerar um link.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">Link público</h4>
          <p className="text-xs text-muted-foreground">
            Compartilhe este link com o cliente para que ele responda o formulário.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={publicUrl}
            readOnly
            className="h-9 text-xs font-mono"
            aria-label="Link público do formulário"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-1.5 shrink-0"
            aria-label="Copiar link"
          >
            {copied ? (
              <>
                <Check size={14} strokeWidth={1.8} />
                Copiado
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={1.8} />
                Copiar
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="gap-1.5 shrink-0"
            aria-label="Abrir link em nova aba"
          >
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} strokeWidth={1.8} />
            </a>
          </Button>
        </div>

        <div className="text-[11px] text-muted-foreground">
          Token: <span className="font-mono">{form.public_token}</span>
        </div>
      </div>
    </div>
  );
}
