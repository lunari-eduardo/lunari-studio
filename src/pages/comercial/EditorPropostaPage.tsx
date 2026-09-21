import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMaterialEditor } from '@/hooks/useMaterialEditor';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, MousePointerClick, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useMaterials } from '@/hooks/useMaterials';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EditorSidebar } from './components/editor/EditorSidebar';
import { PropertiesSidebar } from './components/editor/PropertiesSidebar';
import { VisualRenderer } from './components/editor/VisualRenderer';
import { useMaterialPublicLink } from '@/hooks/useMaterialPublicLink';
import { useR2Upload } from '@/hooks/useR2Upload';
import { gestaoR2Upload } from '@/lib/gestaoR2Upload';
import { supabase } from '@/integrations/supabase/client';
import { SaveTemplateModal } from './components/editor/modals/SaveTemplateModal';
import { CustomizeSlugModal } from './components/editor/modals/CustomizeSlugModal';
import { FullscreenPreviewModal } from './components/editor/modals/FullscreenPreviewModal';
import { EditorHeader } from './components/editor/modals/EditorHeader';
import { NativePdfViewer } from './components/editor/NativePdfViewer';

/** Converte um data URL (geralmente `image/jpeg`) em `File` pronto para upload. */
function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] ?? 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], fileName, { type: mime });
}

export default function EditorMaterialPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editor = useMaterialEditor(id || '');
  const { duplicateMaterial, updateCover } = useMaterials();
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [mobilePanel, setMobilePanel] = useState<'none' | 'structure' | 'properties'>('none');

  // Salvar como modelo
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Link público / Slug
  const publicLink = useMaterialPublicLink(id);
  const [isSlugModalOpen, setIsSlugModalOpen] = useState(false);
  const [slugInput, setSlugInput] = useState('');

  const editorState = editor.state;
  const editorHasChanges = editor.hasChanges;
  const editorSaveStatus = editor.saveStatus;
  const editorSaveDraft = editor.saveDraft;
  const editorUndo = editor.undo;
  const editorRedo = editor.redo;
  const inlineEditing = viewMode === 'desktop' && editorState?.format === 'blocks';

  // Geração/atualização da capa do material.
  // - PDF: ao abrir uma proposta PDF, captura a primeira página e sobe como
  //   `cover_image_url` (somente se ainda não houver uma).
  // - Nativa: se a capa já existe no banco e o `CoverBlock` tem `image_url`,
  //   sincroniza; senão, mantém como está.
  const coverSyncAttemptedRef = useRef<string | null>(null);
  const handleCoverDataUrl = useCallback(
    async (dataUrl: string, materialId: string) => {
      try {
        const file = dataUrlToFile(dataUrl, `${materialId}-cover.jpg`);
        const response = await gestaoR2Upload({
          file,
          context: 'general',
        });
        const url = response.url || `https://media.lunarihub.com/${response.storagePath}`;
        await updateCover.mutateAsync({ id: materialId, coverImageUrl: url });
      } catch (err) {
        // Falha de capa não deve bloquear a visualização do PDF.
        console.warn('[EditorPropostaPage] falha ao gerar capa:', err);
      }
    },
    [updateCover]
  );

  // Atalhos de teclado: undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) editorRedo();
        else editorUndo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        editorRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editorUndo, editorRedo]);

  // Autosave: debounce 2.5s após a última mudança
  useEffect(() => {
    if (!editorHasChanges || editorSaveStatus === 'saving') return;
    const timer = setTimeout(() => {
      editorSaveDraft();
    }, 2500);
    return () => clearTimeout(timer);
  }, [editorHasChanges, editorState, editorSaveStatus, editorSaveDraft]);

  // Sincronização inicial da capa para proposta nativa:
  // se o material ainda não tem capa mas o primeiro CoverBlock tem image_url,
  // grava a URL do bloco como capa do material.
  useEffect(() => {
    if (!editorState || !id) return;
    if (coverSyncAttemptedRef.current === id) return;
    if (editorState.format !== 'blocks') return;
    if (editorState.coverImageUrl) return;
    
    // Procura a primeira imagem disponível nos blocos para usar como capa
    let coverImageUrl = '';
    
    for (const b of editorState.blocks) {
      if (!b) continue;
      // 1. Tenta pegar do CoverBlock
      if (b.type === 'CoverBlock' && b.content?.image_url) {
        coverImageUrl = b.content.image_url;
        break;
      }
      // 2. Tenta pegar de qualquer outro bloco que tenha image_url no content
      if (b.content?.image_url) {
        coverImageUrl = b.content.image_url;
        break;
      }
      // 3. Tenta pegar do EditorialBlock (photo_a ou photo_b)
      if (b.type === 'EditorialBlock' && b.props) {
        if (b.props.photo_a?.image_ref?.url) {
          coverImageUrl = b.props.photo_a.image_ref.url;
          break;
        }
        if (b.props.photo_b?.image_ref?.url) {
          coverImageUrl = b.props.photo_b.image_ref.url;
          break;
        }
      }
    }

    if (!coverImageUrl) return;
    coverSyncAttemptedRef.current = id;
    updateCover.mutate({ id, coverImageUrl });
  }, [editorState, id, updateCover]);

  const handleSaveAsTemplate = async () => {
    if (!editorState || !templateName.trim()) return;
    setIsSavingTemplate(true);
    try {
      const baseSlug =
        templateName
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') || 'modelo';

      const { error } = await (supabase as any)
        .from('proposal_templates')
        .insert({
          template_id: `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`,
          name: templateName.trim(),
          description: `Modelo salvo da proposta "${editorState.title}".`,
          tags: [],
          blocks_json: [...editorState.blocks, { type: 'global_settings', data: editorState.globalSettings }],
          design_tokens: editorState.globalSettings?.design_tokens ?? null,
          is_active: true,
        });
      if (error) throw error;
      toast.success('Modelo salvo! Ele aparece na galeria do wizard "Escolher Modelo".');
      setIsTemplateModalOpen(false);
      setTemplateName('');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar modelo: ' + (err?.message || 'tente novamente'));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const openSlugModal = () => {
    if (publicLink.data?.slug) {
      setSlugInput(publicLink.data.slug);
      setIsSlugModalOpen(true);
      return;
    }

    publicLink.generateLink.mutate(undefined, {
      onSuccess: (link) => {
        setSlugInput(link.slug);
        setIsSlugModalOpen(true);
      },
    });
  };

  const { uploadFile, uploading: isUploadingPdf } = useR2Upload({
    context: 'proposals-pdf',
    onSuccess: (result) => {
      editor.updatePdfUrl(result.url);
      toast.success('PDF atualizado! Lembre-se de salvar o rascunho.');
    },
  });

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = '';
  };

  if (editor.isLoading || !editorState) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeBlock = editorState.blocks[activeIndex];
  const designTokens = editorState.globalSettings?.design_tokens;

  const handleSelectBlock = (index: number) => setActiveIndex(index);
  const handleAddBlock = (type: string) => {
    editor.addBlock(type);
    setActiveIndex(editorState.blocks.length);
  };

  const structurePanel = (
    <EditorSidebar
      blocks={editorState.blocks}
      activeIndex={activeIndex}
      onSelectBlock={(i) => {
        handleSelectBlock(i);
        setMobilePanel('none');
      }}
      onAddBlock={handleAddBlock}
      onMoveBlock={editor.moveBlock}
      onReorderBlocks={editor.reorderBlocks}
      onApplyDesignTokens={(tokens) => editor.updateGlobalSettings({ design_tokens: tokens })}
      materialTitle={editorState.title}
    />
  );

  const propertiesPanel = activeBlock ? (
    <PropertiesSidebar
      block={activeBlock}
      blockIndex={activeIndex}
      onUpdateBlock={editor.updateBlock}
      onUpdateDesignTokens={editor.updateDesignTokens}
      aiContext={{ materialTitle: editorState.title, designTokens: editorState.globalSettings?.design_tokens }}
      onRemoveBlock={(index) => {
        const nextCount = editorState.blocks.length - 1;
        editor.removeBlock(index);
        setActiveIndex((prev) => (prev > index ? prev - 1 : Math.min(prev, Math.max(0, nextCount - 1))));
      }}
    />
  ) : (
    <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
      Selecione uma seção para editar suas propriedades.
    </div>
  );

  return (
    <>
      <div className="flex h-screen w-full flex-col bg-muted/30 overflow-hidden">
        {/* TOPBAR */}
        <EditorHeader
          state={editorState}
          hasChanges={editorHasChanges}
          saveStatus={editorSaveStatus}
          viewMode={viewMode}
          setViewMode={setViewMode}
          zoom={zoom}
          setZoom={setZoom}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onUpdateTitle={editor.updateTitle}
          onSaveDraft={editor.saveDraft}
          onPublish={editor.publish}
          onDiscardChanges={editor.discardChanges}
          onUpdateGlobalSettings={editor.updateGlobalSettings}
          onOpenPreview={() => setIsPreviewOpen(true)}
          onOpenDuplicate={() => {
            if (!id) return;
            duplicateMaterial.mutate(id, {
              onSuccess: (newMaterial) => {
                navigate(`/app/comercial/construtor/${newMaterial.id}`);
              },
            });
          }}
          onOpenSlugModal={openSlugModal}
          onOpenTemplateModal={() => {
            setTemplateName(`${editorState.title} (modelo)`);
            setIsTemplateModalOpen(true);
          }}
          onOpenMobileStructure={() => setMobilePanel('structure')}
          onOpenMobileProperties={() => setMobilePanel('properties')}
          hasActiveBlock={!!activeBlock}
        />

        {/* WORKSPACE */}
        <main className="flex flex-1 overflow-hidden relative">
          {editorState.format === 'blocks' ? (
            <>
              {/* COLUNA ESQUERDA: ESTRUTURA (≥lg) */}
              <div className="hidden lg:flex w-[280px] shrink-0 border-r bg-background flex-col z-10">
                {structurePanel}
              </div>

              {/* COLUNA CENTRAL: RENDERIZADOR VISUAL */}
              <div className="flex-1 overflow-y-auto bg-muted/30 relative flex justify-center custom-scrollbar">
                {inlineEditing && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/90 border border-border shadow-sm text-[11px] text-muted-foreground pointer-events-none">
                    <MousePointerClick className="h-3 w-3" />
                    Clique para selecionar · Duplo clique para editar o texto
                  </div>
                )}
                <div className="w-full h-full" style={viewMode === 'desktop' && zoom !== 1 ? { zoom } : undefined}>
                  <VisualRenderer
                    blocks={editorState.blocks}
                    activeIndex={activeIndex}
                    onSelectBlock={handleSelectBlock}
                    viewMode={viewMode}
                    designTokens={designTokens}
                    inlineEditing={inlineEditing}
                    onUpdateField={editor.updateBlockField}
                  />
                </div>
              </div>

              {/* COLUNA DIREITA: PROPRIEDADES (≥lg) */}
              <div className="hidden lg:flex w-[340px] shrink-0 border-l bg-background flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10">
                {propertiesPanel}
              </div>
            </>
          ) : (
            <div className="flex-1 w-full h-full flex flex-col bg-muted/20">
              {editorState.pdfUrl ? (
                <div key={editorState.pdfUrl} className="flex-1 overflow-auto">
                  <NativePdfViewer
                    url={editorState.pdfUrl}
                    backgroundClass="bg-muted/30"
                    onFirstPageRendered={(dataUrl) => {
                      if (!id) return;
                      if (coverSyncAttemptedRef.current === id) return;
                      coverSyncAttemptedRef.current = id;
                      if (editorState.coverImageUrl) return; // já tem capa
                      void handleCoverDataUrl(dataUrl, id);
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="bg-background border border-border rounded-xl p-8 max-w-md text-center shadow-sm">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                      <FileText className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Proposta em PDF</h3>
                    <p className="text-muted-foreground mb-6">
                      Este material ainda não tem um arquivo PDF anexado.
                    </p>
                  </div>
                </div>
              )}

              <div className="shrink-0 border-t bg-background p-3 flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => editorState.pdfUrl && window.open(editorState.pdfUrl, '_blank')}
                  disabled={!editorState.pdfUrl}
                >
                  Abrir em nova aba
                </Button>
                <Button className="relative" disabled={isUploadingPdf}>
                  {isUploadingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Substituir Arquivo
                  <input
                    type="file"
                    accept=".pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handlePdfUpload}
                    disabled={isUploadingPdf}
                  />
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DRAWERS DE ESTRUTURA/PROPRIEDADES (mobile) */}
      <Sheet open={mobilePanel === 'structure'} onOpenChange={(open) => !open && setMobilePanel('none')}>
        <SheetContent side="left" className="w-[300px] sm:w-[320px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Estrutura da Proposta</SheetTitle>
          </SheetHeader>
          {structurePanel}
        </SheetContent>
      </Sheet>

      <Sheet open={mobilePanel === 'properties'} onOpenChange={(open) => !open && setMobilePanel('none')}>
        <SheetContent side="right" className="w-[340px] sm:w-[380px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Propriedades da Seção</SheetTitle>
          </SheetHeader>
          {propertiesPanel}
        </SheetContent>
      </Sheet>

      {/* MODAL FULLSCREEN PREVIEW */}
      <FullscreenPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={editorState.title}
        format={editorState.format}
        blocks={editorState.blocks}
        pdfUrl={editorState.pdfUrl}
        viewMode={viewMode}
        setViewMode={setViewMode}
        designTokens={designTokens}
      />

      {/* MODAL SALVAR COMO MODELO */}
      <SaveTemplateModal
        isOpen={isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        templateName={templateName}
        setTemplateName={setTemplateName}
        onSave={handleSaveAsTemplate}
        isSaving={isSavingTemplate}
      />

      {/* MODAL PERSONALIZAR SLUG */}
      <CustomizeSlugModal
        isOpen={isSlugModalOpen}
        onOpenChange={setIsSlugModalOpen}
        slugInput={slugInput}
        setSlugInput={setSlugInput}
        currentSlug={publicLink.data?.slug}
        onSave={() => {
          publicLink.updateSlug.mutate(slugInput, {
            onSuccess: () => setIsSlugModalOpen(false),
          });
        }}
        isPending={publicLink.updateSlug.isPending}
      />
    </>
  );
}
