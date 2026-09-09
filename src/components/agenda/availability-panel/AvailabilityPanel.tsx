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
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l">
        <div className="p-6 pb-2 border-b">
          <SheetHeader>
            <SheetTitle>Disponibilidade</SheetTitle>
            <SheetDescription>Gerencie horários e tipos de disponibilidade na agenda.</SheetDescription>
          </SheetHeader>
        </div>

        <Tabs defaultValue="liberar" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="liberar">Liberar</TabsTrigger>
              <TabsTrigger value="bloquear">Bloquear</TabsTrigger>
              <TabsTrigger value="tipos">Tipos</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="liberar" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <LiberarTab panel={panel} />
            </TabsContent>
            
            <TabsContent value="bloquear" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <BloquearTab panel={panel} />
            </TabsContent>

            <TabsContent value="tipos" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <TiposTab />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
