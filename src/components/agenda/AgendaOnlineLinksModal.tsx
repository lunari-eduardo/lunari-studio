import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgendaOnlineLinks } from '@/hooks/useAgendaOnlineLinks';
import { useAvailabilityTypes } from '@/hooks/useAvailabilityTypes';
import { useConfiguration } from '@/hooks/useConfiguration';
import type { AgendaOnlineLink, NewAgendaOnlineLink } from '@/types/agendaOnline';
import { toast } from 'sonner';
import {
  Globe,
  Plus,
  Copy,
  ExternalLink,
  Edit,
  Trash2,
  Check,
  Calendar,
  DollarSign,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { dialogSize, DIALOG_SHELL, DIALOG_TITLE_CLS } from '@/lib/dialogTokens';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/financialUtils';

interface AgendaOnlineLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // remove caracteres especiais
    .replace(/[\s_]+/g, '-') // substitui espaços por -
    .replace(/^-+|-+$/g, ''); // remove traços no início/fim
}

export function AgendaOnlineLinksModal({ isOpen, onClose }: AgendaOnlineLinksModalProps) {
  const { links, isLoading, createLink, updateLink, toggleLinkActive, deleteLink, isSubmitting } =
    useAgendaOnlineLinks();
  const { availabilityTypes } = useAvailabilityTypes();
  const { categorias, pacotes } = useConfiguration();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingLink, setEditingLink] = useState<AgendaOnlineLink | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [availabilityTypeId, setAvailabilityTypeId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositType, setDepositType] = useState<'fixed' | 'percentage'>('percentage');
  const [depositValue, setDepositValue] = useState<number>(30); // 30% padrão
  const [isActive, setIsActive] = useState(true);

  // Filter packages by selected category
  const availablePackages = useMemo(() => {
    if (!categoriaId) return [];
    return pacotes.filter((p) => p.categoria_id === categoriaId);
  }, [pacotes, categoriaId]);

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
      setEditingLink(null);
      setTitle('');
      setSlug('');
      setDescription('');
      setAvailabilityTypeId(availabilityTypes[0]?.id || '');
      setCategoriaId(categorias[0]?.id || '');
      setSelectedPackageIds([]);
      setRequireDeposit(false);
      setDepositType('percentage');
      setDepositValue(30);
      setIsActive(true);
    }
    setViewMode('form');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingLink) {
      setSlug(slugify(val));
    }
  };

  const handleTogglePackage = (pkgId: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Informe o título do link.');
      return;
    }

    const cleanSlug = slugify(slug || title);
    if (!cleanSlug) {
      toast.error('Slug inválido.');
      return;
    }

    if (!availabilityTypeId) {
      toast.error('Selecione o tipo de disponibilidade da agenda.');
      return;
    }

    if (!categoriaId) {
      toast.error('Selecione uma categoria.');
      return;
    }

    if (selectedPackageIds.length === 0) {
      toast.error('Selecione ao menos um pacote para este link.');
      return;
    }

    if (requireDeposit && (depositValue <= 0 || isNaN(depositValue))) {
      toast.error('Informe um valor válido para o sinal.');
      return;
    }

    const payload: NewAgendaOnlineLink = {
      title: title.trim(),
      slug: cleanSlug,
      description: description.trim() || null,
      availability_type_id: availabilityTypeId,
      categoria_id: categoriaId,
      pacotes_permitidos: selectedPackageIds,
      require_deposit: requireDeposit,
      deposit_type: requireDeposit ? depositType : null,
      deposit_value: requireDeposit ? Number(depositValue) : null,
      is_active: isActive,
    };

    try {
      if (editingLink) {
        await updateLink(editingLink.id, payload);
      } else {
        await createLink(payload);
      }
      setViewMode('list');
    } catch {
      // toast já disparado no hook
    }
  };

  const handleCopyLink = (linkSlug: string) => {
    const url = `${window.location.origin}/agendar/${linkSlug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este link de agendamento?')) return;
    await deleteLink(id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(dialogSize('lg'), DIALOG_SHELL, 'max-h-[90vh] flex flex-col')}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className={cn(DIALOG_TITLE_CLS, 'flex items-center gap-2')}>
              <Globe className="h-5 w-5 text-primary" />
              Agendamento Online
            </DialogTitle>
            {viewMode === 'list' && (
              <Button size="sm" onClick={() => handleOpenForm()} className="gap-1.5 h-8 text-xs">
                <Plus className="h-4 w-4" />
                Criar Novo Link
              </Button>
            )}
          </div>
          <DialogDescription>
            Crie links públicos para que seus clientes escolham pacotes e reservem os horários liberados na sua Agenda.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 pr-1">
          {viewMode === 'list' ? (
            /* ================= LISTA DE LINKS ================= */
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Carregando links...</div>
              ) : links.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl p-6 bg-muted/10 space-y-3">
                  <Globe className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <div>
                    <p className="font-semibold text-sm">Nenhum link de agendamento online criado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Crie um link para permitir que clientes agendem seus horários livres diretamente pelo navegador.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleOpenForm()} className="gap-1.5 mt-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeiro Link
                  </Button>
                </div>
              ) : (
                links.map((link) => {
                  const type = availabilityTypes.find((t) => t.id === link.availability_type_id);
                  const cat = categorias.find((c) => c.id === link.categoria_id);
                  const pkgCount = link.pacotes_permitidos?.length || 0;

                  return (
                    <div
                      key={link.id}
                      className={cn(
                        'p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                        link.is_active ? 'bg-card border-border/60 hover:border-primary/40' : 'bg-muted/30 border-border/30 opacity-75'
                      )}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm truncate">{link.title}</h4>
                          <Badge variant={link.is_active ? 'default' : 'secondary'} className="text-[10px] h-5">
                            {link.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          {type && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border/40">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }} />
                              {type.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>
                            Categoria: <strong className="text-foreground">{cat?.nome || '—'}</strong>
                          </span>
                          <span>•</span>
                          <span>{pkgCount} pacote(s) disponível(is)</span>
                          {link.require_deposit && (
                            <>
                              <span>•</span>
                              <span>
                                Sinal:{' '}
                                <strong className="text-foreground">
                                  {link.deposit_type === 'percentage'
                                    ? `${link.deposit_value}%`
                                    : formatCurrency(link.deposit_value || 0)}
                                </strong>
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <code className="text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded font-mono truncate max-w-[280px] sm:max-w-[400px]">
                            /agendar/{link.slug}
                          </code>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs"
                          onClick={() => handleCopyLink(link.slug)}
                          title="Copiar link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => window.open(`/agendar/${link.slug}`, '_blank')}
                          title="Abrir página pública"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenForm(link)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(link.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ================= FORMULÁRIO ================= */
            <form onSubmit={handleSave} className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-xs -ml-2 mb-1"
                onClick={() => setViewMode('list')}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para lista de links
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título da Página / Ação *</Label>
                  <Input
                    placeholder="Ex: Ensaio de Páscoa 2026"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Slug (Link personalizado) *</Label>
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-2 rounded-l-md border border-r-0 border-input">
                      /agendar/
                    </span>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(slugify(e.target.value))}
                      className="rounded-l-none"
                      placeholder="pascoa-2026"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Descrição / Instruções (Opcional)</Label>
                <Textarea
                  placeholder="Instruções aos clientes (local do estúdio, recomendações de roupas...)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* VINCULAÇÃO DE DISPONIBILIDADE E CATEGORIA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Tipo de Disponibilidade na Agenda *
                  </Label>
                  <Select value={availabilityTypeId} onValueChange={setAvailabilityTypeId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availabilityTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    O cliente verá apenas os horários que você liberou com este tipo na sua Agenda.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Categoria de Ensaio *</Label>
                  <Select
                    value={categoriaId}
                    onValueChange={(val) => {
                      setCategoriaId(val);
                      setSelectedPackageIds([]); // reseta pacotes selecionados
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PACOTES PERMITIDOS */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Pacotes Disponíveis para Escolha *</Label>
                {availablePackages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    Nenhum pacote encontrado para a categoria selecionada.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {availablePackages.map((pkg) => {
                      const isChecked = selectedPackageIds.includes(pkg.id);
                      return (
                        <label
                          key={pkg.id}
                          className={cn(
                            'flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors',
                            isChecked ? 'border-primary bg-primary/5' : 'border-border/40 hover:bg-muted/20'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => handleTogglePackage(pkg.id)}
                            />
                            <div>
                              <span className="font-medium">{pkg.nome}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                {formatCurrency(Number(pkg.valor_base) || 0)}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* COBRANÇA DE SINAL */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-primary" />
                      Cobrar Sinal / Entrada no Agendamento?
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Se ativado, o cliente deve pagar o sinal no checkout para confirmar o horário.
                    </p>
                  </div>
                  <Switch checked={requireDeposit} onCheckedChange={setRequireDeposit} />
                </div>

                {requireDeposit && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-border/40 bg-muted/20">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Formato do Sinal</Label>
                      <div className="grid grid-cols-2 gap-1 rounded-md border p-1 bg-background">
                        <button
                          type="button"
                          onClick={() => setDepositType('percentage')}
                          className={cn(
                            'text-xs py-1 rounded font-medium transition-all',
                            depositType === 'percentage' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                          )}
                        >
                          Porcentagem (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepositType('fixed')}
                          className={cn(
                            'text-xs py-1 rounded font-medium transition-all',
                            depositType === 'fixed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                          )}
                        >
                          Valor Fixo (R$)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {depositType === 'percentage' ? 'Percentual do Pacote (%)' : 'Valor do Sinal (R$)'}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max={depositType === 'percentage' ? 100 : undefined}
                        value={depositValue}
                        onChange={(e) => setDepositValue(Number(e.target.value))}
                        className="h-9 text-xs"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ATIVO / INATIVO */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Link Ativo</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Desative temporariamente para fechar a agenda para novos clientes sem excluir o link.
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="ghost" size="sm" onClick={() => setViewMode('list')}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : editingLink ? 'Salvar Alterações' : 'Criar Link'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {viewMode === 'list' && (
          <div className="flex justify-end pt-3 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
