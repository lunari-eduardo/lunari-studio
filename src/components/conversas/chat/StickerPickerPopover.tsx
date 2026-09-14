import React, { useState, useMemo } from 'react';
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
import { Sticker, Upload, Trash2, Search, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StickerPickerPopoverProps {
  onSendSticker: (url: string) => void;
  children: React.ReactNode;
}

interface CuratedSticker {
  id: string;
  title: string;
  category: 'populares' | 'saudacoes' | 'comercial' | 'emojis' | 'pets';
  tags: string[];
  url: string;
}

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/Tarikul-Islam-Anik/Animated-Fluent-Emojis@master/Emojis';

const CURATED_STICKERS: CuratedSticker[] = [
  // Populares & Saudações
  { id: 'sun', title: 'Bom dia', category: 'saudacoes', tags: ['bom dia', 'dia', 'sol', 'manha', 'ola'], url: `${CDN_BASE}/Travel%20and%20places/Sun.png` },
  { id: 'sunset', title: 'Boa tarde', category: 'saudacoes', tags: ['boa tarde', 'tarde', 'sol', 'fim de tarde'], url: `${CDN_BASE}/Travel%20and%20places/Sunset.png` },
  { id: 'moon', title: 'Boa noite', category: 'saudacoes', tags: ['boa noite', 'noite', 'lua', 'descanso', 'dormir'], url: `${CDN_BASE}/Travel%20and%20places/Crescent%20Moon.png` },
  { id: 'wave', title: 'Olá / Tchau', category: 'saudacoes', tags: ['ola', 'oi', 'tchau', 'bem vindo', 'aceno'], url: `${CDN_BASE}/Hand%20gestures/Waving%20Hand.png` },
  
  // Comercial & Atendimento
  { id: 'thumbs-up', title: 'Aprovado / Joinha', category: 'comercial', tags: ['joinha', 'ok', 'aprovado', 'combinado', 'certo', 'sim', 'thumbs up'], url: `${CDN_BASE}/Hand%20gestures/Thumbs%20Up.png` },
  { id: 'handshake', title: 'Combinado / Fechado', category: 'comercial', tags: ['combinado', 'fechado', 'acordo', 'parceria', 'negocio', 'aperto de mao'], url: `${CDN_BASE}/Hand%20gestures/Handshake.png` },
  { id: 'check', title: 'Tudo Certo / Concluído', category: 'comercial', tags: ['check', 'certo', 'concluido', 'pronto', 'aprovado', 'ok', 'sucesso'], url: `${CDN_BASE}/Symbols/Check%20Mark%20Button.png` },
  { id: 'writing', title: 'Contrato / Anotado', category: 'comercial', tags: ['contrato', 'assinatura', 'anotado', 'escrevendo', 'proposta'], url: `${CDN_BASE}/Hand%20gestures/Writing%20Hand.png` },
  { id: 'camera', title: 'Fotos Prontas / Ensaio', category: 'comercial', tags: ['camera', 'foto', 'ensaio', 'fotografia', 'fotos', 'galeria'], url: `${CDN_BASE}/Objects/Camera.png` },
  { id: 'money', title: 'Orçamento / Pagamento', category: 'comercial', tags: ['dinheiro', 'orcamento', 'pagamento', 'valor', 'pix', 'financeiro'], url: `${CDN_BASE}/Objects/Money%20Bag.png` },
  { id: 'hourglass', title: 'Em breve / Aguardando', category: 'comercial', tags: ['tempo', 'aguardando', 'em breve', 'espera', 'processando'], url: `${CDN_BASE}/Objects/Hourglass%20Done.png` },
  { id: 'gem', title: 'Qualidade Premium', category: 'comercial', tags: ['diamante', 'joia', 'precioso', 'qualidade', 'premium', 'lindo'], url: `${CDN_BASE}/Objects/Gem%20Stone.png` },

  // Emojis & Reações
  { id: 'heart-hands', title: 'Gratidão / Obrigado', category: 'emojis', tags: ['coracao', 'obrigado', 'gratidao', 'amor', 'carinho', 'agradecido'], url: `${CDN_BASE}/Hand%20gestures/Heart%20Hands.png` },
  { id: 'red-heart', title: 'Coração', category: 'emojis', tags: ['coracao', 'amor', 'love', 'adorou', 'lindo'], url: `${CDN_BASE}/Smilies/Red%20Heart.png` },
  { id: 'clap', title: 'Parabéns / Palmas', category: 'emojis', tags: ['palmas', 'parabens', 'sucesso', 'bravo', 'aplausos'], url: `${CDN_BASE}/Hand%20gestures/Clapping%20Hands.png` },
  { id: 'party', title: 'Celebração', category: 'emojis', tags: ['festa', 'parabens', 'comemorar', 'aniversario', 'sucesso', 'festejar'], url: `${CDN_BASE}/Activities/Party%20Popper.png` },
  { id: 'fire', title: 'Sensacional / Fogo', category: 'emojis', tags: ['fogo', 'arrasou', 'top', 'demais', 'incrivel', 'maravilhoso'], url: `${CDN_BASE}/Travel%20and%20places/Fire.png` },
  { id: 'rocket', title: 'Foguete / Rápido', category: 'emojis', tags: ['foguete', 'crescimento', 'rapido', 'voar', 'sucesso', 'lancamento'], url: `${CDN_BASE}/Travel%20and%20places/Rocket.png` },
  { id: 'sparkles', title: 'Brilho / Especial', category: 'emojis', tags: ['brilho', 'magia', 'lindo', 'perfeito', 'especial', 'fotos'], url: `${CDN_BASE}/Activities/Sparkles.png` },
  { id: 'victory', title: 'Vitória / Paz', category: 'emojis', tags: ['paz', 'vitoria', 'sucesso', 'dois', 'tranquilo'], url: `${CDN_BASE}/Hand%20gestures/Victory%20Hand.png` },
  { id: 'heart-eyes', title: 'Apaixonado / Amei', category: 'emojis', tags: ['apaixonado', 'amei', 'lindo', 'perfeito', 'maravilhoso', 'encantada'], url: `${CDN_BASE}/Smilies/Smiling%20Face%20with%20Heart-Eyes.png` },
  { id: 'laugh', title: 'Risos / Engraçado', category: 'emojis', tags: ['rindo', 'engracado', 'kkk', 'haha', 'meme', 'risada', 'alegria'], url: `${CDN_BASE}/Smilies/Face%20with%20Tears%20of%20Joy.png` },
  { id: 'grin', title: 'Sorriso', category: 'emojis', tags: ['sorriso', 'feliz', 'alegria', 'sorrindo', 'contente'], url: `${CDN_BASE}/Smilies/Grinning%20Face%20with%20Big%20Eyes.png` },
  { id: 'star-struck', title: 'Uau / Impressionado', category: 'emojis', tags: ['estrela', 'chocado', 'maravilhado', 'uau', 'show'], url: `${CDN_BASE}/Smilies/Star-Struck.png` },
  { id: 'thinking', title: 'Pensando / Dúvida', category: 'emojis', tags: ['pensando', 'duvida', 'pergunta', 'vamos ver', 'analisando'], url: `${CDN_BASE}/Smilies/Thinking%20Face.png` },

  // Pets
  { id: 'cat', title: 'Gatinho', category: 'pets', tags: ['gato', 'cat', 'gatinho', 'fofo', 'animal', 'pet'], url: `${CDN_BASE}/Animals/Cat%20Face.png` },
  { id: 'dog', title: 'Cachorrinho', category: 'pets', tags: ['cachorro', 'dog', 'pet', 'fofo', 'animal', 'filhote'], url: `${CDN_BASE}/Animals/Dog%20Face.png` },
];

const CATEGORY_FILTERS = [
  { id: 'all', label: '🔥 Todas' },
  { id: 'saudacoes', label: '👋 Saudações' },
  { id: 'comercial', label: '💼 Atendimento' },
  { id: 'emojis', label: '✨ Emojis 3D' },
  { id: 'pets', label: '🐾 Pets' },
];

export function StickerPickerPopover({ onSendSticker, children }: StickerPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [giphyResults, setGiphyResults] = useState<any[]>([]);
  const [isSearchingGiphy, setIsSearchingGiphy] = useState(false);
  const [giphyError, setGiphyError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { stickers, isLoading, saveSticker, deleteSticker, proxySticker } = useConversasStickers();

  // Filtragem local instantânea sem necessidade de API externa
  const filteredCurated = useMemo(() => {
    let list = CURATED_STICKERS;

    if (selectedCategory !== 'all') {
      list = list.filter(s => s.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [searchQuery, selectedCategory]);

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

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Se houver chave Giphy configurada no .env, busca online
    const apiKey = import.meta.env.VITE_GIPHY_API_KEY;
    if (apiKey) {
      setIsSearchingGiphy(true);
      setGiphyError(null);
      try {
        const res = await fetch(
          `https://api.giphy.com/v1/stickers/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=24`
        );
        if (!res.ok) {
          throw new Error('Chave GIPHY inválida ou não autorizada');
        }
        const data = await res.json();
        setGiphyResults(data.data || []);
      } catch (err: any) {
        setGiphyError(err.message || 'Falha na busca online');
      } finally {
        setIsSearchingGiphy(false);
      }
    }
  };

  const handleSendOnlineSticker = async (stickerUrl: string) => {
    try {
      setOpen(false);
      // 1. Passa pelo proxy para salvar no Cloudflare R2 oficial da Lunari
      const proxyUrl = await proxySticker.mutateAsync(stickerUrl);
      // 2. Envia para o WhatsApp com a URL oficial da Lunari
      onSendSticker(proxyUrl);
    } catch {
      toast.error('Erro ao enviar a figurinha animada.');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-[340px] h-[430px] p-0 flex flex-col shadow-xl" sideOffset={10}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="w-full rounded-none border-b grid grid-cols-2 bg-transparent h-12">
            <TabsTrigger value="favorites" className="data-[state=active]:bg-muted/50 rounded-none h-full gap-2 text-xs font-medium">
              <Sticker className="w-4 h-4 text-[#C9A87C]" /> Minhas Figurinhas
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-muted/50 rounded-none h-full gap-2 text-xs font-medium">
              <Sparkles className="w-4 h-4 text-[#C9A87C]" /> Galeria & Busca
            </TabsTrigger>
          </TabsList>

          {/* Aba Minhas Figurinhas */}
          <TabsContent value="favorites" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden flex flex-col">
            <div className="p-3 border-b flex justify-between items-center bg-muted/20">
              <span className="text-xs font-medium text-muted-foreground">
                Salvas ({stickers.length})
              </span>
              <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5 px-2.5" onClick={() => fileInputRef.current?.click()}>
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
                <div className="flex items-center justify-center h-full text-muted-foreground py-12">
                  <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                </div>
              ) : stickers.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-12 px-4 leading-relaxed">
                  Nenhuma figurinha salva ainda.<br />
                  Clique na estrela ⭐ de qualquer figurinha no chat para salvá-la aqui!
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {stickers.map(sticker => (
                    <div key={sticker.id} className="relative group aspect-square rounded-md border bg-muted/10 flex items-center justify-center p-1">
                      <img 
                        src={sticker.media_url} 
                        alt={sticker.title || 'Sticker'} 
                        className="max-w-full max-h-full object-contain cursor-pointer hover:scale-110 transition-transform"
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
                        className="absolute top-1 right-1 bg-background/90 shadow-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                        title="Remover"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Aba Galeria e Busca */}
          <TabsContent value="search" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden flex flex-col">
            <div className="p-2.5 border-b space-y-2 bg-muted/10">
              <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar figurinhas (ex: bom dia, ok, palmas)..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </form>

              {/* Categorias Rápidas */}
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                {CATEGORY_FILTERS.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSearchQuery('');
                    }}
                    className={`text-[11px] whitespace-nowrap px-2 py-0.5 rounded-full font-medium transition-colors ${
                      selectedCategory === cat.id && !searchQuery
                        ? 'bg-[#C9A87C] text-white'
                        : 'bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="flex-1 p-2.5">
              {/* Resultados GIPHY (se houver chave configurada e busca ativa) */}
              {isSearchingGiphy && (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}

              {giphyError && (
                <div className="flex items-center gap-2 p-2 mb-2 rounded bg-amber-50 text-amber-800 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{giphyError}. Exibindo acervo interno:</span>
                </div>
              )}

              {giphyResults.length > 0 ? (
                <div className="space-y-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    GIPHY Online
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {giphyResults.map((gif) => (
                      <div 
                        key={gif.id} 
                        className="aspect-square rounded-md overflow-hidden bg-background border hover:border-[#C9A87C] cursor-pointer hover:scale-105 transition-all flex items-center justify-center p-1 shadow-2xs"
                        onClick={() => handleSendOnlineSticker(gif.images?.fixed_width?.url || gif.images?.original?.url)}
                      >
                        <img 
                          src={gif.images?.fixed_width?.url || gif.images?.original?.url} 
                          alt={gif.title}
                          className="max-w-full max-h-full object-contain pointer-events-none" 
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Acervo Curado de Figurinhas */}
              <div className="space-y-1.5 mt-1">
                {giphyResults.length > 0 && (
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block pt-2">
                    Acervo Lunari
                  </span>
                )}
                {filteredCurated.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-10">
                    Nenhuma figurinha encontrada para "{searchQuery}".
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {filteredCurated.map((sticker) => (
                      <div 
                        key={sticker.id} 
                        className="aspect-square rounded-md overflow-hidden bg-background border hover:border-[#C9A87C] cursor-pointer hover:scale-105 transition-all flex flex-col items-center justify-center p-1 shadow-2xs group relative"
                        onClick={() => handleSendOnlineSticker(sticker.url)}
                        title={sticker.title}
                      >
                        <img 
                          src={sticker.url} 
                          alt={sticker.title}
                          className="w-12 h-12 object-contain pointer-events-none drop-shadow-2xs" 
                          loading="lazy"
                        />
                        <span className="text-[9px] text-zinc-500 truncate w-full text-center mt-0.5">
                          {sticker.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
