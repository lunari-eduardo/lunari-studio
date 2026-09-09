import React, { useState, useMemo } from 'react';
import { useAgendaOnlineLinks } from '@/hooks/useAgendaOnlineLinks';
import { useAvailabilityTypes } from '@/hooks/useAvailabilityTypes';
import { useConfiguration } from '@/hooks/useConfiguration';
import type { AgendaOnlineLink } from '@/types/agendaOnline';
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
  const [isActive, setIsActive] = useState(true);

  const availablePackages = useMemo(() => {
    if (!categoriaId) return [];
    return pacotes.filter((p) => p.categoria_id === categoriaId);
  }, [pacotes, categoriaId]);

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setDescription('');
    setAvailabilityTypeId('');
    setCategoriaId('');
    setSelectedPackageIds([]);
    setRequireDeposit(false);
    setDepositType('percentage');
    setDepositValue(30);
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

    if (selectedPackageIds.length === 0) {
      toast.error('Selecione pelo menos um pacote permitido.');
      return;
    }

    if (requireDeposit && (!depositValue || depositValue <= 0)) {
      toast.error('Informe um valor de sinal válido.');
      return;
    }

    const payload = {
      title,
      slug,
      description,
      availability_type_id: availabilityTypeId,
      categoria_id: categoriaId,
      pacotes_permitidos: selectedPackageIds,
      require_deposit: requireDeposit,
      deposit_type: depositType,
      deposit_value: depositValue,
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
    availabilityTypes, categorias, availablePackages,
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
    isActive, setIsActive,
    handleOpenForm, handleCloseForm, handleSubmit, handleDelete,
    copyToClipboard, getFullUrl
  };
}
