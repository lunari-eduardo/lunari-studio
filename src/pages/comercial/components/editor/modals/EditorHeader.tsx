import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  ArrowLeft,
  Monitor,
  Smartphone,
  Maximize,
  MoreHorizontal,
  Save,
  UploadCloud,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Layers,
  PanelRight,
  Copy as CopyIcon,
  Link as LinkIcon,
  LayoutTemplate,
  MessageCircle,
  Share2,
  ExternalLink,
  Upload,
  ArrowLeftRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MaterialEditorState } from '@/hooks/useMaterialEditor';

interface EditorHeaderProps {
  state: MaterialEditorState;
  hasChanges: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  viewMode: 'desktop' | 'mobile';
  setViewMode: (mode: 'desktop' | 'mobile') => void;
  /** Escala efetiva do preview (1 = largura nominal do documento). */
  zoom: number;
  /** Em "Ajustar à largura" (escala automática). */
  zoomIsFit: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateTitle: (title: string) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onDiscardChanges: () => void;
  onUpdateGlobalSettings: (settings: any) => void;
  onOpenPreview: () => void;
  onOpenDuplicate: () => void;
  onOpenSlugModal: () => void;
  onOpenTemplateModal: () => void;
  onOpenSwitchTemplate?: () => void;
  onOpenMobileStructure: () => void;
  onOpenMobileProperties: () => void;
  hasActiveBlock: boolean;
  onShare?: () => void;
  onViewShares?: () => void;
  onUploadPdf?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingPdf?: boolean;
}

export function EditorHeader({
  state,
  hasChanges,
  saveStatus,
  viewMode,
  setViewMode,
  zoom,
  zoomIsFit,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onUpdateTitle,
  onSaveDraft,
  onPublish,
  onDiscardChanges,
  onUpdateGlobalSettings,
  onOpenPreview,
  onOpenDuplicate,
  onOpenSlugModal,
  onOpenTemplateModal,
  onOpenSwitchTemplate,
  onOpenMobileStructure,
  onOpenMobileProperties,
  hasActiveBlock,
  onShare,
  onViewShares,
  onUploadPdf,
  isUploadingPdf,
}: EditorHeaderProps) {
  const navigate = useNavigate();

  // Alternador desktop/celular + zoom. No desktop fica centralizado no cabeçalho; abaixo de lg entra na faixa rolável.
  // No celular o alternador some: o canvas já tem a largura de um celular, a moldura só gastaria espaço.
  const viewControls = (
    <>
      <div className="hidden md:flex items-center bg-muted/50 rounded-lg p-0.5 border border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('desktop')}
          title="Visualização desktop"
          aria-label="Visualização desktop"
          className={cn(
            'h-8 px-3 rounded-md',
            viewMode === 'desktop' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Monitor className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('mobile')}
          title="Visualização celular"
          aria-label="Visualização celular"
          className={cn(
            'h-8 px-3 rounded-md',
            viewMode === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Smartphone className="h-4 w-4" />
        </Button>
      </div>

      {viewMode === 'desktop' && (
        <div className="hidden md:flex items-center bg-muted/40 rounded-lg p-0.5 border border-border/60">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onZoomOut}
            disabled={zoom <= 0.25}
            title="Afastar (Ctrl + rolagem)"
            aria-label="Afastar"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <button
            type="button"
            onClick={onZoomFit}
            disabled={zoomIsFit}
            title={zoomIsFit ? 'Ajustado à largura' : 'Ajustar à largura'}
            className="min-w-[3rem] px-1 text-center text-[11px] font-medium tabular-nums text-muted-foreground enabled:hover:text-foreground disabled:cursor-default"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onZoomIn}
            disabled={zoom >= 2}
            title="Aproximar (Ctrl + rolagem)"
            aria-label="Aproximar"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-4">
      {/* Esquerda: Navegação e Status */}
      <div className="flex min-w-0 shrink items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => navigate('/app/comercial/biblioteca')}
          title="Voltar para a Biblioteca"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="hidden sm:block h-4 w-px shrink-0 bg-border" />

        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium hidden xl:inline-block whitespace-nowrap">
              Comercial / Biblioteca /
            </span>
            <Input
              value={state.title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              className="h-7 w-[7.5rem] sm:w-[11rem] lg:w-[16rem] xl:w-[300px] max-w-full border-transparent bg-transparent px-1 font-semibold text-foreground shadow-none hover:bg-muted/50 focus-visible:ring-1 p-0 -ml-1 text-sm"
              placeholder="Título do Material"
            />
          </div>

          <span className="text-[11px] font-medium flex items-center gap-1.5 mt-0.5">
            {saveStatus === 'saving' ? (
              <span className="text-muted-foreground flex items-center">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Salvando...
              </span>
            ) : saveStatus === 'error' && hasChanges ? (
              <span className="text-destructive flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                Não salvo · tentando novamente
              </span>
            ) : hasChanges ? (
              <span className="text-amber-600 flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                Alterações não salvas
              </span>
            ) : (
              <span className="text-muted-foreground">Rascunho salvo</span>
            )}
          </span>
        </div>
      </div>

      {/* Centro (lg+): Toggles de Visualização + Zoom (apenas para construtor de blocos nativo) */}
      {state.format === 'blocks' && (
        <div className="absolute left-1/2 top-3 hidden -translate-x-1/2 items-center gap-2 lg:flex">{viewControls}</div>
      )}

      {/* Faixa de ações: abaixo de lg rola na horizontal (roda do mouse também), sem cortar nada; o menu ⋯ fica fora dela, sempre visível */}
      <div
        className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar lg:overflow-visible [&>*]:shrink-0"
        onWheel={(e) => {
          if (e.deltaY && !e.shiftKey && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) e.currentTarget.scrollLeft += e.deltaY;
        }}
      >
        {/* Painéis em gaveta (abaixo de lg) */}
        {state.format === 'blocks' && (
          <div className="flex items-center gap-1 lg:hidden">
            <Button variant="outline" size="sm" className="gap-2" onClick={onOpenMobileStructure}>
              <Layers className="h-4 w-4" />
              Estrutura
            </Button>
            {hasActiveBlock && (
              <Button variant="outline" size="sm" className="gap-2" onClick={onOpenMobileProperties}>
                <PanelRight className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        )}

        {/* Visualização/zoom (tablet); no desktop ficam centralizados acima */}
        {state.format === 'blocks' && <div className="hidden items-center gap-2 md:flex lg:hidden">{viewControls}</div>}

        {/* Ações (empurradas para a direita quando sobra espaço) */}
        <div className="ml-auto flex items-center gap-2">
          {state.format === 'blocks' ? (
            <>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onUndo}
                  disabled={!canUndo}
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRedo}
                  disabled={!canRedo}
                  title="Refazer (Ctrl+Shift+Z)"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" size="sm" className="gap-2" onClick={onOpenPreview}>
                <span className="hidden sm:inline">Pré-visualizar</span>
                <Maximize className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              {state.pdfUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(state.pdfUrl, '_blank')}
                  title="Abrir PDF em nova aba"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Abrir em nova aba</span>
                </Button>
              )}

              {onUploadPdf && (
                <Button
                  variant="outline"
                  size="sm"
                  className="relative gap-2"
                  disabled={isUploadingPdf}
                  title="Substituir arquivo PDF"
                >
                  {isUploadingPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Substituir Arquivo</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={onUploadPdf}
                    disabled={isUploadingPdf}
                  />
                </Button>
              )}
            </>
          )}

          {hasChanges ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onSaveDraft}
                disabled={saveStatus === 'saving'}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm gap-2 disabled:opacity-70"
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saveStatus === 'saving' ? 'Salvando...' : <>Salvar<span className="hidden sm:inline"> Rascunho</span></>}
              </Button>
              <Button size="sm" onClick={onPublish} className="gap-2 bg-primary">
                <UploadCloud className="h-3.5 w-3.5" />
                Publicar<span className="hidden sm:inline"> Versão</span>
              </Button>
            </>
          ) : (
            !state.isPublished && (
              <Button size="sm" onClick={onPublish} className="gap-2 bg-primary">
                <UploadCloud className="h-3.5 w-3.5" />
                Publicar<span className="hidden sm:inline"> Versão</span>
              </Button>
            )
          )}
        </div>
      </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {onShare && (
              <DropdownMenuItem onClick={onShare} className="gap-2 font-medium text-primary focus:text-primary">
                <Share2 className="h-4 w-4" /> Compartilhar Proposta
              </DropdownMenuItem>
            )}
            {onViewShares && (
              <DropdownMenuItem onClick={onViewShares} className="gap-2">
                <Share2 className="h-4 w-4 opacity-70" /> Ver Compartilhamentos
              </DropdownMenuItem>
            )}
            {(onShare || onViewShares) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onSaveDraft} disabled={!hasChanges} className="gap-2">
              <Save className="h-4 w-4" /> Salvar Rascunho
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={onOpenDuplicate}>
              <CopyIcon className="h-4 w-4" /> Duplicar Proposta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSlugModal} className="gap-2">
              <LinkIcon className="h-4 w-4" /> Personalizar Link Público
            </DropdownMenuItem>
            {state.format === 'blocks' && onOpenSwitchTemplate && (
              <DropdownMenuItem onClick={onOpenSwitchTemplate} className="gap-2">
                <ArrowLeftRight className="h-4 w-4" /> Trocar Modelo
              </DropdownMenuItem>
            )}
            {state.format === 'blocks' && (
              <DropdownMenuItem onClick={onOpenTemplateModal} className="gap-2">
                <LayoutTemplate className="h-4 w-4" /> Salvar como Modelo
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={!state.globalSettings?.hideWhatsApp}
              onCheckedChange={(checked) => onUpdateGlobalSettings({ hideWhatsApp: !checked })}
              className="gap-2 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
              Botão Flutuante do WhatsApp
            </DropdownMenuCheckboxItem>
            {state.format === 'blocks' && (
              <DropdownMenuCheckboxItem
                checked={!!state.globalSettings?.keep_desktop_on_mobile}
                onCheckedChange={(checked) => onUpdateGlobalSettings({ keep_desktop_on_mobile: !!checked })}
                className="gap-2 cursor-pointer"
                title="No celular, o cliente vê o mesmo desenho do desktop, reduzido, em vez do layout reorganizado"
              >
                <Smartphone className="h-4 w-4 mr-2 text-muted-foreground" />
                Proporção de desktop no celular
              </DropdownMenuCheckboxItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDiscardChanges} disabled={!hasChanges} className="gap-2 text-destructive">
              Descartar Alterações
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    </header>
  );
}
