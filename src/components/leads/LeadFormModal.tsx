import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  SelectModal as Select, 
  SelectModalContent as SelectContent, 
  SelectModalItem as SelectItem, 
  SelectModalTrigger as SelectTrigger, 
  SelectModalValue as SelectValue 
} from '@/components/ui/select-in-modal';
import { useDialogDropdownContext } from '@/components/ui/dialog';
import { useAppContext } from '@/contexts/AppContext';
import { useLeadStatuses } from '@/hooks/useLeadStatuses';
import { ORIGENS_PADRAO } from '@/utils/defaultOrigens';
import type { Lead } from '@/types/leads';
import type { OrigemCliente } from '@/types/cliente';
import { User, Phone, Mail, Tag, Building, Activity, ChevronDown, ChevronUp, FileText } from 'lucide-react';


interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: Lead;
  onSubmit: (data: Omit<Lead, 'id' | 'dataCriacao'>) => void;
}

interface FormData {
  nome: string;
  email: string;
  telefone: string;
  origem: string;
  status: string;
  observacoes: string;
  clienteId: string;
  categoriaManualId: string;
}

export default function LeadFormModal({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit
}: LeadFormModalProps) {
  const { origens: contextOrigens, categoriasFull } = useAppContext();
  const { statuses, getDefaultOpenKey } = useLeadStatuses();
  const dropdownContext = useDialogDropdownContext();
  
  const origens: OrigemCliente[] = contextOrigens.length > 0 
    ? contextOrigens 
    : ORIGENS_PADRAO.map(origem => ({
        id: origem.id,
        nome: origem.nome,
        cor: origem.cor
      }));

  const getInitialFormData = useCallback((): FormData => ({
    nome: '',
    email: '',
    telefone: '',
    origem: '',
    status: getDefaultOpenKey() || 'novo_contato',
    observacoes: '',
    clienteId: '',
    categoriaManualId: ''
  }), [getDefaultOpenKey]);

  const [formData, setFormData] = useState<FormData>(getInitialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setFormData({
          nome: initial.nome || '',
          email: initial.email || '',
          telefone: initial.telefone || '',
          origem: initial.origem || '',
          status: initial.status || getDefaultOpenKey() || 'novo_contato',
          observacoes: initial.observacoes || '',
          clienteId: initial.clienteId || '',
          categoriaManualId: initial.categoria_manual_id || ''
        });
      } else {
        setFormData(getInitialFormData());
      }
      setErrors({});
      setIsSubmitting(false);
      setOpenDropdowns({});
      setShowMore(false);
    }
  }, [open, mode, initial, getInitialFormData]);

  useEffect(() => {
    return () => {
      setOpenDropdowns({});
    };
  }, []);

  const handleClose = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setOpenDropdowns({});
      dropdownContext?.setHasOpenDropdown(false);
      
      if (!isSubmitting) {
        setFormData(getInitialFormData());
        setErrors({});
      }
    }
    onOpenChange(newOpen);
  }, [onOpenChange, getInitialFormData, isSubmitting, dropdownContext]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    if (!formData.categoriaManualId) {
      newErrors.categoriaManualId = 'Interesse é obrigatório';
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const leadData: any = {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        telefone: formData.telefone.trim(),
        origem: formData.origem.trim() || undefined,
        status: formData.status,
        observacoes: formData.observacoes.trim() || undefined,
        clienteId: formData.clienteId || undefined,
        interacoes: [],
        whatsapp: formData.telefone.trim(),
        categoria_manual_id: formData.categoriaManualId
      };
      
      await onSubmit(leadData);

      handleClose(false);
    } catch (error) {
      console.error('[LeadFormModal] Erro ao salvar lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit, handleClose, isSubmitting]);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleSelectOpenChange = useCallback((open: boolean, selectType: string) => {
    setOpenDropdowns(prev => ({ ...prev, [selectType]: open }));
    dropdownContext?.setHasOpenDropdown(Object.values({...openDropdowns, [selectType]: open}).some(Boolean));
  }, [dropdownContext, openDropdowns]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-0 border-0 shadow-2xl bg-white dark:bg-[#1A1A1A] rounded-2xl"
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-start gap-4 bg-zinc-50/50 dark:bg-[#1A1A1A]">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <User className="h-6 w-6 text-amber-700 dark:text-amber-500" />
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {mode === 'create' ? 'Novo Lead' : 'Editar Lead'}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 mt-1">
              {mode === 'create' ? 'Preencha os dados para criar uma nova oportunidade' : 'Edite as informações do lead'}
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Dados de Contato */}
          <div className="space-y-4">
            <h3 className="text-[13px] font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
              Dados de contato
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Nome *</Label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-zinc-400"><User className="h-4 w-4" /></div>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    className={`pl-9 border-black/10 dark:border-white/10 shadow-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-amber-500/50 ${errors.nome ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.nome && <p className="text-[10px] text-red-500">{errors.nome}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Telefone</Label>
                <div className="relative">
                  <div className="absolute left-3 top-2.5 text-zinc-400"><Phone className="h-4 w-4" /></div>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    className="pl-9 border-black/10 dark:border-white/10 shadow-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-amber-500/50"
                    placeholder="(Opcional)"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email</Label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-zinc-400"><Mail className="h-4 w-4" /></div>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`pl-9 border-black/10 dark:border-white/10 shadow-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-amber-500/50 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="email@exemplo.com"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && <p className="text-[10px] text-red-500">{errors.email}</p>}
            </div>
          </div>

          {/* Detalhes da oportunidade */}
          <div className="space-y-4">
            <div>
              <h3 className="text-[13px] font-bold text-amber-700 dark:text-amber-500 flex items-center gap-2">
                Detalhes da oportunidade
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1">Essas informações ajudam a organizar seu funil e acompanhar o interesse do cliente.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Interesse *</Label>
                <Select 
                  value={formData.categoriaManualId} 
                  onValueChange={(value) => handleInputChange('categoriaManualId', value)}
                  onOpenChange={(open) => handleSelectOpenChange(open, 'categoriaManualId')}
                >
                  <SelectTrigger className={`border-black/10 dark:border-white/10 shadow-none h-9 text-sm focus:ring-1 focus:ring-amber-500/50 ${errors.categoriaManualId ? 'border-red-500' : ''}`}>
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                      <Tag className="h-4 w-4 text-zinc-400" />
                      <SelectValue placeholder="Selecione uma categoria" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasFull.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoriaManualId && <p className="text-[10px] text-red-500">{errors.categoriaManualId}</p>}
                <p className="text-[10px] text-zinc-400 mt-1">Escolha a categoria de interesse deste lead.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Origem</Label>
                <Select 
                  value={formData.origem} 
                  onValueChange={(value) => handleInputChange('origem', value)}
                  onOpenChange={(open) => handleSelectOpenChange(open, 'origem')}
                >
                  <SelectTrigger className="border-black/10 dark:border-white/10 shadow-none h-9 text-sm focus:ring-1 focus:ring-amber-500/50">
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                      <Building className="h-4 w-4 text-zinc-400" />
                      <SelectValue placeholder="Selecionar origem" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {origens.map(origem => (
                      <SelectItem key={origem.id} value={origem.nome}>
                        {origem.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Status inicial</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
                onOpenChange={(open) => handleSelectOpenChange(open, 'status')}
              >
                <SelectTrigger className="border-black/10 dark:border-white/10 shadow-none h-9 text-sm focus:ring-1 focus:ring-amber-500/50">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                    <Activity className="h-4 w-4 text-zinc-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status.id} value={status.key}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-400 mt-1">Define em qual etapa do funil este lead será criado.</p>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-700 dark:text-amber-500" />
              Observações
            </Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              rows={3}
              placeholder="Adicione informações importantes sobre este lead..."
              className="border-black/10 dark:border-white/10 shadow-none text-sm focus-visible:ring-1 focus-visible:ring-amber-500/50 resize-none"
              disabled={isSubmitting}
            />
            <div className="flex justify-end">
              <span className="text-[10px] text-zinc-400">{formData.observacoes.length}/500</span>
            </div>
          </div>

          {/* Mais detalhes (Accordion Placeholder) */}
          <div className="rounded-lg border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-md bg-black/5 dark:bg-white/5">
                  {showMore ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Mais detalhes (opcional)</div>
                  <div className="text-[10px] text-zinc-400">Data prevista, cidade, indicação, valor de interesse, tags e mais.</div>
                </div>
              </div>
            </button>
            {showMore && (
              <div className="p-4 border-t border-black/5 dark:border-white/5">
                <p className="text-xs text-zinc-500 text-center italic py-2">
                  Campos estendidos estarão disponíveis em breve.
                </p>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
              className="h-10 px-6 font-semibold border-black/10 dark:border-white/10 shadow-none"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="h-10 px-6 font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {isSubmitting ? 'Salvando...' : (mode === 'create' ? 'Criar Lead →' : 'Salvar Alteraçoes')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
