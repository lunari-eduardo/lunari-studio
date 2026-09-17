import { useState, useRef } from 'react';
import { useR2Upload } from '@/hooks/useR2Upload';
import { Button } from '@/components/ui/button';
import { Trash2, UploadCloud, FileVideo, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface CoverVideoUploaderProps {
  galleryId: string;
  contextType: 'gallery-cover-video' | 'gallery-cover-poster';
  value: { key?: string; url?: string } | null;
  onChange: (data: { key: string; url?: string; durationSec?: number; sizeBytes?: number; width?: number; height?: number; uploadedAt?: string } | null) => void;
  accept: string;
  maxSizeMB: number;
  label: string;
  description?: string;
  className?: string;
}

export function CoverVideoUploader({ galleryId, contextType, value, onChange, accept, maxSizeMB, label, description, className }: CoverVideoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile, uploading } = useR2Upload({
    context: contextType,
    entityId: galleryId,
  });

  const validateVideo = (file: File): Promise<{ duration: number; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight
        });
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Falha ao ler metadados do vídeo"));
      };
      video.src = url;
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`O arquivo excede o limite de ${maxSizeMB}MB.`);
      return;
    }

    let meta = { duration: 0, width: 0, height: 0 };
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    if (isVideo) {
      try {
        meta = await validateVideo(file);
        if (meta.duration > 20) {
          toast.error('O vídeo deve ter no máximo 20 segundos.');
          return;
        }
      } catch (err) {
        toast.error('Vídeo inválido ou formato não suportado.');
        return;
      }
    }

    const result = await uploadFile(file);
    if (result) {
      onChange({
        key: result.storagePath,
        url: result.url,
        durationSec: meta.duration,
        width: meta.width,
        height: meta.height,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const cdnBase = import.meta.env.VITE_R2_PUBLIC_URL || 'https://media.lunarihub.com';
  const displayUrl = value?.url || (value?.key ? `${cdnBase}/${value.key}` : null);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-end">
        <div>
          <h4 className="text-sm font-medium">{label}</h4>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>

      {!value?.key && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors text-center cursor-pointer",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/50",
            uploading ? "opacity-50 pointer-events-none" : ""
          )}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
              <UploadCloud className="h-8 w-8 text-muted-foreground animate-pulse" />
              <p className="text-sm">Enviando arquivo...</p>
              <Progress value={undefined} className="h-1 w-full mt-2" />
            </div>
          ) : (
            <>
              {contextType === 'gallery-cover-video' ? (
                <FileVideo className="h-8 w-8 text-muted-foreground mb-2" />
              ) : (
                <FileImage className="h-8 w-8 text-muted-foreground mb-2" />
              )}
              <p className="text-sm font-medium">Clique ou arraste um arquivo</p>
              <p className="text-xs text-muted-foreground mt-1">Máx. {maxSizeMB}MB</p>
            </>
          )}
        </div>
      )}

      {value?.key && displayUrl && (
        <div className="relative border rounded-lg overflow-hidden bg-muted flex items-center justify-center min-h-[120px]">
          {contextType === 'gallery-cover-video' ? (
            <video src={displayUrl} className="w-full h-full object-cover max-h-[200px]" autoPlay muted loop />
          ) : (
            <img src={displayUrl} alt="Cover Poster" className="w-full h-full object-cover max-h-[200px]" />
          )}
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
            onClick={() => onChange(null)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
