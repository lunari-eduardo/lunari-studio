import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, Trash2, Loader2, UploadCloud, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { gestaoR2Upload } from '@/lib/gestaoR2Upload';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CoverUploadProps {
  coverUrl?: string | null;
  onChange: (url: string | null) => void;
  formularioId?: string;
  disabled?: boolean;
}

export function CoverUpload({
  coverUrl,
  onChange,
  formularioId,
  disabled = false,
}: CoverUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleFileDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0 || disabled) return;
      const file = acceptedFiles[0];

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'A imagem de capa deve ter no máximo 10MB.',
          variant: 'destructive',
        });
        return;
      }

      setIsUploading(true);
      try {
        const res = await gestaoR2Upload({
          file,
          context: 'form',
          entityId: formularioId,
        });

        if (res.url) {
          onChange(res.url);
          toast({ title: 'Capa atualizada com sucesso!' });
        } else {
          throw new Error('URL da imagem não retornada.');
        }
      } catch (err: any) {
        console.error('Erro no upload da capa:', err);
        toast({
          title: 'Erro ao enviar imagem',
          description: err.message || 'Tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [disabled, formularioId, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    multiple: false,
    disabled: disabled || isUploading,
  });

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
    setPopoverOpen(false);
    toast({ title: 'Capa atualizada!' });
  };

  const handleRemove = () => {
    onChange(null);
    toast({ title: 'Capa removida.' });
  };

  if (coverUrl) {
    return (
      <div className="space-y-2">
        <div className="relative group overflow-hidden rounded-xl border border-border/60 bg-muted/20 aspect-[21/9] sm:aspect-[24/9]">
          <img
            src={coverUrl}
            alt="Capa do formulário"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
            <div {...getRootProps()} className="cursor-pointer">
              <input {...getInputProps()} />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 shadow-sm text-xs bg-background/90 hover:bg-background"
                disabled={isUploading || disabled}
              >
                {isUploading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <UploadCloud size={13} />
                )}
                Alterar imagem
              </Button>
            </div>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="gap-1.5 shadow-sm text-xs"
            >
              <Trash2 size={13} />
              Remover
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Passe o mouse sobre a imagem para alterar ou remover a capa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          'flex flex-col items-center justify-center gap-2 min-h-[160px]',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30',
          (disabled || isUploading) && 'pointer-events-none opacity-60',
        )}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Enviando imagem de capa...</p>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-1">
              <ImagePlus size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isDragActive
                  ? 'Solte a imagem aqui...'
                  : 'Adicionar imagem de capa'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Arraste ou clique para selecionar (JPG, PNG ou WEBP até 10MB)
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          Recomendado: formato paisagem (16:9 ou 21:9)
        </span>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
            >
              <LinkIcon size={12} />
              Inserir link direto
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Link da imagem</p>
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://exemplo.com/minha-foto.jpg"
              className="text-xs h-8"
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPopoverOpen(false)}
                className="text-xs h-7"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="text-xs h-7 bg-foreground text-background"
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
