import { useState, useMemo, useCallback, useEffect } from 'react';
import { Cliente } from '@/types/cliente';
import { ClientMetrics } from '@/hooks/useClientMetrics';
import { useDialogDropdownContext } from '@/components/ui/dialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useClienteDuplicateCheck } from '@/hooks/useClienteDuplicateCheck';
import { toast } from 'sonner';
import { ClienteFormData } from '../types';

interface UseClienteFormStateProps {
  clientesSupabase: any[];
  clientMetrics: ClientMetrics[];
  adicionarClienteSupabase: (data: any) => Promise<any>;
  adicionarClienteCompletoSupabase: (data: any) => Promise<any>;
  atualizarClienteCompletoSupabase: (id: string, data: any) => Promise<any>;
  removerClienteSupabase: (id: string) => Promise<any>;
  verificarClienteTemDados: (id: string) => Promise<{ temDados: boolean; sessoes: number; pagamentos: number }>;
}

export const useClienteFormState = ({
  clientesSupabase,
  clientMetrics,
  adicionarClienteSupabase,
  adicionarClienteCompletoSupabase,
  atualizarClienteCompletoSupabase,
  removerClienteSupabase,
  verificarClienteTemDados,
}: UseClienteFormStateProps) => {
  const dropdownContext = useDialogDropdownContext();
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>({
    nome: '',
    email: '',
    telefone: '',
    origem: '',
  });

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [forceCreate, setForceCreate] = useState(false);

  const {
    dialogState,
    confirm,
    handleConfirm,
    handleCancel,
    handleClose,
  } = useConfirmDialog();

  const clientesParaDuplicateCheck = useMemo(() => {
    return clientesSupabase.map((c) => ({
      id: c.id,
      nome: c.nome,
      email: c.email || '',
      telefone: c.telefone,
      whatsapp: c.whatsapp,
      endereco: c.endereco,
      observacoes: c.observacoes,
      origem: c.origem,
    }));
  }, [clientesSupabase]);

  const duplicateCheck = useClienteDuplicateCheck(
    formData.nome,
    clientesParaDuplicateCheck,
    editingClient?.id,
  );

  // Force cleanup on unmount
  useEffect(() => {
    return () => {
      setOpenDropdowns({});
      dropdownContext?.setHasOpenDropdown(false);
      document.querySelectorAll('[data-radix-select-content]').forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      document.querySelectorAll('[data-radix-select-trigger]').forEach((el) => {
        (el as HTMLElement).style.pointerEvents = '';
      });
    };
  }, [dropdownContext]);

  const handleSelectOpenChange = useCallback(
    (open: boolean, selectType: string) => {
      setOpenDropdowns((prev) => ({
        ...prev,
        [selectType]: open,
      }));
      dropdownContext?.setHasOpenDropdown(
        Object.values({
          ...openDropdowns,
          [selectType]: open,
        }).some(Boolean),
      );
    },
    [dropdownContext, openDropdowns],
  );

  const handleModalClose = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setOpenDropdowns({});
        dropdownContext?.setHasOpenDropdown(false);
        setTimeout(() => {
          document.querySelectorAll('[data-radix-select-content]').forEach((el) => {
            if (el.parentNode) el.parentNode.removeChild(el);
          });
        }, 50);

        setEditingClient(null);
        setFormData({
          nome: '',
          email: '',
          telefone: '',
          origem: '',
        });
        setShowSuggestions(true);
        setShowDuplicateDialog(false);
        setForceCreate(false);
      }
      setShowClientForm(newOpen);
    },
    [dropdownContext],
  );

  const handleAddClient = () => {
    setEditingClient(null);
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      origem: '',
    });
    setShowSuggestions(true);
    setShowDuplicateDialog(false);
    setForceCreate(false);
    setShowClientForm(true);
  };

  const handleEditClient = (client: ClientMetrics) => {
    setEditingClient(client as Cliente);
    
    // Find the full client data from Supabase list
    const fullClient = clientesSupabase.find(c => c.id === client.id);
    
    // Find family members (we need to map them from familia array)
    const conjugeData = fullClient?.familia?.find((f: any) => f.tipo === 'conjuge');
    const filhosData = fullClient?.familia?.filter((f: any) => f.tipo === 'filho') || [];
    
    setFormData({
      nome: client.nome,
      email: client.email,
      telefone: client.telefone,
      origem: (client as any).origem || '',
      whatsapp: fullClient?.whatsapp || '',
      data_nascimento: fullClient?.data_nascimento || '',
      cep: fullClient?.cep || '',
      endereco: fullClient?.endereco || '',
      endereco_numero: fullClient?.endereco_numero || '',
      endereco_complemento: fullClient?.endereco_complemento || '',
      bairro: fullClient?.bairro || '',
      cidade: fullClient?.cidade || '',
      uf: fullClient?.uf || '',
      cpf_cnpj: fullClient?.cpf_cnpj || '',
      observacoes: fullClient?.observacoes || '',
      familia: {
        conjuge: conjugeData ? { nome: conjugeData.nome, dataNascimento: conjugeData.data_nascimento } : undefined,
        filhos: filhosData.map((f: any) => ({ id: f.id, nome: f.nome, dataNascimento: f.data_nascimento }))
      }
    });
    setShowClientForm(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    const { temDados, sessoes, pagamentos } = await verificarClienteTemDados(clientId);
    if (temDados) {
      let mensagem = 'Este cliente possui dados vinculados e não pode ser excluído:\n\n';
      if (sessoes > 0) {
        mensagem += `• ${sessoes} sessão/sessões no histórico\n`;
      }
      if (pagamentos > 0) {
        mensagem += `• ${pagamentos} pagamento(s) registrado(s)\n`;
      }
      toast.error(mensagem, {
        duration: 6000,
        description: 'Para manter a integridade dos dados, clientes com histórico não podem ser removidos.',
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Excluir Cliente',
      description: 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });

    if (confirmed) {
      try {
        await removerClienteSupabase(clientId);
        toast.success('Cliente excluído com sucesso');
      } catch {
        // Tratar erro se necessário
      }
    }
  };

  const handleSaveClient = async () => {
    if (!formData.nome || !formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!editingClient && !forceCreate && duplicateCheck.isDuplicata) {
      setShowDuplicateDialog(true);
      return;
    }

    try {
      const payload = {
        ...formData,
        conjuge: formData.familia?.conjuge,
        filhos: formData.familia?.filhos,
      };
      
      if (editingClient) {
        await atualizarClienteCompletoSupabase(editingClient.id, payload);
        toast.success('Cliente atualizado com sucesso');
      } else {
        await adicionarClienteCompletoSupabase(payload);
        toast.success('Cliente adicionado com sucesso');
      }
      setShowClientForm(false);
      setEditingClient(null);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        origem: '',
      });
      setShowSuggestions(true);
      setShowDuplicateDialog(false);
      setForceCreate(false);
    } catch {
      // Tratar erro se necessário
    }
  };

  const handleEditSuggestion = (cliente: Cliente) => {
    const clienteLegacy = clientMetrics.find((c) => c.id === cliente.id);
    if (clienteLegacy) {
      setShowClientForm(false);
      setShowSuggestions(true);
      setShowDuplicateDialog(false);
      setForceCreate(false);

      setTimeout(() => {
        handleEditClient(clienteLegacy);
      }, 100);
    }
  };

  const handleDismissSuggestions = () => {
    setShowSuggestions(false);
  };

  const handleEditDuplicate = () => {
    if (duplicateCheck.clienteDuplicado) {
      handleEditSuggestion(duplicateCheck.clienteDuplicado);
    }
  };

  const handleCreateAnyway = () => {
    setForceCreate(true);
    setShowDuplicateDialog(false);

    const suffixMatch = formData.nome.match(/\((\d+)\)$/);
    const nextNumber = suffixMatch ? parseInt(suffixMatch[1]) + 1 : 2;
    const newName = suffixMatch
      ? formData.nome.replace(/\(\d+\)$/, `(${nextNumber})`)
      : `${formData.nome} (${nextNumber})`;

    setFormData((prev) => ({ ...prev, nome: newName }));
    toast.info(`Nome alterado para "${newName}" para evitar duplicação`);
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false);
  };

  const handleWhatsApp = (cliente: ClientMetrics) => {
    const telefone = cliente.telefone.replace(/\D/g, '');
    const mensagem = `Olá ${cliente.nome}! 😊\n\nComo você está? Espero que esteja tudo bem!\n\nEstou entrando em contato para...`;
    const mensagemCodificada = encodeURIComponent(mensagem);
    const link = `https://wa.me/55${telefone}?text=${mensagemCodificada}`;
    window.open(link, '_blank');
  };

  return {
    showClientForm,
    setShowClientForm,
    editingClient,
    formData,
    setFormData,
    openDropdowns,
    handleSelectOpenChange,
    handleModalClose,
    showSuggestions,
    showDuplicateDialog,
    forceCreate,
    setForceCreate,
    setShowSuggestions,
    duplicateCheck,
    handleAddClient,
    handleEditClient,
    handleDeleteClient,
    handleSaveClient,
    handleEditSuggestion,
    handleDismissSuggestions,
    handleEditDuplicate,
    handleCreateAnyway,
    handleCancelDuplicate,
    handleWhatsApp,
    dialogState,
    handleConfirm,
    handleCancel,
    handleClose,
  };
};
