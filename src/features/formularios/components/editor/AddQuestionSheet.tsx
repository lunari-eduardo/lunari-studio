/**
 * AddQuestionSheet — picker de tipos de pergunta.
 *
 * Mostra exatamente os tipos existentes no schema (`FormularioCampoTipo`),
 * com rótulo amigável + descrição curta. Não cria tipos fictícios.
 *
 * Em desktop (≥md) abre como Sheet (lateral); em mobile (<md) abre como
 * Drawer (bottom-sheet). Comportamento idêntico — só muda o container.
 */
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  CAMPO_TIPO_LABELS,
  type FormularioCampoTipo,
} from '@/types/formulario';
import {
  AlignLeft,
  AlignLeftIcon,
  CheckSquare,
  Circle,
  CalendarDays,
  Image as ImageIcon,
  ImagePlus,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AddQuestionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tipo: FormularioCampoTipo) => void;
}

interface TipoInfo {
  tipo: FormularioCampoTipo;
  descricao: string;
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
}

const TIPO_INFO: TipoInfo[] = [
  {
    tipo: 'texto_curto',
    descricao: 'Respostas rápidas.',
    Icon: AlignLeft,
  },
  {
    tipo: 'texto_longo',
    descricao: 'Respostas detalhadas.',
    Icon: AlignLeftIcon,
  },
  {
    tipo: 'selecao_unica',
    descricao: 'Uma opção.',
    Icon: Circle,
  },
  {
    tipo: 'multipla_escolha',
    descricao: 'Várias opções.',
    Icon: CheckSquare,
  },
  {
    tipo: 'data',
    descricao: 'Seleção de data.',
    Icon: CalendarDays,
  },
  {
    tipo: 'upload_referencia',
    descricao: 'Imagens de inspiração.',
    Icon: ImageIcon,
  },
  {
    tipo: 'upload_imagem',
    descricao: 'Enviar arquivos.',
    Icon: ImagePlus,
  },
  {
    tipo: 'selecao_cores',
    descricao: 'Paleta ou tons.',
    Icon: Palette,
  },
];

export function AddQuestionSheet({
  open,
  onOpenChange,
  onSelect,
}: AddQuestionSheetProps) {
  const isMobile = useIsMobile();

  const handleSelect = (tipo: FormularioCampoTipo) => {
    onSelect(tipo);
  };

  const body = (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {TIPO_INFO.map(({ tipo, descricao, Icon }) => (
        <button
          key={tipo}
          type="button"
          onClick={() => handleSelect(tipo)}
          className={cn(
            'group flex flex-col items-start gap-1 rounded-lg border bg-background px-4 py-3 text-left transition-colors',
            'hover:border-foreground/40 hover:bg-muted/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
          )}
        >
          <Icon size={18} className="text-muted-foreground group-hover:text-foreground" aria-hidden />
          <span className="text-sm font-medium text-foreground">
            {CAMPO_TIPO_LABELS[tipo]}
          </span>
          <span className="text-[11px] leading-snug text-muted-foreground">
            {descricao}
          </span>
        </button>
      ))}
    </div>
  );

  const title = 'Adicionar pergunta';
  const description =
    'Escolha o tipo de pergunta que deseja adicionar.';

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-6 pt-2">
          <DrawerHeader className="px-0 pt-2 pb-3 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}
