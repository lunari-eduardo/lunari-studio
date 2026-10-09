import React from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Categoria } from '../../types';

interface StepPdfUploadProps {
  onBack: () => void;
  selectedPdf: File | null;
  setSelectedPdf: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  categorias: Categoria[];
  isLoadingCategorias: boolean;
  selectedCategoria: Categoria | null;
  setSelectedCategoria: (cat: Categoria | null) => void;
  customTitle: string;
  setCustomTitle: (title: string) => void;
  onSubmit: () => void;
}

export function StepPdfUpload({
  onBack,
  selectedPdf,
  setSelectedPdf,
  fileInputRef,
  categorias,
  isLoadingCategorias,
  selectedCategoria,
  setSelectedCategoria,
  customTitle,
  setCustomTitle,
  onSubmit,
}: StepPdfUploadProps) {
  return (
    <div className="py-4 space-y-6 animate-in slide-in-from-right-4 fade-in duration-200">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <button
          type="button"
          onClick={onBack}
          className="hover:text-foreground transition-colors underline underline-offset-2"
        >
          ← Voltar
        </button>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">1. Faça o Upload do PDF</label>
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl bg-card">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <UploadCloud className="h-6 w-6 text-red-600" />
          </div>

          {selectedPdf ? (
            <div className="text-center">
              <p className="font-medium text-sm">{selectedPdf.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(selectedPdf.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSelectedPdf(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Trocar arquivo
              </Button>
            </div>
          ) : (
            <>
              <h3 className="font-medium text-sm mb-1">Selecione o arquivo PDF</h3>
              <p className="text-xs text-muted-foreground text-center max-w-[250px] mb-4">
                Tamanho máximo: 50MB. O arquivo será otimizado para carregamento rápido.
              </p>
              <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
                Procurar Arquivo
              </Button>
            </>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                if (file.size > 50 * 1024 * 1024) {
                  toast.error('O arquivo é muito grande. O limite é 50MB.');
                  return;
                }
                setSelectedPdf(file);
              }
            }}
          />
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border">
        <label className="text-sm font-medium text-foreground">2. Selecione a Categoria</label>
        {isLoadingCategorias ? (
          <Skeleton className="h-11 w-full rounded-md" />
        ) : categorias.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Tag className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Você ainda não cadastrou categorias.</p>
          </div>
        ) : (
          <Select
            value={selectedCategoria?.id || ''}
            onValueChange={(val) => setSelectedCategoria(categorias.find((c) => c.id === val) || null)}
          >
            <SelectTrigger className="h-11 w-full bg-card">
              <SelectValue placeholder="Escolha uma categoria..." />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.cor || '#6b7280' }} />
                    <span>{cat.nome}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedCategoria && (
        <div className="space-y-2 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
          <label className="text-sm font-medium text-foreground">
            Nome personalizado <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <Input
            placeholder={`Ex: Proposta ${selectedCategoria.nome} — Maria Fernanda`}
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="h-11"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedPdf) onSubmit();
            }}
          />
          <p className="text-xs text-muted-foreground">
            Se não informado, o título será <strong>"{selectedCategoria.nome}"</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
