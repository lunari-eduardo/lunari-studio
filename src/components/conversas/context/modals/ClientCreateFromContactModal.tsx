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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClientCreateFromContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { nome: string; telefone: string }) => Promise<void>;
  initialName?: string;
  initialPhone?: string;
}

export function ClientCreateFromContactModal({
  isOpen,
  onClose,
  onCreate,
  initialName,
  initialPhone
}: ClientCreateFromContactModalProps) {
  const [nome, setNome] = useState(initialName || '');
  const [telefone, setTelefone] = useState(initialPhone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if props change when opening
  React.useEffect(() => {
    if (isOpen) {
      setNome(initialName || '');
      setTelefone(initialPhone || '');
    }
  }, [isOpen, initialName, initialPhone]);

  const handleCreate = async () => {
    if (!nome.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate({ nome, telefone });
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
          <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          <DialogDescription>
            Criar um novo cadastro no CRM a partir deste contato do WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Nome do Cliente</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="grid gap-2">
            <Label>WhatsApp / Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Número" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!nome.trim() || isSubmitting}>
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar Cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
