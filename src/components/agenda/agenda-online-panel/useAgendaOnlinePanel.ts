import React, { useState, useMemo } from 'react';
import { useAgendaOnlineLinks } from '@/hooks/useAgendaOnlineLinks';
import { useAvailabilityTypes } from '@/hooks/useAvailabilityTypes';
import { useConfiguration } from '@/hooks/useConfiguration';
import type { AgendaOnlineLink, NewAgendaOnlineLink } from '@/types/agendaOnline';
import type { SelectedProvider } from '@/components/cobranca/ProviderRow';
import { toast } from 'sonner';

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function useAgendaOnlinePanel(onClose: () => void) {
  const { links, isLoading, createLink, updateLink, toggleLinkActive, deleteLink, isSubmitting } = useAgendaOnlineLinks();
  const { availabilityTypes } = useAvailabilityTypes();
  const { categorias, pacotes } = useConfiguration();

  // Filtrar tipo "Ocupado" para não aparecer nas opções de agendamento online
  const onlineAvailabilityTypes = useMemo(() => {
    return availabilityTypes.filter(
      (t) => t.name?.trim().toLowerCase() !== 'ocupado'
    );
  }, [availabilityTypes]);

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingLink, setEditingLink] = useState<AgendaOnlineLink | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [availabilityTypeId, setAvailabilityTypeId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositType, setDepositType] = useState<'fixed' | 'percentage'>('percentage');
  const [depositValue, setDepositValue] = useState<number>(30);
  const [depositGateway, setDepositGateway] = useState<SelectedProvider | null>(null);
  const [showPackagePrice, setShowPackagePrice] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const availablePackages = useMemo(() => {
    if (!categoriaId) return [];
    return pacotes.filter((p) => p.categoria_id === categoriaId);
  }, [pacotes, categoriaId]);

  const toSelectorProvider = (val?: string | null): SelectedProvider | null => {
    if (!val) return null;
    if (val === 'mercadopago') return 'mercadopago_link';
    return val as SelectedProvider;
  };

  const toDatabaseProvider = (val?: SelectedProvider | null): string | null => {
    if (!val) return null;
    if (val === 'mercadopago_link') return 'mercadopago';
    return val;
  };

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setDescription('');
    setAvailabilityTypeId(onlineAvailabilityTypes[0]?.id || '');
    setCategoriaId('');
    setSelectedPackageIds([]);
    setRequireDeposit(false);
    setDepositType('percentage');
    setDepositValue(30);
    setDepositGateway(null);
    setShowPackagePrice(true);
    setIsActive(true);
    setEditingLink(null);
  };

  const handleOpenForm = (linkToEdit?: AgendaOnlineLink) => {
    if (linkToEdit) {
      setEditingLink(linkToEdit);
      setTitle(linkToEdit.title);
      setSlug(linkToEdit.slug);
      setDescription(linkToEdit.description || '');
      setAvailabilityTypeId(linkToEdit.availability_type_id);
      setCategoriaId(linkToEdit.categoria_id);
      setSelectedPackageIds(linkToEdit.pacotes_permitidos || []);
      setRequireDeposit(linkToEdit.require_deposit);
      setDepositType(linkToEdit.deposit_type || 'percentage');
      setDepositValue(linkToEdit.deposit_value || 0);
      setDepositGateway(toSelectorProvider(linkToEdit.deposit_gateway));
      setShowPackagePrice(linkToEdit.show_package_price !== false);
      setIsActive(linkToEdit.is_active);
    } else {
      resetForm();
    }
    setViewMode('form');
  };

  const handleCloseForm = () => {
    resetForm();
    setViewMode('list');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !slug || !availabilityTypeId || !categoriaId) {
      toast.error('Preencha os campos obrigatórios (Título, URL, Tipo de Disponibilidade e Categoria).');
      return;
    }

    const chosenType = availabilityTypes.find(t => t.id === availabilityTypeId);
    if (chosenType && chosenType.name?.trim().toLowerCase() === 'ocupado') {
      toast.error('O tipo "Ocupado" não pode ser utilizado para agendamentos online.');
      return;
    }

    if (selectedPackageIds.length === 0) {
      toast.error('Selecione pelo menos um pacote permitido.');
      return;
    }

    if (requireDeposit && (!depositValue || depositValue <= 0)) {
      toast.error('Informe um valor de sinal válido.');
      return;
    }

    const payload: NewAgendaOnlineLink = {
      title,
      slug,
      description,
      availability_type_id: availabilityTypeId,
      categoria_id: categoriaId,
      pacotes_permitidos: selectedPackageIds,
      require_deposit: requireDeposit,
      deposit_type: depositType,
      deposit_value: depositValue,
      deposit_gateway: toDatabaseProvider(depositGateway),
      show_package_price: showPackagePrice,
      is_active: isActive,
    };

    try {
      if (editingLink) {
        await updateLink(editingLink.id, payload);
        toast.success('Link atualizado com sucesso!');
      } else {
        await createLink(payload);
        toast.success('Link criado com sucesso!');
      }
      handleCloseForm();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar link.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este link? Essa ação não pode ser desfeita.')) {
      try {
        await deleteLink(id);
        toast.success('Link excluído com sucesso!');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir link.');
      }
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingLink) setSlug(slugify(val));
  };

  const handleTogglePackage = (pkgId: string) => {
    if (pkgId === 'CLEAR_ALL') {
      setSelectedPackageIds([]);
      return;
    }
    setSelectedPackageIds(prev =>
      prev.includes(pkgId) ? prev.filter(id => id !== pkgId) : [...prev, pkgId]
    );
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  const getFullUrl = (slugPath: string) => {
    return `${window.location.origin}/book/${slugPath}`;
  };

  return {
    links, isLoading, isSubmitting, toggleLinkActive,
    availabilityTypes, onlineAvailabilityTypes, categorias, availablePackages,
    viewMode, setViewMode,
    editingLink,
    title, handleTitleChange,
    slug, setSlug,
    description, setDescription,
    availabilityTypeId, setAvailabilityTypeId,
    categoriaId, setCategoriaId,
    selectedPackageIds, handleTogglePackage,
    requireDeposit, setRequireDeposit,
    depositType, setDepositType,
    depositValue, setDepositValue,
    depositGateway, setDepositGateway,
    showPackagePrice, setShowPackagePrice,
    isActive, setIsActive,
    handleOpenForm, handleCloseForm, handleSubmit, handleDelete,
    copyToClipboard, getFullUrl
  };
}
