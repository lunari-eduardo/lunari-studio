import { X, FileSignature, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ContratoSeedTemplate } from '@/utils/contratoSeedTemplates';

interface ContratoPreviewModalProps {
  seed: ContratoSeedTemplate | null;
  onClose: () => void;
  onUseTemplate?: (seed: ContratoSeedTemplate) => void;
}

export function ContratoPreviewModal({
  seed,
  onClose,
  onUseTemplate,
}: ContratoPreviewModalProps) {
  if (!seed) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-background border border-border/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5 shrink-0 bg-card/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">{seed.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {seed.nome.replace('Contrato — ', '')}
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-[hsl(var(--accent-gold))]/30 text-[hsl(var(--accent-gold))]"
                >
                  {seed.categoria}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{seed.descricao}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onUseTemplate && (
              <Button
                size="sm"
                className="h-8 bg-[hsl(var(--accent-gold))] hover:bg-[hsl(var(--accent-gold))]/90 text-primary-foreground text-xs"
                onClick={() => {
                  onUseTemplate(seed);
                  onClose();
                }}
              >
                Usar este modelo
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Fechar"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Visualizador do documento estilo Folha A4 */}
        <ScrollArea className="flex-1 p-6 bg-muted/20">
          <div className="mx-auto max-w-2xl bg-card border border-border/60 rounded-xl p-8 shadow-sm">
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed
                [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-4 [&_h2]:text-foreground [&_h2]:border-b [&_h2]:pb-2 [&_h2]:border-border/40
                [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-foreground
                [&_p]:text-xs [&_p]:leading-relaxed [&_p]:my-2
                [&_strong]:font-semibold [&_strong]:text-foreground"
              dangerouslySetInnerHTML={{ __html: seed.conteudo }}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
