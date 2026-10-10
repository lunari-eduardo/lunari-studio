import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useCreateMaterialWizard } from '../hooks/useCreateMaterialWizard';
import { StepMethod } from './wizard/StepMethod';
import { StepTemplateGallery } from './wizard/StepTemplateGallery';
import { StepPdfUpload } from './wizard/StepPdfUpload';

interface CreateMaterialWizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  wizard: ReturnType<typeof useCreateMaterialWizard>;
}

export function CreateMaterialWizardDialog({
  isOpen,
  wizard,
}: CreateMaterialWizardDialogProps) {
  const {
    step,
    setStep,
    selectedCategoria,
    setSelectedCategoria,
    customTitle,
    setCustomTitle,
    creationMethod,
    setCreationMethod,
    selectedDbTemplate,
    setSelectedDbTemplate,
    fileInputRef,
    selectedPdf,
    setSelectedPdf,
    categorias,
    isLoadingCategorias,
    dbTemplates,
    isLoadingDbTemplates,
    handleCloseModal,
    handleCreate,
    isPendingCreate,
    isUploadingPdf,
  } = wizard;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCloseModal();
      }}
    >
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Proposta</DialogTitle>
          <DialogDescription>
            {step === 'method' && 'Escolha como deseja iniciar a criação.'}
            {step === 'template-gallery' && 'Escolha um modelo premium para iniciar.'}
            {step === 'pdf-upload' && 'Faça o upload do seu arquivo PDF estático.'}
          </DialogDescription>
        </DialogHeader>

        {/* ─── PASSO 1: Escolher Modo de Criação ─── */}
        {step === 'method' && (
          <StepMethod
            creationMethod={creationMethod}
            setCreationMethod={setCreationMethod}
          />
        )}

        {/* ─── PASSO 2 (Modelo): Galeria de Templates do Banco ─── */}
        {step === 'template-gallery' && (
          <StepTemplateGallery
            onBack={() => setStep('method')}
            isLoadingDbTemplates={isLoadingDbTemplates}
            dbTemplates={dbTemplates}
            selectedDbTemplate={selectedDbTemplate}
            setSelectedDbTemplate={setSelectedDbTemplate}
            categorias={categorias}
            isLoadingCategorias={isLoadingCategorias}
            selectedCategoria={selectedCategoria}
            setSelectedCategoria={setSelectedCategoria}
            customTitle={customTitle}
            setCustomTitle={setCustomTitle}
            onSubmit={handleCreate}
          />
        )}

        {/* ─── PASSO 2 (PDF): Upload de PDF ─── */}
        {step === 'pdf-upload' && (
          <StepPdfUpload
            onBack={() => setStep('method')}
            selectedPdf={selectedPdf}
            setSelectedPdf={setSelectedPdf}
            fileInputRef={fileInputRef}
            categorias={categorias}
            isLoadingCategorias={isLoadingCategorias}
            selectedCategoria={selectedCategoria}
            setSelectedCategoria={setSelectedCategoria}
            customTitle={customTitle}
            setCustomTitle={setCustomTitle}
            onSubmit={handleCreate}
          />
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={handleCloseModal}>
            Cancelar
          </Button>

          {step === 'method' && (
            <Button
              onClick={() => {
                if (creationMethod === 'db-template') setStep('template-gallery');
                else if (creationMethod === 'pdf') setStep('pdf-upload');
              }}
              disabled={!creationMethod}
              className="gap-2"
            >
              Continuar
              <ChevronRight size={16} />
            </Button>
          )}

          {step === 'template-gallery' && (
            <Button
              onClick={handleCreate}
              disabled={!selectedDbTemplate || !selectedCategoria || isPendingCreate}
              className="gap-2"
            >
              {isPendingCreate ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  Criar Proposta
                </>
              )}
            </Button>
          )}

          {step === 'pdf-upload' && (
            <Button
              onClick={handleCreate}
              disabled={!selectedPdf || !selectedCategoria || isPendingCreate || isUploadingPdf}
              className="gap-2"
            >
              {isPendingCreate || isUploadingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  Criar Proposta
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
