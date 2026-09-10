import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EntitlementKey, ENTITLEMENT_NAMES } from '@/lib/entitlements';

interface ProModalContextType {
  openModal: (feature?: EntitlementKey) => void;
  closeModal: () => void;
}

const ProModalContext = createContext<ProModalContextType>({
  openModal: () => {},
  closeModal: () => {},
});

export const useProModal = () => useContext(ProModalContext);

export function ProModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feature, setFeature] = useState<EntitlementKey | undefined>(undefined);
  const navigate = useNavigate();

  const openModal = (feat?: EntitlementKey) => {
    setFeature(feat);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setFeature(undefined);
  };

  const handleUpgrade = () => {
    closeModal();
    navigate('/escolher-plano');
  };

  return (
    <ProModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-2xl font-bold">
              Recurso Exclusivo Pro
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {feature 
                ? `O recurso de ${ENTITLEMENT_NAMES[feature]} é exclusivo do plano Pro.`
                : 'Esta funcionalidade é exclusiva para assinantes do plano Pro.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-6">
            <p className="text-sm text-center text-muted-foreground">
              Faça upgrade agora e desbloqueie acesso ilimitado a:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4" /> Transfer com entrega de arquivos (500GB+)</li>
              <li className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4" /> Contratos e Formulários digitais</li>
              <li className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4" /> Agenda Online e Integrações</li>
              <li className="flex items-center gap-2"><Check className="text-green-500 w-4 h-4" /> Cobranças por link sem taxa extra</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={handleUpgrade} size="lg" className="w-full bg-amber-600 hover:bg-amber-700 text-white">
              <Crown className="w-4 h-4 mr-2" />
              Ver Planos
            </Button>
            <Button onClick={closeModal} variant="ghost" className="w-full">
              Agora não
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProModalContext.Provider>
  );
}
