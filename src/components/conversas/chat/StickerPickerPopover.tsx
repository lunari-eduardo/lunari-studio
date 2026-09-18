import React, { useState, useMemo, useRef } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConversasStickers } from '@/hooks/useConversasStickers';
import { Sticker, Upload, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface StickerPickerPopoverProps {
  onSendSticker: (url: string) => void;
  children: React.ReactNode;
}

export function StickerPickerPopover({ onSendSticker, children }: StickerPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { stickers, isLoading, saveSticker, deleteSticker } = useConversasStickers();

  const filteredStickers = useMemo(() => {
    if (!searchQuery.trim()) return stickers;
    const q = searchQuery.toLowerCase().trim();
    return stickers.filter(s =>
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [stickers, searchQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('A figurinha deve ter no máximo 1MB.');
      return;
    }

    try {
      await saveSticker.mutateAsync({ file });
    } catch {
      // Error handled by mutation
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStickerClick = (url: string) => {
    onSendSticker(url);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-[320px] h-[390px] p-0 flex flex-col shadow-xl border border-zinc-200"
        sideOffset={10}
      >
        {/* Cabeçalho */}
        <div className="p-3 border-b border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-[#F8F8F8] dark:bg-[#181818]">
          <div className="flex items-center gap-2">
            <Sticker className="w-4 h-4 text-[#C9A87C]" />
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Minhas Figurinhas</span>
            <span className="text-[11px] bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.2 rounded-full font-medium">
              {stickers.length}
            </span>
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 px-2.5 bg-white dark:bg-[#242424] hover:bg-zinc-100 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
              onClick={() => fileInputRef.current?.click()}
              disabled={saveSticker.isPending}
            >
              {saveSticker.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Upload className="w-3 h-3 text-[#C9A87C]" />
              )}
              <span>Upload</span>
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/webp, image/png"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Campo de filtro caso haja várias figurinhas */}
        {stickers.length > 8 && (
          <div className="px-3 pt-2.5 pb-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Filtrar figurinhas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-7 pl-8 text-xs bg-zinc-50 border-zinc-200"
              />
            </div>
          </div>
        )}

        {/* Área de Conteúdo */}
        <ScrollArea className="flex-1 p-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-zinc-400 py-16">
              <Loader2 className="w-6 h-6 animate-spin opacity-50" />
            </div>
          ) : stickers.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#C9A87C]/10 flex items-center justify-center text-[#C9A87C] mb-1">
                <Sticker className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-zinc-700">
                Nenhuma figurinha salva ainda
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed max-w-[220px]">
                Favorite qualquer figurinha recebida no chat clicando no ícone <span className="text-[#C9A87C] font-semibold">⭐</span>, ou clique em <b>Upload</b> acima para adicionar imagens do seu computador.
              </p>
            </div>
          ) : filteredStickers.length === 0 ? (
            <div className="text-center text-xs text-zinc-400 py-12">
              Nenhuma figurinha encontrada para "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {filteredStickers.map(sticker => (
                <div
                  key={sticker.id}
                  className="relative group aspect-square rounded-md border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-[#242424] hover:border-[#C9A87C] hover:shadow-xs transition-all flex items-center justify-center p-1 cursor-pointer"
                  onClick={() => handleStickerClick(sticker.media_url)}
                  title={sticker.title || 'Figurinha'}
                >
                  <img
                    src={sticker.media_url}
                    alt={sticker.title || 'Figurinha'}
                    className="max-w-full max-h-full object-contain pointer-events-none hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSticker.mutate(sticker.id);
                    }}
                    disabled={deleteSticker.isPending}
                    className="absolute top-1 right-1 bg-white/90 shadow-sm border border-zinc-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 text-zinc-400"
                    title="Remover dos favoritos"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
