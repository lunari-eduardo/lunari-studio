import { useState, useMemo, useCallback, useEffect } from 'react';
import { Cliente } from '@/types/cliente';
import { useDialogDropdownContext } from '@/components/ui/dialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useClienteDuplicateCheck } from '@/hooks/useClienteDuplicateCheck';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClienteFormData } from '../types';

interface UseClienteFormStateProps {
  clientesSupabase?: any[];
  clientMetrics?: any[];
  adicionarClienteSupabase?: (data: any) => Promise<any>;
  adicionarClienteCompletoSupabase?: (data: any) => Promise<any>;
  atualizarClienteCompletoSupabase?: (id: string, data: any) => Promise<any>;
  removerClienteSupabase?: (id: string) => Promise<any>;
  verificarClienteTemDados?: (id: string) => Promise<{ temDados: boolean; sessoes: number; pagamentos: number }>;
  onClientMutated?: () => void;
}

export const useClienteFormState = ({
  clientesSupabase = [],
  clientMetrics = [],
  adicionarClienteSupabase,
  adicionarClienteCompletoSupabase,
  atualizarClienteCompletoSupabase,
  removerClienteSupabase,
  verificarClienteTemDados,
  onClientMutated,
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

  const handleEditClient = async (client: any) => {
    setEditingClient(client as Cliente);

    // Tenta carregar dados completos e família sob demanda
    try {
      const { data: fullClient } = await supabase
        .from('clientes')
        .select('*, clientes_familia(*)')
        .eq('id', client.id)
        .single();

      const conjugeData = fullClient?.clientes_familia?.find((f: any) => f.tipo === 'conjuge');
      const filhosData = fullClient?.clientes_familia?.filter((f: any) => f.tipo === 'filho') || [];

      setFormData({
        nome: fullClient?.nome || client.nome,
        email: fullClient?.email || client.email || '',
        telefone: fullClient?.telefone || client.telefone || '',
        origem: fullClient?.origem || client.origem || '',
        whatsapp: fullClient?.whatsapp || client.whatsapp || '',
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
          filhos: filhosData.map((f: any) => ({ id: f.id, nome: f.nome, dataNascimento: f.data_nascimento })),
        },
      });
    } catch {
      // Fallback
      setFormData({
        nome: client.nome || '',
        email: client.email || '',
        telefone: client.telefone || '',
        origem: client.origem || '',
        whatsapp: client.whatsapp || '',
      });
    }

    setShowClientForm(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (verificarClienteTemDados) {
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
        if (removerClienteSupabase) {
          await removerClienteSupabase(clientId);
        } else {
          const { error } = await supabase.from('clientes').delete().eq('id', clientId);
          if (error) throw error;
        }
        toast.success('Cliente removido com sucesso');
        onClientMutated?.();
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        toast.error('Erro ao excluir cliente');
      }
    }
  };

  const handleSaveClient = async () => {
    if (!formData.nome.trim()) {
      toast.error('O nome do cliente é obrigatório');
      return;
    }

    if (duplicateCheck.isDuplicata && !forceCreate && !editingClient) {
      setShowDuplicateDialog(true);
      return;
    }

    try {
      const payload: any = {
        nome: formData.nome.trim(),
        email: formData.email?.trim() || null,
        telefone: formData.telefone?.trim() || '',
        whatsapp: formData.whatsapp?.trim() || null,
        origem: formData.origem || null,
        data_nascimento: formData.data_nascimento || null,
        cep: formData.cep || null,
        endereco: formData.endereco || null,
        endereco_numero: formData.endereco_numero || null,
        endereco_complemento: formData.endereco_complemento || null,
        bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        uf: formData.uf || null,
        cpf_cnpj: formData.cpf_cnpj || null,
        observacoes: formData.observacoes || null,
        conjuge: formData.familia?.conjuge,
        filhos: formData.familia?.filhos,
      };

      if (editingClient) {
        if (atualizarClienteCompletoSupabase) {
          await atualizarClienteCompletoSupabase(editingClient.id, payload);
        } else {
          const { error } = await supabase.from('clientes').update(payload).eq('id', editingClient.id);
          if (error) throw error;
        }
        toast.success('Cliente atualizado com sucesso');
      } else {
        if (adicionarClienteCompletoSupabase) {
          await adicionarClienteCompletoSupabase(payload);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Usuário não autenticado');
          const { error } = await supabase.from('clientes').insert({ ...payload, user_id: user.id });
          if (error) throw error;
        }
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
      onClientMutated?.();
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleEditSuggestion = (cliente: Cliente) => {
    setShowClientForm(false);
    setShowSuggestions(true);
    setShowDuplicateDialog(false);
    setForceCreate(false);

    setTimeout(() => {
      handleEditClient(cliente);
    }, 100);
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

  const handleWhatsApp = (cliente: any) => {
    const rawNumber = cliente.whatsapp || cliente.telefone || '';
    const cleanNumber = rawNumber.replace(/\D/g, '');

    if (!cleanNumber) {
      toast.error('Cliente não possui telefone ou WhatsApp cadastrado');
      return;
    }

    const mensagem = `Olá ${cliente.nome}! 😊\n\nComo você está? Espero que esteja tudo bem!\n\nEstou entrando em contato para...`;
    const mensagemCodificada = encodeURIComponent(mensagem);
    const ddi = cleanNumber.length <= 11 ? '55' : '';
    const link = `https://wa.me/${ddi}${cleanNumber}?text=${mensagemCodificada}`;
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
