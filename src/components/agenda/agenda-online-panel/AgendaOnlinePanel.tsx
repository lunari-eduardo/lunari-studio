import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgendaOnlinePanel, slugify } from './useAgendaOnlinePanel';
import { AgendaCoverUploader } from './AgendaCoverUploader';
import { AgendaLinkPreview } from './AgendaLinkPreview';
import { useSlugAvailability } from '@/hooks/useSlugAvailability';
import {
  Globe, Plus, Copy, ExternalLink, Edit, Trash2, ArrowLeft, Share2, Clock,
  Image as ImageIcon, Calendar, Eye, Smartphone, Monitor,
  Check, X, Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/utils/financialUtils';
import { ProviderSelector } from '@/components/cobranca/ProviderSelector';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AgendaOnlinePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgendaOnlinePanel({ isOpen, onClose }: AgendaOnlinePanelProps) {
  const p = useAgendaOnlinePanel(onClose);
  const { user } = useAuth();
  const [previewViewport, setPreviewViewport] = useState<'mobile' | 'desktop'>('mobile');

  // Buscar dados do fotógrafo para o preview (logo + nome estúdio)
  const { data: profile } = useQuery({
    queryKey: ['agenda-online-preview-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('empresa, logo_url, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Validação de unicidade do slug em tempo real
  const { data: slugStatus, isFetching: slugValidating } = useSlugAvailability(
    p.slug,
    p.editingLink?.id
  );

  const previewPackages = p.selectedPackageIds
    .map((id) => p.availablePackages.find((pkg) => pkg.id === id))
    .filter(Boolean) as Array<{ id: string; nome: string; valor_base: number; fotos_incluidas?: number }>;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col h-full bg-background border-l overflow-hidden">
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

        <div className="flex-1 overflow-y-auto">
          {p.viewMode === 'list' ? (
            <div className="space-y-4 p-6">
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
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold truncate">{link.title}</h4>
                            <Badge variant={link.is_active ? "default" : "secondary"} className="text-[10px] uppercase">
                              {link.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {link.cover_image_url && (
                              <Badge variant="outline" className="text-[10px] uppercase gap-1">
                                <ImageIcon className="w-2.5 h-2.5" />
                                Com capa
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
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
            <form id="agenda-online-form" onSubmit={p.handleSubmit}>
              <Tabs defaultValue="apresentacao" className="w-full">
                <div className="px-6 pt-4 sticky top-0 bg-background z-10 border-b">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="apresentacao" className="gap-1.5 text-xs">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Apresentação
                    </TabsTrigger>
                    <TabsTrigger value="agendamento" className="gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      Agendamento
                    </TabsTrigger>
                    <TabsTrigger value="link" className="gap-1.5 text-xs">
                      <Share2 className="w-3.5 h-3.5" />
                      Link
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* SEÇÃO 1 — APRESENTAÇÃO */}
                <TabsContent value="apresentacao" className="m-0 p-6 space-y-6">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold">Como sua página aparece para o cliente</h3>
                    <p className="text-xs text-muted-foreground">
                      A capa é a primeira impressão — escolha uma imagem que represente a experiência.
                    </p>
                  </div>

                  <AgendaCoverUploader
                    linkId={p.editingLink?.id}
                    currentUrl={p.coverImageUrl}
                    currentPosition={p.coverImagePosition}
                    currentLqip={p.coverImageLqip}
                    onChange={(data) => {
                      p.setCoverImageUrl(data.url);
                      p.setCoverImagePosition(data.position);
                      p.setCoverImageLqip(data.lqip);
                    }}
                    onRemove={() => {
                      p.setCoverImageUrl(null);
                      p.setCoverImagePosition('50% 50%');
                      p.setCoverImageLqip(null);
                    }}
                  />

                  <div className="space-y-2">
                    <Label>Título do Link <span className="text-destructive">*</span></Label>
                    <Input
                      value={p.title}
                      onChange={e => p.handleTitleChange(e.target.value)}
                      placeholder="Ex: Ensaios de Natal"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição (Opcional)</Label>
                    <Textarea
                      value={p.description}
                      onChange={e => p.setDescription(e.target.value)}
                      placeholder="Conte para o cliente o que ele pode esperar da experiência..."
                      className="resize-none"
                      rows={4}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Dica: seja específico sobre o que está incluso, tempo de duração e para quem é indicado.
                    </p>
                  </div>
                </TabsContent>

                {/* SEÇÃO 2 — AGENDAMENTO */}
                <TabsContent value="agendamento" className="m-0 p-6 space-y-6">
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
                      <p className="text-[10px] text-muted-foreground">Quais horários exibir?</p>
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
                      <div className="flex items-center justify-between pb-2 border-b border-border/50">
                        <div className="space-y-0.5">
                          <Label htmlFor="show-package-price" className="text-sm font-medium cursor-pointer">Exibir valor dos pacotes</Label>
                          <p className="text-[11px] text-muted-foreground">Mostra os preços dos pacotes na página pública.</p>
                        </div>
                        <Switch
                          id="show-package-price"
                          checked={p.showPackagePrice}
                          onCheckedChange={p.setShowPackagePrice}
                        />
                      </div>
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
                        <p className="text-xs text-muted-foreground">Cliente paga o sinal para confirmar.</p>
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
                            O cliente é direcionado para pagar o sinal via este gateway.
                          </p>
                        </div>

                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200 text-xs">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-semibold text-amber-900 dark:text-amber-300">Reserva temporária de 10 minutos</p>
                            <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed text-[11px]">
                              Ao exigir sinal, o horário fica pré-reservado por <strong>10 minutos</strong>. Se o sinal não for pago nesse prazo, o agendamento é cancelado e o horário volta a ficar disponível.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* SEÇÃO 3 — LINK */}
                <TabsContent value="link" className="m-0 p-6 space-y-6">
                  <div className="space-y-2">
                    <Label>URL (Slug) <span className="text-destructive">*</span></Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md border border-r-0 rounded-r-none shrink-0">
                        /book/
                      </span>
                      <div className="relative flex-1">
                        <Input
                          value={p.slug}
                          onChange={e => p.setSlug(slugify(e.target.value))}
                          className="rounded-l-none pr-9"
                          placeholder="ensaios-natal"
                        />
                        {slugValidating ? (
                          <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                        ) : slugStatus?.available ? (
                          <Check className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-green-600" />
                        ) : slugStatus?.available === false ? (
                          <X className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-destructive" />
                        ) : null}
                      </div>
                    </div>
                    {slugStatus?.available === false && slugStatus.reason === 'em-uso' && (
                      <p className="text-[11px] text-destructive">
                        Esta URL já está em uso por outro link. Escolha outra.
                      </p>
                    )}
                    {slugStatus?.available === false && slugStatus.reason === 'muito-curto' && (
                      <p className="text-[11px] text-muted-foreground">
                        Use pelo menos 3 caracteres.
                      </p>
                    )}
                    {slugStatus?.available && p.slug.length >= 3 && (
                      <p className="text-[11px] text-green-700 dark:text-green-400">
                        URL disponível — você pode personalizar a qualquer momento.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 py-2">
                    <Switch id="is-active" checked={p.isActive} onCheckedChange={p.setIsActive} />
                    <Label htmlFor="is-active" className="cursor-pointer">Link Ativo (visível para clientes)</Label>
                  </div>

                  {/* Preview */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-semibold">Preview</h4>
                      </div>
                      <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => setPreviewViewport('mobile')}
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors',
                            previewViewport === 'mobile' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                          )}
                        >
                          <Smartphone className="w-3 h-3" />
                          Mobile
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewViewport('desktop')}
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors',
                            previewViewport === 'desktop' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                          )}
                        >
                          <Monitor className="w-3 h-3" />
                          Desktop
                        </button>
                      </div>
                    </div>

                    <div className="bg-neutral-100 rounded-xl p-4 flex items-center justify-center min-h-[400px]">
                      <AgendaLinkPreview
                        title={p.title || 'Título do seu link'}
                        description={p.description}
                        studioName={profile?.empresa || undefined}
                        logoUrl={profile?.logo_url}
                        avatarUrl={profile?.avatar_url}
                        coverUrl={p.coverImageUrl}
                        coverPosition={p.coverImagePosition}
                        packages={previewPackages}
                        showPackagePrice={p.showPackagePrice}
                        viewport={previewViewport}
                      />
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center">
                      O preview é uma representação proporcional. A página real respeita a identidade visual completa.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
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
