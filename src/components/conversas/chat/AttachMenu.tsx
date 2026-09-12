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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Image as ImageIcon, Paperclip, UserPlus, Video } from 'lucide-react';

export interface AttachMenuProps {
  onAttach: (file: File, kind: 'image' | 'video' | 'document' | 'contact') => void;
}

export function AttachMenu({ onAttach }: AttachMenuProps) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const handleFile = (
    ref: React.RefObject<HTMLInputElement>,
    kind: 'image' | 'video' | 'document',
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
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-200 active:bg-zinc-300 transition-colors text-zinc-600"
          >
            <Paperclip className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="mb-2">
          <DropdownMenuItem onSelect={() => handleFile(imageRef, 'image')}>
            <ImageIcon className="h-4 w-4 mr-2" /> Foto
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleFile(videoRef, 'video')}>
            <Video className="h-4 w-4 mr-2" /> Vídeo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleFile(docRef, 'document')}>
            <FileText className="h-4 w-4 mr-2" /> Documento
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onAttach(new File([], ''), 'contact')}
            disabled
          >
            <UserPlus className="h-4 w-4 mr-2" /> Contato (em breve)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input ref={imageRef} type="file" accept="image/*" hidden />
      <input ref={videoRef} type="file" accept="video/*" hidden />
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" hidden />
    </>
  );
}
