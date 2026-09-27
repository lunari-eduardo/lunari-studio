import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Image as ImageIcon, 
  MousePointerClick, 
  Send 
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';

interface EmptyGalleriesStateProps {
  clienteId: string;
}

export function EmptyGalleriesState({ clienteId }: EmptyGalleriesStateProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 p-12 text-center mt-4">
      <ImageIcon className="mb-3 h-8 w-8 text-muted-foreground/50" />
      <h3 className="text-sm font-medium text-foreground">Nenhuma galeria vinculada</h3>
      <p className="mt-1 mb-4 text-xs text-muted-foreground">
        Este cliente ainda não possui nenhuma galeria vinculada a ele.
      </p>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Criar Galeria
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2 rounded-xl shadow-lg border border-border/60" align="center" sideOffset={8}>
          <div className="space-y-1">
            <button
              onClick={() => navigate('/app/gallery/new/select', { state: { preselectClient: clienteId } })}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted/60 transition-colors text-left"
            >
              <MousePointerClick className="h-3.5 w-3.5 text-accent-gold shrink-0" />
              <span>Galeria de Seleção</span>
            </button>
            <button
              onClick={() => navigate('/app/gallery/new/transfer', { state: { preselectClient: clienteId } })}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted/60 transition-colors text-left"
            >
              <Send className="h-3.5 w-3.5 text-accent-gold shrink-0" />
              <span>Galeria de Transfer</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
