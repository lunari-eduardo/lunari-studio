/**
 * FormSharePopover — popover inline de compartilhamento de formulário.
 *
 * Conteúdo:
 *  • Input readonly com a URL pública.
 *  • Botão Copiar com feedback Check (1500ms).
 *  • Botão Abrir em nova aba.
 *
 * Oculta-se automaticamente quando não há token público.
 */
import { useState } from 'react';
import { Copy, Check, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { getFormPublicUrl } from '../utils/publicUrl';
import type { Formulario } from '@/types/formulario';

interface Props {
  form: Formulario;
  /** Ícone do botão trigger. Default: Share2 (⤴). */
  trigger?: React.ReactNode;
  /** Texto aria-label do trigger. */
  label?: string;
  /** Alinhamento do popover. Default: end. */
  align?: 'center' | 'start' | 'end';
}

export function FormSharePopover({
  form,
  trigger = <Share2 size={14} strokeWidth={1.8} />,
  label = 'Compartilhar',
  align = 'end',
}: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const publicUrl = getFormPublicUrl(form);

  if (!publicUrl) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({ title: 'Link copiado!' });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Selecione e copie manualmente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          className={cn(
            'shrink-0',
            // Desktop: visível só em hover do group. Mobile: sempre visível.
            'opacity-100 md:opacity-0 md:group-hover:opacity-100',
            'transition-opacity duration-150',
            'data-[state=open]:opacity-100',
            'h-9 w-9',
            // À esquerda do ⋯ no card
          )}
        >
          {trigger}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-80 space-y-3 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          Compartilhe este link com o cliente para que ele responda o formulário.
        </p>

        <div className="flex items-center gap-2">
          <Input
            value={publicUrl}
            readOnly
            className="h-8 text-xs font-mono"
            aria-label="Link público do formulário"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-1 shrink-0"
            aria-label="Copiar link"
          >
            {copied ? (
              <>
                <Check size={13} strokeWidth={2} />
                Copiado
              </>
            ) : (
              <>
                <Copy size={13} strokeWidth={1.8} />
                Copiar
              </>
            )}
          </Button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          asChild
          className="gap-1.5 w-full justify-start text-xs"
        >
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={13} strokeWidth={1.8} />
            Abrir link em nova aba
          </a>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
