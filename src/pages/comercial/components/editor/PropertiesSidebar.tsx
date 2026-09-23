import React, { useState } from 'react';
import { BlockData } from '@/hooks/useMaterialEditor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Trash2,
  ChevronDown,
  DownloadCloud,
  Loader2,
  Image as ImageIcon,
  MoreVertical,
  MousePointerClick,
  Sparkles,
  Type,
  Layout,
  Palette,
  RectangleVertical,
  RectangleHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useConfigurationContext } from '@/contexts/ConfigurationContext';
import { getBlockDef, getBlockName, BlockField } from '../../blocks/registry';
import { FieldEditor } from '../../blocks/FieldEditor';
import { uploadProposalImage } from '../../blocks/uploadImage';

export interface PropertiesSidebarProps {
  block: BlockData;
  blockIndex: number;
  onUpdateBlock: (index: number, data: Record<string, any>) => void;
  onUpdateDesignTokens?: (tokens: any) => void;
  onRemoveBlock: (index: number) => void;
  /** Contexto para os botões de ajuda de texto com IA */
  aiContext?: {
    materialTitle?: string;
    sessionType?: string;
    tone?: string;
    designTokens?: any;
  };
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

// Chaves que pertencem à aba de Ações (botões, links, CTAs)
const ACTION_FIELD_KEYS = new Set(['btnText', 'btnLink', 'hide_cta', 'cta_text', 'cta_link']);

function isActionField(field: BlockField): boolean {
  if (ACTION_FIELD_KEYS.has(field.key)) return true;
  if (field.kind === 'url') return true;
  return false;
}

function isVisualField(field: BlockField): boolean {
  if (isActionField(field)) return false;
  if (field.kind === 'image' || field.kind === 'color' || field.kind === 'align') return true;
  if (['background', 'style', 'layout', 'text_color', 'hide_images', 'orientation'].includes(field.key)) return true;
  return false;
}

function isContentField(field: BlockField): boolean {
  return !isActionField(field) && !isVisualField(field);
}

// ============================================================
// INSPECTOR CONTEXTUAL — Painel lateral direito reestruturado
// em abas (Conteúdo, Visual, Ações) com cabeçalho fixo.
// ============================================================

export function PropertiesSidebar({
  block,
  blockIndex,
  onUpdateBlock,
  onUpdateDesignTokens,
  onRemoveBlock,
  aiContext,
  onInteractionStart,
  onInteractionEnd,
}: PropertiesSidebarProps) {
  const { pacotes } = useConfigurationContext();
  const [activeTab, setActiveTab] = useState<string>('content');
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const def = getBlockDef(block.type);
  const content: Record<string, any> = block.content ?? {};
  const props: Record<string, any> = block.props ?? {};

  const setContent = (updates: Record<string, any>) => {
    onUpdateBlock(blockIndex, { content: { ...content, ...updates } });
  };

  const setProps = (updates: Record<string, any>) => {
    onUpdateBlock(blockIndex, { props: { ...props, ...updates } });
  };

  const importPackage = (pacote: any) => {
    const features = (pacote.descricao ? String(pacote.descricao).split('\n').map((s: string) => s.trim()).filter(Boolean) : []);
    const newItem = {
      id: crypto.randomUUID(),
      name: pacote.nome || 'Pacote',
      price: pacote.valor != null ? `R$ ${Number(pacote.valor).toLocaleString('pt-BR')}` : '',
      price_unit: 'sessão',
      badge: '',
      features: Array.isArray(pacote.itens) && pacote.itens.length > 0 ? pacote.itens : features,
    };
    setContent({ packages: [...(content.packages ?? []), newItem] });
    setIsPackageModalOpen(false);
  };

  const handleSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadProposalImage(file);
      const slot = { ...((block.props ?? {})[slotKey] ?? {}) };
      setProps({ [slotKey]: { ...slot, image_ref: url } });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar imagem para a nuvem. Verifique sua conexão e tente novamente.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Separação dos campos do schema nas 3 abas contextuais
  const allFields = def?.fields ?? [];
  const allLayoutFields = def?.layoutFields ?? [];

  const contentFields = allFields.filter(isContentField);
  const visualContentFields = allFields.filter(isVisualField);
  const visualLayoutFields = allLayoutFields.filter(f => isVisualField(f) && f.key !== 'orientation');
  const actionFields = [
    ...allFields.filter(isActionField),
    ...allLayoutFields.filter(isActionField),
  ];

  const hasSlots = (def?.propImageSlots?.length ?? 0) > 0;
  const hasVariants = (def?.variants?.length ?? 0) > 0;
  const currentVariant = props.variant ?? def?.defaultVariant;

  return (
    <>
      <div 
        className="flex h-full flex-col bg-background select-none"
        onFocusCapture={onInteractionStart}
        onBlurCapture={onInteractionEnd}
        onPointerDownCapture={onInteractionStart}
      >
        {/* CABEÇALHO CONTEXTUAL FIXO */}
        <div className="shrink-0 p-4 border-b border-border bg-background">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Seção {String(blockIndex + 1).padStart(2, '0')}
              </span>
              <h2 className="text-base font-semibold text-foreground tracking-tight truncate mt-0.5">
                Editando: {block.content?.title || getBlockName(block.type)}
              </h2>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {def?.description ?? getBlockName(block.type)}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
                  title="Mais opções da seção"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onRemoveBlock(blockIndex)}
                  className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover seção
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ESTRUTURA DE ABAS CONTEXTUAIS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="shrink-0 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
            <TabsList className="w-full grid grid-cols-3 h-9 bg-muted/50 p-1 rounded-lg border border-border/40">
              <TabsTrigger 
                value="content" 
                className="text-xs font-medium py-1 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                Conteúdo
              </TabsTrigger>
              <TabsTrigger 
                value="visual" 
                className="text-xs font-medium py-1 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
              >
                Visual
              </TabsTrigger>
              <TabsTrigger 
                value="actions" 
                className="text-xs font-medium py-1 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all relative flex items-center justify-center gap-1.5"
              >
                <span>Ações</span>
                {actionFields.length > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* CORPO ROLÁVEL DO INSPECTOR */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar select-text">

            {/* ======================================================== */}
            {/* ABA 1: CONTEÚDO (Textos, informações, listas estruturadas) */}
            {/* ======================================================== */}
            <TabsContent value="content" className="mt-0 space-y-4 outline-none">
              {/* Botão de importar pacotes cadastrados (apenas Tabela de Preços) */}
              {block.type === 'PricingTable' && (
                <Button
                  variant="outline"
                  className="w-full border-dashed bg-muted/30 text-primary gap-2 h-9 text-xs"
                  onClick={() => setIsPackageModalOpen(true)}
                >
                  <DownloadCloud className="h-3.5 w-3.5" />
                  Importar Pacotes Cadastrados
                </Button>
              )}

              {contentFields.length > 0 ? (
                contentFields.map((field) => (
                  <FieldEditor
                    key={field.key}
                    field={field}
                    value={content[field.key]}
                    onChange={(v) => setContent({ [field.key]: v })}
                    aiContext={{ blockType: block.type, ...aiContext }}
                  />
                ))
              ) : (
                <div className="py-12 px-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <Type className="h-6 w-6 text-muted-foreground/40" />
                  <p className="font-medium text-foreground/80">Sem campos textuais</p>
                  <p className="text-[11px] max-w-[220px]">
                    Esta seção não possui textos configuráveis. Altere a estética na aba Visual.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ======================================================== */}
            {/* ABA 2: VISUAL (Composição, imagens, fundo, tipografia)   */}
            {/* ======================================================== */}
            <TabsContent value="visual" className="mt-0 space-y-5 outline-none">
              {/* Seletor de Variante de Composição */}
              {hasVariants && (
                <div className="space-y-2 pb-3 border-b border-border/60">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <Layout className="h-3.5 w-3.5" /> Composição
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {def!.variants!.map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => setProps({ variant: v.value })}
                        className={`flex flex-col items-start gap-0.5 p-2.5 rounded-lg border text-left transition-all ${
                          currentVariant === v.value
                            ? 'border-primary bg-primary/10 text-primary shadow-xs'
                            : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                        }`}
                      >
                        <span className="text-xs font-medium leading-tight">{v.label}</span>
                        <span className="text-[10px] leading-tight opacity-70 line-clamp-2">{v.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Controle de Orientação da Capa (segmentado com ícones) */}
              {(block.type === 'CoverBlock' || block.type === 'cover') && (
                <div className="space-y-2 pb-3 border-b border-border/60">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <RectangleVertical className="h-3.5 w-3.5" /> Orientação
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProps({ orientation: 'portrait' })}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        (props.orientation ?? 'portrait') === 'portrait'
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                      }`}
                    >
                      <RectangleVertical className="h-4 w-4" />
                      Retrato
                    </button>
                    <button
                      type="button"
                      onClick={() => setProps({ orientation: 'landscape' })}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        props.orientation === 'landscape'
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                      }`}
                    >
                      <RectangleHorizontal className="h-4 w-4" />
                      Paisagem
                    </button>
                  </div>
                </div>
              )}

              {/* Imagens principais vinculadas ao content (ex: Capa, Composição Editorial) */}
              {visualContentFields.map((field) => (
                <div key={field.key} className="space-y-2 pb-3 border-b border-border/60">
                  <FieldEditor
                    field={field}
                    value={content[field.key]}
                    onChange={(v) => setContent({ [field.key]: v })}
                  />
                </div>
              ))}

              {/* Slots de imagens em props (ex: EditorialBlock photo_a/photo_b) */}
              {hasSlots && (
                <div className="space-y-4 pb-3 border-b border-border/60">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" /> Imagens da Composição
                  </Label>
                  <div className="space-y-4">
                    {def!.propImageSlots!.map((slot) => {
                      const current = (block.props ?? {})[slot.key]?.image_ref ?? null;
                      return (
                        <div key={slot.key} className="space-y-2">
                          <Label className="text-xs font-medium text-foreground/90">{slot.label}</Label>
                          <div className="flex gap-3 items-center">
                            <div className="h-16 w-24 shrink-0 rounded-lg border border-border bg-muted/40 flex items-center justify-center overflow-hidden">
                              {current ? (
                                <img src={current} alt={slot.label} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1">
                              <Label htmlFor={`upload-${slot.key}-${blockIndex}`} className="cursor-pointer">
                                <div className="flex h-8 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">
                                  {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                                  {current ? 'Trocar imagem' : 'Enviar imagem'}
                                </div>
                                <input
                                  type="file"
                                  id={`upload-${slot.key}-${blockIndex}`}
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleSlotUpload(e, slot.key)}
                                  disabled={isUploading}
                                />
                              </Label>
                              {current ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full text-xs h-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => setProps({ [slot.key]: { ...((block.props ?? {})[slot.key] ?? {}), image_ref: null } })}
                                >
                                  Remover foto
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Controles de Layout e Estilo (fundo, alinhamento, etc.) */}
              {visualLayoutFields.length > 0 && (
                <div className="space-y-3 pb-3 border-b border-border/60">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" /> Estilo da Seção
                  </Label>
                  <div className="space-y-3">
                    {visualLayoutFields.map((field) => (
                      <FieldEditor
                        key={field.key}
                        field={field}
                        value={props[field.key]}
                        onChange={(v) => setProps({ [field.key]: v })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Accordion: Tipografia Global da Proposta */}
              <Collapsible className="space-y-2 pt-1">
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5 text-primary" /> Tipografia da Proposta
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2 pb-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fonte dos Títulos (Display)</Label>
                    <select 
                      className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                      value={(aiContext as any)?.designTokens?.typography?.display || 'Playfair Display'}
                      onChange={(e) => {
                        const currentTokens = (aiContext as any)?.designTokens || {};
                        onUpdateDesignTokens?.({
                          ...currentTokens,
                          typography: {
                            ...(currentTokens.typography || {}),
                            display: e.target.value
                          }
                        });
                      }}
                    >
                      <option value="Playfair Display">Playfair Display (Serifada Elegante)</option>
                      <option value="Cormorant Garamond">Cormorant Garamond (Editorial Clássica)</option>
                      <option value="Inter">Inter (Moderna Neutra)</option>
                      <option value="Jost">Jost (Geométrica Limpa)</option>
                      <option value="Montserrat">Montserrat (Contemporânea)</option>
                      <option value="Lora">Lora (Literária)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fonte do Corpo</Label>
                    <select 
                      className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                      value={(aiContext as any)?.designTokens?.typography?.body || 'Inter'}
                      onChange={(e) => {
                        const currentTokens = (aiContext as any)?.designTokens || {};
                        onUpdateDesignTokens?.({
                          ...currentTokens,
                          typography: {
                            ...(currentTokens.typography || {}),
                            body: e.target.value
                          }
                        });
                      }}
                    >
                      <option value="Inter">Inter (Altamente Legível)</option>
                      <option value="Jost">Jost (Minimalista)</option>
                      <option value="Playfair Display">Playfair Display</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Manrope">Manrope</option>
                      <option value="Open Sans">Open Sans</option>
                    </select>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>

            {/* ======================================================== */}
            {/* ABA 3: AÇÕES (Botões, links, chamadas para ação)        */}
            {/* ======================================================== */}
            <TabsContent value="actions" className="mt-0 space-y-4 outline-none">
              {actionFields.length > 0 ? (
                actionFields.map((field) => {
                  const isPropField = (def?.layoutFields ?? []).some(f => f.key === field.key);
                  const value = isPropField ? props[field.key] : content[field.key];
                  const onChange = isPropField 
                    ? (v: any) => setProps({ [field.key]: v })
                    : (v: any) => setContent({ [field.key]: v });

                  return (
                    <FieldEditor
                      key={field.key}
                      field={field}
                      value={value}
                      onChange={onChange}
                      aiContext={{ blockType: block.type, ...aiContext }}
                    />
                  );
                })
              ) : (
                <div className="py-12 px-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <MousePointerClick className="h-6 w-6 text-muted-foreground/40" />
                  <p className="font-medium text-foreground/80">Sem ações nesta seção</p>
                  <p className="text-[11px] max-w-[220px]">
                    Esta seção possui propósito exclusivamente editorial ou informativo e não conta com botões interativos.
                  </p>
                </div>
              )}
            </TabsContent>

          </div>
        </Tabs>
      </div>

      {/* MODAL DE IMPORTAÇÃO DE PACOTES */}
      <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar Pacote</DialogTitle>
            <DialogDescription>
              Selecione um pacote cadastrado no sistema para adicionar à tabela.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto space-y-2 py-4">
            {!pacotes || pacotes.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhum pacote cadastrado nas configurações.
              </div>
            ) : (
              pacotes.map((pacote: any) => (
                <div
                  key={pacote.id}
                  onClick={() => importPackage(pacote)}
                  className="flex flex-col p-4 border rounded-xl hover:border-primary cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm">{pacote.nome}</span>
                    <span className="font-bold text-sm text-primary">R$ {pacote.valor}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {pacote.descricao || 'Sem descrição'}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
