import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useR2Upload } from '@/hooks/useR2Upload';
import { AgendaCoverImage } from './AgendaCoverImage';
import { generateLqip, gridToObjectPosition, objectPositionToGrid } from './cover-utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AgendaCoverUploaderProps {
  linkId?: string;
  currentUrl?: string | null;
  currentPosition?: string | null;
  currentLqip?: string | null;
  onChange: (data: { url: string; position: string; lqip: string }) => void;
  onRemove: () => void;
}

export function AgendaCoverUploader({
  linkId,
  currentUrl,
  currentPosition,
  currentLqip,
  onChange,
  onRemove,
}: AgendaCoverUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [previewPosition, setPreviewPosition] = useState<string>(currentPosition || '50% 50%');
  const [gridCell, setGridCell] = useState<number>(() => objectPositionToGrid(currentPosition));

  const { uploadFile } = useR2Upload({ context: 'agenda-cover', entityId: linkId });

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem (JPEG, PNG ou WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setUploading(true);
    try {
      const lqip = await generateLqip(file).catch(() => '');
      const result = await uploadFile(file);
      if (!result) throw new Error('Falha no upload');

      setPreviewUrl(result.url);
      onChange({ url: result.url, position: previewPosition, lqip });
      toast.success('Capa enviada com sucesso!');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleGridClick = (cell: number) => {
    setGridCell(cell);
    const newPosition = gridToObjectPosition(cell);
    setPreviewPosition(newPosition);
    if (previewUrl) {
      onChange({ url: previewUrl, position: newPosition, lqip: currentLqip || '' });
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setPreviewPosition('50% 50%');
    setGridCell(4);
    onRemove();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Imagem de Capa</Label>
          <p className="text-[11px] text-muted-foreground">
            Proporção recomendada 4:5 (ex: 1600×2000px). Até 10MB.
          </p>
        </div>
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
            className="text-destructive hover:text-destructive h-8"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Remover
          </Button>
        )}
      </div>

      {/* Preview / Upload area */}
      {previewUrl ? (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-border/60 bg-neutral-100 max-w-[280px]">
            <AgendaCoverImage
              src={previewUrl}
              position={previewPosition}
              lqip={currentLqip}
              alt="Preview da capa"
              priority
            />
          </div>

          {/* Focal point picker — grid 3x3 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-normal">
              Enquadramento — clique no ponto focal da imagem
            </Label>
            <div className="grid grid-cols-3 gap-1.5 w-[180px] p-1.5 rounded-lg border border-border/60 bg-muted/30">
              {Array.from({ length: 9 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleGridClick(i)}
                  className={cn(
                    'aspect-square rounded-md border-2 transition-all',
                    gridCell === i
                      ? 'border-primary bg-primary/20'
                      : 'border-transparent bg-white/60 hover:bg-white'
                  )}
                  aria-label={`Posição ${i + 1} de 9`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full max-w-[280px] aspect-[4/5] rounded-xl border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
        >
          {uploading ? (
            <>
              <Loader2 className="w-7 h-7 animate-spin" />
              <span className="text-xs">Enviando…</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Adicionar imagem</span>
              <span className="text-[10px] text-muted-foreground">
                JPEG, PNG ou WebP • até 10MB
              </span>
            </>
          )}
        </button>
      )}

      {previewUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-8"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Substituir imagem
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
