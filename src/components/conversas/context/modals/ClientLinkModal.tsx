import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useClientesRealtime } from '@/hooks/useClientesRealtime';
import ClientSearchCombobox from '@/components/agenda/ClientSearchCombobox';

interface ClientLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (clienteId: string) => Promise<void>;
  contatoName?: string;
  contatoPhone?: string;
}

export function ClientLinkModal({ isOpen, onClose, onLink, contatoName, contatoPhone }: ClientLinkModalProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLink = async () => {
    if (!selectedClientId) return;
    setIsSubmitting(true);
    try {
      await onLink(selectedClientId);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vincular ao CRM</DialogTitle>
          <DialogDescription>
            Selecione o cliente no CRM para vincular o contato do WhatsApp <strong>{contatoName || contatoPhone}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ClientSearchCombobox
            value={selectedClientId}
            onSelect={setSelectedClientId}
            placeholder="Buscar cliente no CRM..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleLink} disabled={!selectedClientId || isSubmitting}>
            {isSubmitting ? 'Vinculando...' : 'Vincular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
