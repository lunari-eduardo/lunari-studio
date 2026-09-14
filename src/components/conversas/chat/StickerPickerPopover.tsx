import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [giphyResults, setGiphyResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { stickers, isLoading, saveSticker, deleteSticker, proxySticker } = useConversasStickers();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error('A figurinha deve ter no máximo 1MB.');
      return;
    }

    try {
      await saveSticker.mutateAsync({ file });
    } catch (err) {
      // Error handled by mutation
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGiphySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Note: You should ideally provide a real API key in env. 
      // Using a public test key for demonstration (rate limits apply).
      const apiKey = 'GlVGYHqc3SyRoGwO5IGWrYn1r502pXzS'; // GIPHY public beta key
      const res = await fetch(`https://api.giphy.com/v1/stickers/search?api_key=${apiKey}&q=${encodeURIComponent(searchQuery)}&limit=24`);
      if (!res.ok) throw new Error('Falha ao buscar figurinhas');
      const data = await res.json();
      setGiphyResults(data.data || []);
    } catch (err) {
      toast.error('Não foi possível buscar as figurinhas.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendGiphySticker = async (giphyUrl: string) => {
    try {
      const toastId = toast.loading('Processando figurinha...');
      // 1. Passa pelo proxy para salvar no R2
      const proxyUrl = await proxySticker.mutateAsync(giphyUrl);
      // 2. Envia para o WhatsApp com a URL oficial do Lunari
      onSendSticker(proxyUrl);
      toast.success('Figurinha enviada!', { id: toastId });
      setOpen(false);
    } catch (err) {
      toast.dismiss();
      toast.error('Erro ao enviar a figurinha animada.');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-[320px] h-[400px] p-0 flex flex-col shadow-xl" sideOffset={10}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="w-full rounded-none border-b grid grid-cols-2 bg-transparent h-12">
            <TabsTrigger value="favorites" className="data-[state=active]:bg-muted/50 rounded-none h-full gap-2">
              <Sticker className="w-4 h-4" /> Favoritas
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-muted/50 rounded-none h-full gap-2">
              <Search className="w-4 h-4" /> Buscar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden flex flex-col">
            <div className="p-3 border-b flex justify-between items-center bg-muted/20">
              <span className="text-sm font-medium text-muted-foreground">Minhas Figurinhas</span>
              <Button size="sm" variant="secondary" className="h-8 gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" />
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
            <ScrollArea className="flex-1 p-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground py-8">
                  <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                </div>
              ) : stickers.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-10 px-4">
                  Nenhuma figurinha salva ainda. Faça upload ou favorite uma recebida no chat!
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {stickers.map(sticker => (
                    <div key={sticker.id} className="relative group aspect-square rounded-md border bg-muted/10 flex items-center justify-center">
                      <img 
                        src={sticker.media_url} 
                        alt={sticker.title || 'Sticker'} 
                        className="max-w-full max-h-full object-contain p-1 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                          onSendSticker(sticker.media_url);
                          setOpen(false);
                        }}
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSticker.mutate(sticker.id);
                        }}
                        disabled={deleteSticker.isPending}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden flex flex-col">
            <form onSubmit={handleGiphySearch} className="p-3 border-b flex gap-2">
              <Input 
                placeholder="Buscar figurinhas..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9"
              />
              <Button type="submit" size="sm" className="h-9 w-9 p-0" disabled={isSearching || !searchQuery.trim()}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </form>
            <ScrollArea className="flex-1 p-3 bg-muted/10">
              {giphyResults.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-10 px-4">
                  Busque por temas como "bom dia", "obrigado", "gato", etc.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {giphyResults.map((gif) => (
                    <div 
                      key={gif.id} 
                      className="aspect-square rounded-md overflow-hidden bg-background cursor-pointer hover:ring-2 hover:ring-primary transition-all flex items-center justify-center p-1"
                      onClick={() => handleSendGiphySticker(gif.images.fixed_width.url)}
                    >
                      <img 
                        src={gif.images.fixed_width.url} 
                        alt={gif.title}
                        className="max-w-full max-h-full object-contain pointer-events-none" 
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
