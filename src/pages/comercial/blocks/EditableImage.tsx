import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Camera, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { uploadProposalImage, uploadMultipleProposalImages } from './uploadImage';

interface EditableImageProps {
  value: string | null | undefined;
  onCommit: (url: string) => void;
  editable?: boolean;
  alt?: string;
  /** Rótulo exibido no estado vazio ("Foto A", "Capa"...) */
  label?: string;
  className?: string;
  imgClassName?: string;
  style?: React.CSSProperties;
  /** Classes do wrapper quando vazio no modo público (ex.: cor neutra) */
  publicEmptyClassName?: string;
  /** Modo "preencher" (padrão) ou fluxo natural (masonry usa h-auto) */
  fill?: boolean;
  /** Foto de fundo com texto por cima (capas): a ação vazia vai para o canto, acima do texto */
  actionCorner?: boolean;
}

// ============================================================
// IMAGEM EDITÁVEL NA ARTE
// No editor: botão visível ("Enviar foto" / "Trocar foto", 1 clique)
// ou duplo clique na imagem abrem o seletor, fazem o upload otimizado
// e comitam a URL pelo mesmo caminho da edição de texto (inline.set).
// Cores neutras próprias: legível sobre qualquer fundo/tema da proposta.
// No público: renderiza a imagem (ou o placeholder neutro dado).
// ============================================================

export function EditableImage({
  value,
  onCommit,
  editable = false,
  alt = 'Imagem',
  label,
  className,
  imgClassName,
  style,
  publicEmptyClassName,
  fill = true,
  actionCorner = false,
}: EditableImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pick = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadProposalImage(file);
      onCommit(url);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar imagem. Verifique a conexão e tente novamente.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const imgSrc = value || null;

  // Ação explícita de 1 clique (o duplo clique na imagem continua valendo)
  const pickButton = (text: string) => (
    <button
      type="button"
      onClick={pick}
      onDoubleClick={(e) => e.stopPropagation()}
      disabled={isUploading}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 bg-white/95 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-neutral-800 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-transform hover:scale-[1.04] disabled:opacity-80"
    >
      {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
      {isUploading ? 'Enviando…' : text}
    </button>
  );

  if (!editable) {
    if (imgSrc) {
      return (
        <img
          src={imgSrc}
          alt={alt}
          className={cn(className, imgClassName ?? 'w-full h-full object-cover')}
          style={style}
        />
      );
    }
    if (publicEmptyClassName) {
      return <div className={cn(className, publicEmptyClassName)} style={style} />;
    }
    return null;
  }

  return (
    <div
      // relative por padrão: o selo "Trocar foto" precisa de um ancestral posicionado (absolute do chamador vence)
      className={cn('group/img relative', className)}
      style={style}
      onDoubleClick={pick}
      title={imgSrc ? 'Trocar foto (ou duplo clique na imagem)' : 'Enviar foto'}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={alt}
          className={cn(fill ? 'absolute inset-0 w-full h-full' : 'w-full', imgClassName ?? (fill ? 'object-cover' : 'h-auto'))}
          draggable={false}
        />
      ) : (
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-neutral-400/70 bg-neutral-500/[0.08] transition-colors group-hover/img:border-neutral-500 group-hover/img:bg-neutral-500/[0.14]',
            fill ? '' : 'relative py-10'
          )}
        >
          {actionCorner ? (
            // Canto inferior: o topo direito da seção é da barra de ações do canvas
            <div className="absolute right-3 bottom-3 z-20">{pickButton(label ? `Enviar foto · ${label}` : 'Enviar foto')}</div>
          ) : (
            <>
              {label && (
                <span className="px-3 text-center text-[10px] font-medium uppercase tracking-widest text-neutral-500">{label}</span>
              )}
              {pickButton('Enviar foto')}
            </>
          )}
        </div>
      )}

      {imgSrc && (
        <>
          {/* Leve escurecimento no hover sinaliza que a foto é editável */}
          <div className="absolute inset-0 z-10 bg-black/20 opacity-0 transition-opacity pointer-events-none group-hover/img:opacity-100" />
          {/* Sempre visível no editor: o fotógrafo vê de imediato que pode trocar a foto */}
          <div className="absolute right-2 bottom-2 z-20">{pickButton('Trocar foto')}</div>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
        disabled={isUploading}
      />
    </div>
  );
}

// ============================================================
// TILE "ADICIONAR FOTO" — exibido ao fim da galeria no editor
// ============================================================
export function AddImageTile({ 
  onAdd, 
  onAddMultiple,
  label = 'Adicionar foto' 
}: { 
  onAdd: (url: string) => void; 
  onAddMultiple?: (urls: string[]) => void;
  label?: string; 
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    try {
      if (files.length > 1 && onAddMultiple) {
        const urls = await uploadMultipleProposalImages(files);
        onAddMultiple(urls);
      } else {
        const url = await uploadProposalImage(files[0]);
        onAdd(url);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar imagem. Verifique a conexão e tente novamente.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      onDoubleClick={(e) => e.stopPropagation()}
      className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-current opacity-40 transition-opacity hover:opacity-80"
      title={label}
    >
      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
      <span className="text-[10px] font-medium tracking-widest uppercase">{isUploading ? 'Enviando…' : label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        multiple
        onChange={handleUpload}
        disabled={isUploading}
      />
    </button>
  );
}
