import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Copy, 
  Download, 
  Check 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Mensagem } from '@/modules/conversas/types';

export interface ChatImagePreviewModalProps {
  images: Mensagem[];
  initialImageId: string;
  onClose: () => void;
}

export function ChatImagePreviewModal({ images, initialImageId, onClose }: ChatImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = images.findIndex((img) => img.id === initialImageId);
    return idx >= 0 ? idx : 0;
  });

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const currentImage = images[currentIndex];
  const isMultiple = images.length > 1;

  // Reseta zoom e rotação ao trocar de imagem
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, images.length]);

  // Histórico para botão "Voltar" do celular e teclado
  const closedRef = useRef(false);

  const handleClose = useCallback(() => {
    if (window.history.state?.chatPreview) {
      closedRef.current = true;
      window.history.back();
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    window.history.pushState({ chatPreview: true }, '');

    const handlePopstate = () => {
      closedRef.current = true;
      onClose();
    };

    window.addEventListener('popstate', handlePopstate);
    return () => {
      window.removeEventListener('popstate', handlePopstate);
      if (!closedRef.current && window.history.state?.chatPreview) {
        window.history.back();
      }
    };
  }, [onClose]);

  useEffect(() => {
    // Esconder o scroll principal
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose, goPrev, goNext]);

  // Copy Image to Clipboard
  const handleCopy = async () => {
    if (!currentImage?.media_url) return;
    try {
      const response = await fetch(currentImage.media_url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setIsCopied(true);
      toast.success('Imagem copiada para a área de transferência', { position: 'top-center' });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Falha ao copiar imagem:', error);
      toast.error('Não foi possível copiar a imagem. Tente usar o botão de download.');
    }
  };

  // Download Image
  const handleDownload = () => {
    if (!currentImage?.media_url) return;
    const a = document.createElement('a');
    a.href = currentImage.media_url;
    a.download = currentImage.media_filename || `imagem-${Date.now()}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Double click para resetar ou max zoom
  const handleDoubleClick = () => {
    setZoom((z) => (z > 1 ? 1 : 2.5));
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z + 0.25, 4));
    } else {
      setZoom((z) => Math.max(z - 0.25, 0.5));
    }
  };

  if (!currentImage) return null;

  const senderName = currentImage.direction === 'outbound' ? 'Você' : (currentImage.quoted_sender || 'Cliente');

  // Formatar a data (padrão simples: hora ou dd/MM se for outro dia)
  const d = new Date(currentImage.timestamp);
  const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isToday = new Date().toDateString() === d.toDateString();
  const dateStr = isToday ? `Hoje às ${timeStr}` : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às ${timeStr}`;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-md select-none"
      >
        {/* Header */}
        <div className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-4 z-50 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col">
              <span className="text-white font-medium text-sm leading-tight drop-shadow-sm">{senderName}</span>
              <span className="text-white/60 text-xs drop-shadow-sm">{dateStr}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {isMultiple && (
              <span className="hidden sm:inline-block text-white/60 text-xs font-medium mr-3 drop-shadow-sm">
                {currentIndex + 1} de {images.length}
              </span>
            )}

            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
              title="Afastar"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
              title="Aproximar"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => r + 90)}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Girar"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
              title="Copiar"
            >
              {isCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Baixar Original"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div 
          className="flex-1 flex items-center justify-center relative overflow-hidden"
          onWheel={handleWheel}
        >
          {/* Seta Esquerda */}
          {isMultiple && currentIndex > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 z-50 p-2 sm:p-3 rounded-full text-white/60 hover:text-white hover:bg-white/10 bg-black/20 backdrop-blur-sm transition-colors hidden sm:block"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Seta Direita */}
          {isMultiple && currentIndex < images.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 z-50 p-2 sm:p-3 rounded-full text-white/60 hover:text-white hover:bg-white/10 bg-black/20 backdrop-blur-sm transition-colors hidden sm:block"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Imagem (Framer Motion drag handling) */}
          <motion.div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center outline-none"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isPanning) handleClose();
            }}
          >
            <motion.img
              key={currentImage.id}
              src={currentImage.media_url!}
              alt={currentImage.media_filename || "Imagem do chat"}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ 
                scale: zoom, 
                opacity: 1, 
                rotate: rotation 
              }}
              transition={{ 
                scale: { type: "spring", bounce: 0, duration: 0.3 },
                opacity: { duration: 0.2 },
                rotate: { type: "spring", bounce: 0, duration: 0.3 }
              }}
              drag={zoom > 1}
              dragConstraints={containerRef}
              dragElastic={0.1}
              onDragStart={() => setIsPanning(true)}
              onDragEnd={() => setTimeout(() => setIsPanning(false), 50)}
              onDoubleClick={handleDoubleClick}
              className={cn(
                "max-w-full max-h-[85vh] object-contain origin-center",
                zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
              )}
              draggable={false}
            />
          </motion.div>
        </div>

        {/* Footer (Caption) */}
        {currentImage.content && !["📷 Imagem"].includes(currentImage.content) && (
          <div className="absolute bottom-6 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
            <div className="max-w-3xl w-full bg-black/60 backdrop-blur-md rounded-2xl px-5 py-4 text-white shadow-2xl pointer-events-auto border border-white/10">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed opacity-95">
                {currentImage.content}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
