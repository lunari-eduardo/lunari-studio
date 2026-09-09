import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAvailabilityPanel } from './useAvailabilityPanel';
import { LiberarTab } from './tabs/LiberarTab';
import { BloquearTab } from './tabs/BloquearTab';
import { TiposTab } from './tabs/TiposTab';
import { Loader2 } from 'lucide-react';

interface AvailabilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  initialTime?: string;
}

export function AvailabilityPanel({ isOpen, onClose, date, initialTime }: AvailabilityPanelProps) {
  const panel = useAvailabilityPanel(date, initialTime, onClose);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l overflow-hidden">
        <div className="p-6 pb-3 border-b shrink-0">
          <SheetHeader>
            <SheetTitle>Disponibilidade</SheetTitle>
            <SheetDescription>Gerencie horários e tipos de disponibilidade na agenda.</SheetDescription>
          </SheetHeader>
        </div>

        <Tabs defaultValue="liberar" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3 pb-2 shrink-0">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="liberar">Liberar</TabsTrigger>
              <TabsTrigger value="bloquear">Bloquear</TabsTrigger>
              <TabsTrigger value="tipos">Tipos</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="liberar" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden">
            <LiberarTab panel={panel} />
          </TabsContent>
          
          <TabsContent value="bloquear" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden">
            <BloquearTab panel={panel} />
          </TabsContent>

          <TabsContent value="tipos" className="flex-1 flex flex-col min-h-0 m-0 overflow-y-auto p-6 data-[state=inactive]:hidden">
            <TiposTab />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
