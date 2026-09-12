import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Pencil, Clock, Crown, ArrowRight } from 'lucide-react';
import { GlobalSettings, EmailTemplate } from '@/types/gallery';
import { UpdateSettingsOptions } from '@/hooks/useGallerySettings';
import { useEntitlements } from '@/hooks/useEntitlements';
import { ProLockedBadge } from '@/components/access/ProLockedBadge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EmailTemplateModal } from './EmailTemplateModal';
import { toast } from 'sonner';

interface EmailAutomationSettingsProps {
  settings: GlobalSettings;
  updateSettings: (data: Partial<GlobalSettings>, options?: UpdateSettingsOptions) => void;
  templates?: EmailTemplate[];
  onTemplateSave?: (template: EmailTemplate) => Promise<void> | void;
  isSavingTemplate?: boolean;
}

export function EmailAutomationSettings({
  settings,
  updateSettings,
  templates = [],
  onTemplateSave,
  isSavingTemplate = false
}: EmailAutomationSettingsProps) {
  const navigate = useNavigate();
  const { hasEntitlement } = useEntitlements();
  const hasEmailEntitlement = hasEntitlement('email_automations');

  // Local state for immediate UI feedback
  const [localEmailSendingEnabled, setLocalEmailSendingEnabled] = useState(settings.emailSendingEnabled ?? false);
  const [localEmailOnGallerySent, setLocalEmailOnGallerySent] = useState(settings.emailOnGallerySent ?? false);
  const [localEmailOnSelectionReminder, setLocalEmailOnSelectionReminder] = useState(settings.emailOnSelectionReminder ?? false);
  const [localEmailOnSelectionConfirmed, setLocalEmailOnSelectionConfirmed] = useState(settings.emailOnSelectionConfirmed ?? false);
  const [localEmailOnGalleryReactivated, setLocalEmailOnGalleryReactivated] = useState(settings.emailOnGalleryReactivated ?? false);
  const [localEmailOnPaymentConfirmed, setLocalEmailOnPaymentConfirmed] = useState(settings.emailOnPaymentConfirmed ?? false);
  const [localEmailSummaryToPhotographer, setLocalEmailSummaryToPhotographer] = useState(settings.emailSummaryToPhotographer ?? true);
  const [localReminderDays, setLocalReminderDays] = useState(settings.reminderDaysBeforeExpiration ?? 2);

  // Sync local state when settings change from server (e.g., initial load or external update)
  useEffect(() => {
    setLocalEmailSendingEnabled(settings.emailSendingEnabled ?? false);
    setLocalEmailOnGallerySent(settings.emailOnGallerySent ?? false);
    setLocalEmailOnSelectionReminder(settings.emailOnSelectionReminder ?? false);
    setLocalEmailOnSelectionConfirmed(settings.emailOnSelectionConfirmed ?? false);
    setLocalEmailOnGalleryReactivated(settings.emailOnGalleryReactivated ?? false);
    setLocalEmailOnPaymentConfirmed(settings.emailOnPaymentConfirmed ?? false);
    setLocalEmailSummaryToPhotographer(settings.emailSummaryToPhotographer ?? true);
    setLocalReminderDays(settings.reminderDaysBeforeExpiration ?? 2);
  }, [
    settings.emailSendingEnabled,
    settings.emailOnGallerySent,
    settings.emailOnSelectionReminder,
    settings.emailOnSelectionConfirmed,
    settings.emailOnGalleryReactivated,
    settings.emailOnPaymentConfirmed,
    settings.emailSummaryToPhotographer,
    settings.reminderDaysBeforeExpiration
  ]);

  const enabled = hasEmailEntitlement ? localEmailSendingEnabled : false;
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const handleSaveTemplate = async (template: EmailTemplate) => {
    if (!onTemplateSave) return;
    try {
      await onTemplateSave(template);
      toast.success('Template salvo com sucesso.');
    } catch (error) {
      toast.error('Não foi possível salvar o template.');
      throw error;
    }
  };

  const getTemplate = (type: EmailTemplate['type']) => {
    return templates.find(t => t.type === type);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">E-mails Automáticos</h4>
            <ProLockedBadge entitlement="email_automations" />
          </div>
          <p className="text-sm text-muted-foreground">Gerencie todos os e-mails enviados pelo sistema.</p>
          <p className="text-xs text-muted-foreground">Remetente: contato@mail.lunarihub.com</p>
          <p className="text-xs text-muted-foreground">Respostas vão para o e-mail cadastrado do fotógrafo quando disponível.</p>
        </div>
      </div>

      {!hasEmailEntitlement && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg shrink-0 mt-0.5">
              <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1">
              <h5 className="font-semibold text-sm">Recurso exclusivo do Plano Studio</h5>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A automação e disparo de e-mails para clientes é exclusiva para assinantes Studio. Faça upgrade para automatizar notificações de envio, lembretes de prazo e confirmações de pagamento.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-sm self-start sm:self-auto"
            onClick={() => navigate('/escolher-plano')}
          >
            Fazer upgrade
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <Label className="text-base font-medium">Permitir envio de e-mails para o cliente</Label>
          <Switch
            checked={enabled}
            disabled={!hasEmailEntitlement}
            onCheckedChange={(checked) => {
              if (!hasEmailEntitlement) {
                toast.error('Automação de e-mails é um recurso exclusivo do Plano Studio.');
                return;
              }
              setLocalEmailSendingEnabled(checked);
              updateSettings({ emailSendingEnabled: checked }, { successMessage: 'Preferência salva.' });
            }}
          />
        </div>

        <div className="space-y-6">
          <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Para o Cliente</h5>
          
          <div className={cn('space-y-6', (!enabled || !hasEmailEntitlement) && 'opacity-50 pointer-events-none')}>
            {/* Envio inicial */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <Label className="text-sm font-medium">Envio inicial da galeria</Label>
                <p className="text-xs text-muted-foreground">Notifica o cliente quando você compartilha a galeria.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  disabled={!hasEmailEntitlement}
                  onClick={() => {
                    const t = getTemplate('gallery_sent');
                    if (t) setEditingTemplate(t);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Editar Texto
                </Button>
                <Switch
                  checked={hasEmailEntitlement ? localEmailOnGallerySent : false}
                  disabled={!hasEmailEntitlement}
                  onCheckedChange={(checked) => {
                    setLocalEmailOnGallerySent(checked);
                    updateSettings({ emailOnGallerySent: checked });
                  }}
                />
              </div>
            </div>

            {/* Lembrete de prazo */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <Label className="text-sm font-medium">Lembrete de prazo</Label>
                  <p className="text-xs text-muted-foreground">Avisa o cliente que o prazo de seleção está acabando.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={!hasEmailEntitlement}
                    onClick={() => {
                      const t = getTemplate('selection_reminder');
                      if (t) setEditingTemplate(t);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" /> Editar Texto
                  </Button>
                  <Switch
                    checked={hasEmailEntitlement ? localEmailOnSelectionReminder : false}
                    disabled={!hasEmailEntitlement}
                    onCheckedChange={(checked) => {
                      setLocalEmailOnSelectionReminder(checked);
                      updateSettings({ emailOnSelectionReminder: checked });
                    }}
                  />
                </div>
              </div>
              {hasEmailEntitlement && localEmailOnSelectionReminder && (
                <div className="flex items-center gap-2 pl-4 border-l-2 border-primary/20 ml-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Enviar lembrete</span>
                  <Input
                    type="number"
                    className="h-7 w-16 px-2 text-center text-xs"
                    min={1}
                    max={30}
                    value={localReminderDays}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 2;
                      setLocalReminderDays(days);
                      updateSettings({ reminderDaysBeforeExpiration: days });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">dias antes do vencimento.</span>
                </div>
              )}
            </div>

            {/* Seleção confirmada */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <Label className="text-sm font-medium">Seleção confirmada</Label>
                <p className="text-xs text-muted-foreground">Envia confirmação e recibo das fotos escolhidas ao cliente.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  disabled={!hasEmailEntitlement}
                  onClick={() => {
                    const t = getTemplate('selection_confirmed');
                    if (t) setEditingTemplate(t);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Editar Texto
                </Button>
                <Switch
                  checked={hasEmailEntitlement ? localEmailOnSelectionConfirmed : false}
                  disabled={!hasEmailEntitlement}
                  onCheckedChange={(checked) => {
                    setLocalEmailOnSelectionConfirmed(checked);
                    updateSettings({ emailOnSelectionConfirmed: checked });
                  }}
                />
              </div>
            </div>

            {/* Reativação */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <Label className="text-sm font-medium">Reativação de galeria</Label>
                <p className="text-xs text-muted-foreground">Avisa o cliente quando você reabre o prazo de seleção.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  disabled={!hasEmailEntitlement}
                  onClick={() => {
                    const t = getTemplate('gallery_reactivated');
                    if (t) setEditingTemplate(t);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Editar Texto
                </Button>
                <Switch
                  checked={hasEmailEntitlement ? localEmailOnGalleryReactivated : false}
                  disabled={!hasEmailEntitlement}
                  onCheckedChange={(checked) => {
                    setLocalEmailOnGalleryReactivated(checked);
                    updateSettings({ emailOnGalleryReactivated: checked });
                  }}
                />
              </div>
            </div>

            {/* Pagamento */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <Label className="text-sm font-medium">Confirmação de pagamento</Label>
                <p className="text-xs text-muted-foreground">Envia aviso automático quando o pagamento é confirmado.</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  disabled={!hasEmailEntitlement}
                  onClick={() => {
                    const t = getTemplate('payment_confirmed');
                    if (t) setEditingTemplate(t);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Editar Texto
                </Button>
                <Switch
                  checked={hasEmailEntitlement ? localEmailOnPaymentConfirmed : false}
                  disabled={!hasEmailEntitlement}
                  onCheckedChange={(checked) => {
                    setLocalEmailOnPaymentConfirmed(checked);
                    updateSettings({ emailOnPaymentConfirmed: checked });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-4 border-t border-border mt-6">
          <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Para o Fotógrafo</h5>
          
          {/* Resumo da Seleção */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <Label className="text-sm font-medium">Resumo de Seleção</Label>
              <p className="text-xs text-muted-foreground">Receba uma notificação no seu e-mail sempre que um cliente finalizar a seleção.</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={localEmailSummaryToPhotographer}
                onCheckedChange={(checked) => {
                  setLocalEmailSummaryToPhotographer(checked);
                  updateSettings({ emailSummaryToPhotographer: checked });
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <EmailTemplateModal
        open={editingTemplate !== null}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={editingTemplate}
        onSave={handleSaveTemplate}
        isSaving={isSavingTemplate}
      />
    </div>
  );
}
