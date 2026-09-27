import { GlobalSettings, CustomTheme, EmailTemplate, WatermarkSettings, ThemeType } from '@/types/gallery';
import { Json } from '@/integrations/supabase/types';

export const defaultSettings: Omit<GlobalSettings, 'customTheme' | 'emailTemplates' | 'discountPresets'> = {
  defaultGalleryPermission: 'private',
  clientTheme: 'system',
  defaultExpirationDays: 10,
  studioName: 'Meu Estúdio',
  studioLogo: undefined,
  themeType: 'system',
  activeThemeId: undefined,
  defaultWatermark: {
    type: 'standard',
    opacity: 40,
    position: 'center',
  },
  faviconUrl: undefined,
  defaultSaleMode: 'sale_without_payment',
  defaultImageResize: 1920,
  defaultChargeType: 'only_extras',
  defaultPricingModel: 'fixed',
  defaultPaymentMethod: undefined,
  defaultAllowComments: true,
  defaultAllowDownload: false,
  defaultAllowExtraPhotos: true,
  defaultWatermarkDisplay: 'all',
  emailSendingEnabled: false,
  emailOnGallerySent: false,
  emailOnGalleryReactivated: false,
  emailOnPaymentConfirmed: false,
  emailOnSelectionReminder: false,
  emailOnSelectionConfirmed: false,
  emailSummaryToPhotographer: true,
  reminderDaysBeforeExpiration: 2,
  defaultPhotoSpacing: 6,
  defaultThemeId: 'lunari',
  themeOverrides: {},
  defaultCoverId: 'fullscreen',
};

export const defaultEmailTemplates: Omit<EmailTemplate, 'id'>[] = [
  {
    name: 'Galeria Enviada',
    type: 'gallery_sent',
    subject: 'Suas fotos estão prontas! - {galeria}',
    body: 'Olá {cliente}!\n\nSuas fotos da sessão "{galeria}" estão prontas para visualização.\n\nAcesse o link abaixo para ver suas fotos e fazer sua seleção:\n{link}\n\nVocê tem até {prazo} para fazer sua seleção.\n\nCom carinho,\n{estudio}',
  },
  {
    name: 'Lembrete de Prazo',
    type: 'selection_reminder',
    subject: 'Lembrete: Sua seleção expira em breve - {galeria}',
    body: 'Olá {cliente}!\n\nEste é um lembrete amigável de que sua seleção da galeria "{galeria}" expira em {dias_restantes} dias.\n\nNão perca o prazo! Acesse o link abaixo:\n{link}\n\nCom carinho,\n{estudio}',
  },
  {
    name: 'Seleção Confirmada',
    type: 'selection_confirmed',
    subject: 'Seleção confirmada! - {galeria}',
    body: 'Olá {cliente}!\n\nSua seleção da galeria "{galeria}" foi confirmada com sucesso!\n\nTotal de fotos selecionadas: {total_fotos}\nFotos extras: {fotos_extras}\nValor adicional: {valor_extra}\n\nEm breve entraremos em contato com mais informações.\n\nCom carinho,\n{estudio}',
  },
  {
    name: 'Galeria Reativada',
    type: 'gallery_reactivated',
    subject: 'Sua galeria foi reaberta - {galeria}',
    body: 'Olá {cliente}!\n\nBoas notícias: a galeria "{galeria}" foi reaberta para você concluir sua seleção de fotos.\n\nVocê tem até {prazo} para escolher suas favoritas.\n\nAcesse: {link}\n\nCom carinho,\n{estudio}',
  },
  {
    name: 'Confirmação de Pagamento',
    type: 'payment_confirmed',
    subject: 'Pagamento confirmado! - {galeria}',
    body: 'Olá {cliente}!\n\nRecebemos a confirmação do seu pagamento referente à galeria "{galeria}".\n\nEm breve entraremos em contato com os próximos passos.\n\nAcesse sua galeria: {link}\n\nCom carinho,\n{estudio}',
  },
];

export function parseWatermark(json: Json | null): WatermarkSettings {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return defaultSettings.defaultWatermark;
  }
  const obj = json as Record<string, unknown>;
  let type = (obj.type as WatermarkSettings['type']) || 'standard';
  if (type !== 'none' && type !== 'standard' && type !== 'custom') {
    type = 'standard';
  }
  
  return {
    type,
    opacity: (obj.opacity as number) || 40,
    position: 'center',
    customHorizontalUrl: obj.customHorizontalUrl as string | undefined,
    customVerticalUrl: obj.customVerticalUrl as string | undefined,
  };
}

export function rowsToSettings(
  settingsRow: any | null,
  theme: any | null,
  emailTemplates: any[],
  discountPresets: any[],
  hasEmailEntitlement: boolean = true
): GlobalSettings {
  const baseSettings = settingsRow ? {
    defaultGalleryPermission: (settingsRow.default_gallery_permission as 'public' | 'private') ?? 'private',
    clientTheme: (settingsRow.client_theme as 'light' | 'dark' | 'system') ?? 'system',
    defaultExpirationDays: settingsRow.default_expiration_days ?? 10,
    studioName: settingsRow.studio_name ?? 'Meu Estúdio',
    studioLogo: settingsRow.studio_logo_url || undefined,
    themeType: (settingsRow.theme_type as ThemeType) ?? 'system',
    activeThemeId: settingsRow.active_theme_id || undefined,
    defaultWatermark: parseWatermark(settingsRow.default_watermark),
    faviconUrl: settingsRow.favicon_url || undefined,
    lastSessionFont: settingsRow.last_session_font || undefined,
    defaultWelcomeMessage: settingsRow.default_welcome_message || undefined,
    welcomeMessageEnabled: settingsRow.welcome_message_enabled ?? true,
    defaultSaleMode: (settingsRow.default_sale_mode as GlobalSettings['defaultSaleMode']) ?? 'sale_without_payment',
    defaultImageResize: (settingsRow.default_image_resize as GlobalSettings['defaultImageResize']) ?? 1920,
    defaultChargeType: (settingsRow.default_charge_type as GlobalSettings['defaultChargeType']) ?? 'only_extras',
    defaultPricingModel: (settingsRow.default_pricing_model as GlobalSettings['defaultPricingModel']) ?? 'fixed',
    defaultPaymentMethod: (settingsRow.default_payment_method as GlobalSettings['defaultPaymentMethod']) ?? undefined,
    defaultAllowComments: settingsRow.default_allow_comments ?? true,
    defaultAllowDownload: settingsRow.default_allow_download ?? false,
    defaultAllowExtraPhotos: settingsRow.default_allow_extra_photos ?? true,
    defaultWatermarkDisplay: (settingsRow.default_watermark_display as GlobalSettings['defaultWatermarkDisplay']) ?? 'all',
    emailSendingEnabled: hasEmailEntitlement ? (settingsRow.email_sending_enabled ?? false) : false,
    emailOnGallerySent: hasEmailEntitlement ? (settingsRow.email_on_gallery_sent ?? false) : false,
    emailOnGalleryReactivated: hasEmailEntitlement ? (settingsRow.email_on_gallery_reactivated ?? false) : false,
    emailOnPaymentConfirmed: hasEmailEntitlement ? (settingsRow.email_on_payment_confirmed ?? false) : false,
    emailOnSelectionReminder: hasEmailEntitlement ? (settingsRow.email_on_selection_reminder ?? false) : false,
    emailOnSelectionConfirmed: hasEmailEntitlement ? (settingsRow.email_on_selection_confirmed ?? false) : false,
    emailSummaryToPhotographer: settingsRow.email_summary_to_photographer ?? true,
    reminderDaysBeforeExpiration: settingsRow.reminder_days_before_expiration ?? 2,
    defaultPhotoSpacing: settingsRow.default_photo_spacing ?? 8,
    defaultThemeId: settingsRow.default_theme_id ?? 'lunari',
    themeOverrides: settingsRow.theme_overrides || {},
    defaultCoverId: settingsRow.default_cover_id ?? 'fullscreen',
  } : defaultSettings;

  const customTheme: CustomTheme | undefined = theme ? {
    id: theme.id,
    name: theme.name,
    backgroundMode: (theme.background_mode as 'light' | 'dark') || 'light',
    primaryColor: theme.primary_color,
    accentColor: theme.accent_color,
    emphasisColor: theme.emphasis_color,
  } : undefined;

  return {
    ...baseSettings,
    customTheme,
    emailTemplates: emailTemplates.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type as EmailTemplate['type'],
      subject: e.subject,
      body: e.body,
    })),
    discountPresets: discountPresets.map(d => ({
      id: d.id,
      name: d.name,
      packages: Array.isArray(d.packages) ? d.packages : [],
      createdAt: new Date(d.created_at),
    })),
  };
}
