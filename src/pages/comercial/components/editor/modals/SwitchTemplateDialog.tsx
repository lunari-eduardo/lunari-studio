import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, CornerDownRight, LayoutTemplate, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { BlockData } from '@/hooks/useMaterialEditor';
import { useProposalTemplates } from '../../../biblioteca/hooks/useCreateMaterialWizard';
import { TemplateCard } from '../../../biblioteca/components/wizard/StepTemplateGallery';
import type { DbTemplate } from '../../../biblioteca/types';
import { applyTemplate, instantiateTemplateBlocks } from '../../../blocks/normalization';
import { getBlockName, getSectionTitle } from '../../../blocks/registry';

export interface TemplateSwitch {
  blocks: BlockData[];
  settings: Record<string, any>;
  /** Seções novas trazidas pelo modelo (texto de exemplo: o editor sinaliza para revisar). */
  added: string[];
  templateName: string;
}

interface SwitchTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: BlockData[];
  currentTemplateId?: string;
  onApply: (change: TemplateSwitch) => void;
}

// ============================================================
// TROCAR MODELO
// Estrutura, layouts e tema do modelo escolhido; o que o fotógrafo
// preencheu (textos, fotos, pacotes, depoimentos) é mantido.
// A prévia mostra exatamente o que será aplicado (applyTemplate).
// ============================================================

export function SwitchTemplateDialog({ open, onOpenChange, blocks, currentTemplateId, onApply }: SwitchTemplateDialogProps) {
  const { profile } = useUserProfile();
  const { data: templates = [], isLoading } = useProposalTemplates(open);
  const [selected, setSelected] = useState<DbTemplate | null>(null);
  const [applyTheme, setApplyTheme] = useState(true);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setApplyTheme(true);
  }, [open]);

  const { data: full, isFetching, isError } = useQuery({
    queryKey: ['proposal-template-blocks', selected?.template_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('proposal_templates')
        .select('blocks_json, design_tokens')
        .eq('template_id', selected!.template_id)
        .single();
      if (error) throw error;
      return data as { blocks_json: any[] | null; design_tokens: Record<string, any> | null };
    },
    enabled: open && !!selected,
    staleTime: 5 * 60_000,
  });

  const photographerName = profile?.empresa || profile?.nome || undefined;
  const preview = useMemo(() => {
    if (!full?.blocks_json) return null;
    // Sem `packages`: os pacotes da proposta são preservados pelo applyTemplate
    const tpl = instantiateTemplateBlocks(full.blocks_json, { photographerName });
    const tokens = full.design_tokens ?? tpl.find((b) => b?.type === 'global_settings')?.data?.design_tokens ?? null;
    return { ...applyTemplate(blocks, tpl), tokens };
  }, [full, blocks, photographerName]);

  const byId = (ids: string[]) => preview?.blocks.filter((b) => ids.includes(b.id!)) ?? [];
  const addedBlocks = byId(preview?.added ?? []);
  const keptBlocks = byId(preview?.unmatched ?? []);
  const matchedCount = preview ? preview.blocks.length - addedBlocks.length - keptBlocks.length : 0;

  const handleApply = () => {
    if (!selected || !preview) return;
    onApply({
      blocks: preview.blocks,
      settings: {
        ...(applyTheme && preview.tokens ? { design_tokens: preview.tokens } : {}),
        source_template_id: selected.template_id,
      },
      added: preview.added,
      templateName: selected.name,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 flex flex-col overflow-hidden sm:rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 text-left">
          <DialogTitle>Trocar modelo</DialogTitle>
          <DialogDescription>
            A estrutura, os layouts e o tema vêm do novo modelo. Seus textos, fotos, pacotes e depoimentos são mantidos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <LayoutTemplate className="h-6 w-6" />
              Nenhum modelo disponível.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selected?.id === t.id}
                  onSelect={() => setSelected(t)}
                  badge={t.template_id === currentTemplateId ? 'Atual' : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="border-t bg-muted/30 px-6 py-4 space-y-3 text-sm">
            {isFetching && !preview ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparando prévia…
              </p>
            ) : isError || !preview ? (
              <p className="text-destructive">Não foi possível carregar este modelo. Tente novamente.</p>
            ) : (
              <>
                <p className="font-medium text-foreground">Ao aplicar "{selected.name}":</p>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      {matchedCount} {matchedCount === 1 ? 'seção ganha' : 'seções ganham'} o novo visual, com seus textos e fotos.
                    </span>
                  </li>
                  {addedBlocks.length > 0 && (
                    <li className="flex gap-2">
                      <Plus className="h-4 w-4 shrink-0 text-foreground" />
                      <span>
                        Novas do modelo: {addedBlocks.map((b) => getBlockName(b.type)).join(', ')}{' '}
                        <span className="text-xs">(com texto de exemplo, revise)</span>
                      </span>
                    </li>
                  )}
                  {keptBlocks.length > 0 && (
                    <li className="flex gap-2">
                      <CornerDownRight className="h-4 w-4 shrink-0 text-foreground" />
                      <span>Sem par no modelo, continuam na proposta: {keptBlocks.map(getSectionTitle).join(', ')}</span>
                    </li>
                  )}
                </ul>
                <label className="flex items-center gap-2 cursor-pointer select-none text-foreground">
                  <Checkbox
                    checked={applyTheme && !!preview.tokens}
                    disabled={!preview.tokens}
                    onCheckedChange={(v) => setApplyTheme(v === true)}
                  />
                  Aplicar também o tema do modelo (cores e fontes)
                </label>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
          <span className="text-xs text-muted-foreground hidden sm:inline">Dá para desfazer com Ctrl+Z.</span>
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApply} disabled={!preview} className="gap-2">
              <LayoutTemplate className="h-4 w-4" />
              Aplicar modelo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
