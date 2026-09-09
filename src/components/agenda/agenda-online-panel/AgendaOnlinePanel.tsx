import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgendaOnlinePanel, slugify } from './useAgendaOnlinePanel';
import { Globe, Plus, Copy, ExternalLink, Edit, Trash2, Calendar, DollarSign, ArrowLeft, Share2, Clock } from 'lucide-react';
import { formatCurrency } from '@/utils/financialUtils';
import { ProviderSelector } from '@/components/cobranca/ProviderSelector';
import { cn } from '@/lib/utils';

interface AgendaOnlinePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgendaOnlinePanel({ isOpen, onClose }: AgendaOnlinePanelProps) {
  const p = useAgendaOnlinePanel(onClose);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l overflow-hidden">
        <div className="p-6 pb-4 border-b shrink-0">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                {p.viewMode === 'form' && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 mr-1 -ml-2" onClick={p.handleCloseForm}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Globe className="h-5 w-5 text-primary" />
                Agendamento Online
              </SheetTitle>
              {p.viewMode === 'list' && (
                <Button size="sm" onClick={() => p.handleOpenForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Link
                </Button>
              )}
            </div>
            <SheetDescription>
              {p.viewMode === 'list' 
                ? 'Gerencie os links públicos para seus clientes agendarem horários sozinhos.'
                : p.editingLink ? 'Editando link de agendamento' : 'Criando novo link de agendamento'}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {p.viewMode === 'list' ? (
            <div className="space-y-4">
              {p.isLoading ? (
                <div className="text-center py-8 text-muted-foreground animate-pulse">Carregando links...</div>
              ) : p.links.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                  <Globe className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">Nenhum link ativo</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-[250px] mx-auto">
                    Crie seu primeiro link para permitir que clientes agendem online.
                  </p>
                  <Button onClick={() => p.handleOpenForm()}>Criar Meu Primeiro Link</Button>
                </div>
              ) : (
                p.links.map((link) => {
                  const url = p.getFullUrl(link.slug);
                  const tipo = p.availabilityTypes.find(t => t.id === link.availability_type_id);
                  const categoria = p.categorias.find(c => c.id === link.categoria_id);
                  return (
                    <div key={link.id} className={cn("border rounded-lg p-4 bg-card transition-all shadow-sm", !link.is_active && "opacity-60")}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{link.title}</h4>
                            <Badge variant={link.is_active ? "default" : "secondary"} className="text-[10px] uppercase">
                              {link.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {tipo && (
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tipo.color }} />
                                {tipo.name}
                              </span>
                            )}
                            {categoria && <span>• {categoria.nome}</span>}
                          </div>
                        </div>
                        <Switch
                          checked={link.is_active}
                          onCheckedChange={() => p.toggleLinkActive(link.id, link.is_active)}
                          disabled={p.isSubmitting}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                        <div className="text-xs bg-muted/50 px-2 py-1.5 rounded truncate flex-1 font-mono text-muted-foreground border">
                          {url}
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => p.copyToClipboard(url)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => window.open(url, '_blank')}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 ml-1" onClick={() => p.handleOpenForm(link)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => p.handleDelete(link.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <form id="agenda-online-form" onSubmit={p.handleSubmit} className="space-y-6 pb-20">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título do Link <span className="text-destructive">*</span></Label>
                  <Input value={p.title} onChange={e => p.handleTitleChange(e.target.value)} placeholder="Ex: Ensaios de Natal" />
                </div>
                <div className="space-y-2">
                  <Label>URL (Slug) <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md border border-r-0 rounded-r-none">
                      /book/
                    </span>
                    <Input value={p.slug} onChange={e => p.setSlug(slugify(e.target.value))} className="rounded-l-none" placeholder="ensaios-natal" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição (Opcional)</Label>
                  <Textarea value={p.description} onChange={e => p.setDescription(e.target.value)} placeholder="Instruções para o cliente..." className="resize-none" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Disponibilidade <span className="text-destructive">*</span></Label>
                    <Select value={p.availabilityTypeId} onValueChange={p.setAvailabilityTypeId}>
                      <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      <SelectContent>
                        {p.onlineAvailabilityTypes.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                              {t.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">Quais horários exibir?</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria <span className="text-destructive">*</span></Label>
                    <Select value={p.categoriaId} onValueChange={(val) => { p.setCategoriaId(val); p.handleTogglePackage('CLEAR_ALL'); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {p.categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {p.categoriaId && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                    <Label>Pacotes Permitidos <span className="text-destructive">*</span></Label>
                    {p.availablePackages.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nenhum pacote nesta categoria.</p>
                    ) : (
                      <div className="space-y-2">
                        {p.availablePackages.map(pkg => (
                          <div key={pkg.id} className="flex items-center space-x-2">
                            <Checkbox id={`pkg-${pkg.id}`} checked={p.selectedPackageIds.includes(pkg.id)} onCheckedChange={() => p.handleTogglePackage(pkg.id)} />
                            <Label htmlFor={`pkg-${pkg.id}`} className="text-sm font-normal cursor-pointer leading-tight">
                              {pkg.nome} <span className="text-muted-foreground ml-1">({formatCurrency(pkg.valor_base || 0)})</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-4 p-4 border rounded-lg bg-card shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Exigir Sinal (Reserva)</Label>
                      <p className="text-xs text-muted-foreground">Cliente deve pagar o sinal via gateway para confirmar.</p>
                    </div>
                    <Switch checked={p.requireDeposit} onCheckedChange={p.setRequireDeposit} />
                  </div>
                  {p.requireDeposit && (
                    <div className="space-y-4 pt-3 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de Sinal</Label>
                          <Select value={p.depositType} onValueChange={(val: any) => p.setDepositType(val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                              <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Valor</Label>
                          <Input type="number" min="1" value={p.depositValue} onChange={e => p.setDepositValue(Number(e.target.value))} />
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Gateway de Pagamento
                        </Label>
                        <ProviderSelector
                          selectedProvider={p.depositGateway}
                          onSelect={p.setDepositGateway}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          O cliente será direcionado para pagar o sinal através deste gateway.
                        </p>
                      </div>

                      {/* Alerta de Liberação Automática em 10 Minutos */}
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200 text-xs">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-900 dark:text-amber-300">Reserva temporária de 10 minutos</p>
                          <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed text-[11px]">
                            Ao exigir sinal, o horário escolhido pelo cliente fica pré-reservado por <strong>10 minutos</strong> para a realização do pagamento. Se o sinal não for pago nesse prazo, o agendamento e a cobrança são automaticamente cancelados e o horário volta a ficar livre para outros clientes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 py-2">
                  <Switch id="is-active" checked={p.isActive} onCheckedChange={p.setIsActive} />
                  <Label htmlFor="is-active">Link Ativo (Visível para clientes)</Label>
                </div>
              </div>
            </form>
          )}
        </div>
        
        {p.viewMode === 'form' && (
          <div className="p-4 border-t bg-background shrink-0 flex justify-end gap-2">
            <Button variant="outline" onClick={p.handleCloseForm} disabled={p.isSubmitting}>Cancelar</Button>
            <Button type="submit" form="agenda-online-form" disabled={p.isSubmitting}>Salvar Link</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
