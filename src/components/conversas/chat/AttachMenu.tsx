/**
 * Dropdown de anexos do composer.
 *
 * Cada item aciona um input file oculto e propaga o arquivo selecionado via callback.
 */

import { useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Image as ImageIcon, Paperclip, UserPlus, Video, Sticker, AudioLines } from 'lucide-react';

export interface AttachMenuProps {
  onAttach: (file: File, kind: 'image' | 'video' | 'document' | 'contact' | 'sticker') => void;
  onOpenAudiosSalvos?: () => void;
}

export function AttachMenu({ onAttach, onOpenAudiosSalvos }: AttachMenuProps) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const stickerRef = useRef<HTMLInputElement>(null);

  const handleFile = (
    ref: React.RefObject<HTMLInputElement>,
    kind: 'image' | 'video' | 'document' | 'sticker',
  ) => {
    ref.current?.click();
    ref.current?.addEventListener(
      'change',
      () => {
        const file = ref.current?.files?.[0];
        if (file) onAttach(file, kind);
        if (ref.current) ref.current.value = '';
      },
      { once: true },
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Anexar"
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 transition-colors text-zinc-600 dark:text-zinc-400"
          >
            <Paperclip className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={6}
          className="dark:bg-[#1A1A1A] dark:border-[rgba(255,255,255,0.08)]"
        >
          <DropdownMenuItem
            onSelect={() => handleFile(imageRef, 'image')}
            className="gap-2.5 cursor-pointer dark:hover:bg-white/[0.07]"
          >
            <ImageIcon className="h-4 w-4 text-[#C9A87C] shrink-0" />
            <div>
              <div className="text-xs font-medium dark:text-zinc-200">Imagem</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-500">da galeria</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => handleFile(videoRef, 'video')}
            className="gap-2.5 cursor-pointer dark:hover:bg-white/[0.07]"
          >
            <Video className="h-4 w-4 text-[#C9A87C] shrink-0" />
            <div>
              <div className="text-xs font-medium dark:text-zinc-200">Vídeo</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-500">da galeria</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => handleFile(stickerRef, 'sticker')}
            className="gap-2.5 cursor-pointer dark:hover:bg-white/[0.07]"
          >
            <Sticker className="h-4 w-4 text-[#C9A87C] shrink-0" />
            <div>
              <div className="text-xs font-medium dark:text-zinc-200">Figurinha</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-500">WEBP ou PNG</div>
            </div>
          </DropdownMenuItem>

          {onOpenAudiosSalvos && (
            <DropdownMenuItem
              onSelect={onOpenAudiosSalvos}
              className="gap-2.5 cursor-pointer dark:hover:bg-white/[0.07]"
            >
              <AudioLines className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <div>
                <div className="text-xs font-medium dark:text-zinc-200">Áudios salvos</div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-500">minha biblioteca</div>
              </div>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="dark:bg-[rgba(255,255,255,0.06)]" />

          <DropdownMenuItem
            onSelect={() => handleFile(docRef, 'document')}
            className="gap-2.5 cursor-pointer dark:hover:bg-white/[0.07]"
          >
            <FileText className="h-4 w-4 text-[#C9A87C] shrink-0" />
            <div>
              <div className="text-xs font-medium dark:text-zinc-200">Documento</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-500">PDF, Word, planilha...</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => onAttach(new File([], ''), 'contact')}
            disabled
            className="gap-2.5 cursor-not-allowed opacity-50"
          >
            <UserPlus className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
            <div>
              <div className="text-xs font-medium dark:text-zinc-400 dark:text-zinc-500">Contato</div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500">em breve</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input ref={imageRef} type="file" accept="image/*" hidden />
      <input ref={videoRef} type="file" accept="video/*" hidden />
      <input ref={stickerRef} type="file" accept="image/webp,image/png,.webp" hidden />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" hidden />
    </>
  );
}
