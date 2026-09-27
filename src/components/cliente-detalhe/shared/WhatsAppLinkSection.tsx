import React, { useState } from 'react';
import { useConversasContatos } from '@/hooks/useConversasContatos';
import { MessageCircle, Link as LinkIcon, Unlink, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import ContactSearchCombobox from './ContactSearchCombobox';

interface WhatsAppLinkSectionProps {
  clienteId: string;
  clientePhone?: string;
  onUpdatePhone?: (newPhone: string) => void;
}

export function WhatsAppLinkSection({ clienteId, clientePhone, onUpdatePhone }: WhatsAppLinkSectionProps) {
  const { contatos, linkToCliente, unlinkCliente } = useConversasContatos();
  const navigate = useNavigate();
  const [isLinking, setIsLinking] = useState(false);
  
  // Encontra contato vinculado a este cliente
  const linkedContact = contatos.find(c => c.cliente_id === clienteId);

  const handleLink = async (contatoId: string) => {
    try {
      await linkToCliente(contatoId, clienteId);
      const contact = contatos.find(c => c.id === contatoId);
      // Se o usuário quer sobrescrever o telefone do CRM pelo do WhatsApp:
      if (contact && contact.phone_normalized && onUpdatePhone) {
         // Pass the pure digits to be saved in CRM without DDI (it will be normalized by PhoneInput logic later, or we can just send pure digits)
         const digits = contact.phone_normalized.replace(/\D/g, '');
         onUpdatePhone(digits);
      }
      setIsLinking(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlink = async () => {
    if (linkedContact) {
      try {
        await unlinkCliente(linkedContact.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-3">
      {linkedContact ? (
        <div className="flex flex-col gap-3 p-3 rounded-lg border border-border/50 bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
              {linkedContact.avatar_url ? (
                <img src={linkedContact.avatar_url} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <MessageCircle className="h-5 w-5 text-[#10B981]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {linkedContact.nome || linkedContact.nome || 'Sem Nome'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {linkedContact.phone_normalized}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/10 hover:text-[#10B981]"
              onClick={() => navigate(`/conversas?chatId=${linkedContact.id}`)}
            >
              <ExternalLink className="h-3 w-3 mr-1.5" />
              Abrir Conversa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-2 h-8 text-xs text-muted-foreground hover:text-red-500"
              onClick={handleUnlink}
              title="Desvincular contato"
            >
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {isLinking ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ContactSearchCombobox
                  onSelect={(id) => handleLink(id)}
                  placeholder="Buscar contato para vincular..."
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-muted-foreground shrink-0"
                onClick={() => setIsLinking(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border/60 bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Nenhum contato do WhatsApp vinculado
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setIsLinking(true)}
              >
                <LinkIcon className="h-3 w-3" />
                Vincular WhatsApp
              </Button>
            </div>
          )}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        A vinculação permite unificar as conversas com as sessões, automatizar lembretes e centralizar o histórico do cliente.
      </p>
    </div>
  );
}
