import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { GlobalSettings, CustomTheme, EmailTemplate, DiscountPreset, ThemeType } from '@/types/gallery';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

import { defaultSettings, defaultEmailTemplates, rowsToSettings } from './gallery-settings/defaultSettings';
import { useGallerySettingsMutations } from './gallery-settings/useGallerySettingsMutations';

export interface UpdateSettingsOptions {
  successMessage?: string;
}

export function useGallerySettings() {
  const { user } = useAuth();
  const { hasEntitlement } = useEntitlements();
  const queryClient = useQueryClient();

  // Query to fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['gallery-settings', user?.id],
    queryFn: async (): Promise<GlobalSettings> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check entitlement for email sending
      const hasEmailEntitlement = hasEntitlement('email_automations');

      // Fetch all required data in parallel
      const [
        settingsResult,
        themeResult,
        emailTemplatesResult,
        discountPresetsResult,
      ] = await Promise.all([
        supabase
          .from('gallery_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('gallery_themes')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('gallery_email_templates')
          .select('*')
          .eq('user_id', user.id)
          .order('name'),
        supabase
          .from('gallery_discount_presets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at'),
      ]);

      if (settingsResult.error) throw settingsResult.error;
      if (themeResult.error) throw themeResult.error;
      if (emailTemplatesResult.error) throw emailTemplatesResult.error;
      if (discountPresetsResult.error) throw discountPresetsResult.error;

      // If user has no settings, return defaults (don't auto-create until needed)
      if (!settingsResult.data) {
        return {
          ...defaultSettings,
          emailTemplates: defaultEmailTemplates.map((t, i) => ({ ...t, id: `default-${i}` })),
          discountPresets: [],
        };
      }

      return rowsToSettings(
        settingsResult.data,
        themeResult.data,
        emailTemplatesResult.data || [],
        discountPresetsResult.data || [],
        hasEmailEntitlement
      );
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation to initialize settings for a new user
  const initializeSettings = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // 1. Create gallery_settings
      const { error: settingsError } = await supabase
        .from('gallery_settings')
        .insert({
          user_id: user.id,
          default_gallery_permission: defaultSettings.defaultGalleryPermission,
          client_theme: defaultSettings.clientTheme,
          default_expiration_days: defaultSettings.defaultExpirationDays,
          studio_name: defaultSettings.studioName,
          theme_type: 'system',
          default_watermark: defaultSettings.defaultWatermark as unknown as Json,
          default_sale_mode: defaultSettings.defaultSaleMode,
          default_image_resize: defaultSettings.defaultImageResize,
          default_charge_type: defaultSettings.defaultChargeType,
          default_pricing_model: defaultSettings.defaultPricingModel,
          default_allow_comments: defaultSettings.defaultAllowComments,
          default_allow_download: defaultSettings.defaultAllowDownload,
          default_allow_extra_photos: defaultSettings.defaultAllowExtraPhotos,
          default_watermark_display: defaultSettings.defaultWatermarkDisplay,
          email_sending_enabled: defaultSettings.emailSendingEnabled,
          email_on_gallery_sent: defaultSettings.emailOnGallerySent,
          email_on_gallery_reactivated: defaultSettings.emailOnGalleryReactivated,
          email_on_payment_confirmed: defaultSettings.emailOnPaymentConfirmed,
          email_on_selection_reminder: defaultSettings.emailOnSelectionReminder,
          email_on_selection_confirmed: defaultSettings.emailOnSelectionConfirmed,
          email_summary_to_photographer: defaultSettings.emailSummaryToPhotographer,
          reminder_days_before_expiration: defaultSettings.reminderDaysBeforeExpiration,
          default_photo_spacing: defaultSettings.defaultPhotoSpacing,
          default_theme_id: defaultSettings.defaultThemeId,
          theme_overrides: defaultSettings.themeOverrides,
          default_cover_id: defaultSettings.defaultCoverId,
        });

      if (settingsError && settingsError.code !== '23505') { // Ignore unique constraint violation
        throw settingsError;
      }

      // 2. Create default email templates
      const templatesToInsert = defaultEmailTemplates.map(t => ({
        user_id: user.id,
        name: t.name,
        type: t.type,
        subject: t.subject,
        body: t.body,
      }));

      const { error: templatesError } = await supabase
        .from('gallery_email_templates')
        .insert(templatesToInsert);

      if (templatesError && templatesError.code !== '23505') {
        console.error('Error inserting default templates:', templatesError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-settings', user?.id] });
    },
  });

  // Mutation to update settings
  const updateSettings = useMutation({
    mutationFn: async (data: Partial<GlobalSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: existing } = await supabase
        .from('gallery_settings')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const updateData: Record<string, unknown> = {};
      
      if (data.studioName !== undefined) updateData.studio_name = data.studioName;
      if (data.studioLogo !== undefined) updateData.studio_logo_url = data.studioLogo || null;
      if (data.faviconUrl !== undefined) updateData.favicon_url = data.faviconUrl || null;
      if (data.defaultGalleryPermission !== undefined) updateData.default_gallery_permission = data.defaultGalleryPermission;
      if (data.clientTheme !== undefined) updateData.client_theme = data.clientTheme;
      if (data.defaultExpirationDays !== undefined) updateData.default_expiration_days = data.defaultExpirationDays;
      if (data.activeThemeId !== undefined) updateData.active_theme_id = data.activeThemeId || null;
      if (data.themeType !== undefined) updateData.theme_type = data.themeType;
      if (data.defaultWatermark !== undefined) updateData.default_watermark = data.defaultWatermark as unknown as Json;
      if (data.lastSessionFont !== undefined) updateData.last_session_font = data.lastSessionFont || null;
      if (data.defaultWelcomeMessage !== undefined) updateData.default_welcome_message = data.defaultWelcomeMessage || null;
      if (data.welcomeMessageEnabled !== undefined) updateData.welcome_message_enabled = data.welcomeMessageEnabled;
      if (data.defaultSaleMode !== undefined) updateData.default_sale_mode = data.defaultSaleMode;
      if (data.defaultImageResize !== undefined) updateData.default_image_resize = data.defaultImageResize;
      if (data.defaultChargeType !== undefined) updateData.default_charge_type = data.defaultChargeType;
      if (data.defaultPricingModel !== undefined) updateData.default_pricing_model = data.defaultPricingModel;
      if (data.defaultPaymentMethod !== undefined) updateData.default_payment_method = data.defaultPaymentMethod || null;
      if (data.defaultAllowComments !== undefined) updateData.default_allow_comments = data.defaultAllowComments;
      if (data.defaultAllowDownload !== undefined) updateData.default_allow_download = data.defaultAllowDownload;
      if (data.defaultAllowExtraPhotos !== undefined) updateData.default_allow_extra_photos = data.defaultAllowExtraPhotos;
      if (data.defaultWatermarkDisplay !== undefined) updateData.default_watermark_display = data.defaultWatermarkDisplay;
      if (data.emailSendingEnabled !== undefined) updateData.email_sending_enabled = data.emailSendingEnabled;
      if (data.emailOnGallerySent !== undefined) updateData.email_on_gallery_sent = data.emailOnGallerySent;
      if (data.emailOnGalleryReactivated !== undefined) updateData.email_on_gallery_reactivated = data.emailOnGalleryReactivated;
      if (data.emailOnPaymentConfirmed !== undefined) updateData.email_on_payment_confirmed = data.emailOnPaymentConfirmed;
      if (data.emailOnSelectionReminder !== undefined) updateData.email_on_selection_reminder = data.emailOnSelectionReminder;
      if (data.emailOnSelectionConfirmed !== undefined) updateData.email_on_selection_confirmed = data.emailOnSelectionConfirmed;
      if (data.emailSummaryToPhotographer !== undefined) updateData.email_summary_to_photographer = data.emailSummaryToPhotographer;
      if (data.reminderDaysBeforeExpiration !== undefined) updateData.reminder_days_before_expiration = data.reminderDaysBeforeExpiration;
      if (data.defaultPhotoSpacing !== undefined) updateData.default_photo_spacing = data.defaultPhotoSpacing;
      if (data.defaultThemeId !== undefined) updateData.default_theme_id = data.defaultThemeId;
      if (data.themeOverrides !== undefined) updateData.theme_overrides = data.themeOverrides;
      if (data.defaultCoverId !== undefined) updateData.default_cover_id = data.defaultCoverId || 'fullscreen';

      if (Object.keys(updateData).length > 0) {
        if (existing) {
          const { error } = await supabase
            .from('gallery_settings')
            .update(updateData as any)
            .eq('user_id', user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('gallery_settings')
            .insert({ user_id: user.id, ...updateData } as any);
          if (error) throw error;
        }
      }

      if (data.customTheme) {
        const t = data.customTheme;
        const { data: savedTheme, error: themeError } = await supabase
          .from('gallery_themes')
          .upsert({
            user_id: user.id,
            name: t.name || 'Custom',
            background_mode: t.backgroundMode || 'light',
            primary_color: t.primaryColor || '#C6A36A',
            accent_color: t.accentColor || t.primaryColor || '#B08F55',
            emphasis_color: t.emphasisColor || t.primaryColor || '#C6A36A',
          }, { onConflict: 'user_id' })
          .select('id')
          .single();
        if (themeError) throw themeError;

        if (savedTheme?.id) {
          await supabase
            .from('gallery_settings')
            .update({
              theme_type: 'custom',
              active_theme_id: savedTheme.id,
            })
            .eq('user_id', user.id);
        }
      }
    },
    onMutate: async (newData: Partial<GlobalSettings>) => {
      await queryClient.cancelQueries({ queryKey: ['gallery-settings', user?.id] });
      const previousSettings = queryClient.getQueryData<GlobalSettings>(['gallery-settings', user?.id]);

      if (previousSettings) {
        queryClient.setQueryData<GlobalSettings>(['gallery-settings', user?.id], {
          ...previousSettings,
          ...newData,
        });
      }

      return { previousSettings };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-settings', user?.id] });
    },
    onError: (error, _newData, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(['gallery-settings', user?.id], context.previousSettings);
      }
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar configurações');
      console.error('Settings update error:', error);
    },
  });

  const mutations = useGallerySettingsMutations({ userId: user?.id, settings });

  const updateSettingsWithFeedback = (data: Partial<GlobalSettings>, options?: UpdateSettingsOptions) => {
    updateSettings.mutate(data, {
      onSuccess: () => {
        if (options?.successMessage) toast.success(options.successMessage);
      },
    });
  };

  const updateSettingsAsync = async (data: Partial<GlobalSettings>, options?: UpdateSettingsOptions) => {
    await updateSettings.mutateAsync(data);
    if (options?.successMessage) toast.success(options.successMessage);
  };

  return {
    settings,
    isLoading,
    initializeSettings,
    updateSettings: updateSettingsWithFeedback,
    updateSettingsAsync,
    isUpdating: updateSettings.isPending,
    ...mutations,
  };
}
