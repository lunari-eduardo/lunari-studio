import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomTheme, EmailTemplate, DiscountPreset, ThemeType, GlobalSettings } from '@/types/gallery';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface UseGallerySettingsMutationsParams {
  userId?: string;
  settings?: GlobalSettings;
}

export function useGallerySettingsMutations({ userId, settings }: UseGallerySettingsMutationsParams) {
  const queryClient = useQueryClient();

  // Save or update single custom theme
  const saveCustomTheme = useMutation({
    mutationFn: async (theme: Omit<CustomTheme, 'id'> & { id?: string }) => {
      if (!userId) throw new Error('User not authenticated');

      if (theme.id) {
        const { error } = await supabase
          .from('gallery_themes')
          .update({
            name: theme.name,
            background_mode: theme.backgroundMode,
            primary_color: theme.primaryColor,
            accent_color: theme.accentColor,
            emphasis_color: theme.emphasisColor,
          })
          .eq('id', theme.id)
          .eq('user_id', userId);

        if (error) throw error;

        await supabase
          .from('gallery_settings')
          .update({ 
            theme_type: 'custom',
            active_theme_id: theme.id 
          })
          .eq('user_id', userId);
      } else {
        const { data, error } = await supabase
          .from('gallery_themes')
          .upsert({
            user_id: userId,
            name: theme.name,
            background_mode: theme.backgroundMode,
            primary_color: theme.primaryColor,
            accent_color: theme.accentColor,
            emphasis_color: theme.emphasisColor,
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (error) throw error;

        await supabase
          .from('gallery_settings')
          .update({ 
            theme_type: 'custom',
            active_theme_id: data.id 
          })
          .eq('user_id', userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-settings', userId] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar tema');
      console.error('Save theme error:', error);
    },
  });

  // Delete custom theme (revert to system)
  const deleteCustomTheme = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      const { error: deleteError } = await supabase
        .from('gallery_themes')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('gallery_settings')
        .update({ 
          theme_type: 'system',
          active_theme_id: null 
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-settings', userId] });
    },
    onError: (error) => {
      toast.error('Erro ao remover tema');
      console.error('Delete theme error:', error);
    },
  });

  // Set theme type (system or custom)
  const setThemeType = useMutation({
    mutationFn: async (themeType: ThemeType) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('gallery_settings')
        .upsert({
          user_id: userId,
          theme_type: themeType,
          active_theme_id: themeType === 'system' ? null : settings?.customTheme?.id || null,
        }, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-settings', userId] });
    },
    onError: (error) => {
      toast.error('Erro ao alterar tipo de tema');
      console.error('Set theme type error:', error);
    },
  });

  // Email template mutations
  const updateEmailTemplate = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('gallery_email_templates')
        .update({
          name: template.name,
          subject: template.subject,
          body: template.body,
        })
        .eq('id', template.id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-settings', userId] });
    },
    onError: (error) => {
      console.error('Email template update error:', error);
    },
  });

  // Discount preset mutations
  const createDiscountPreset = useMutation({
    mutationFn: async (preset: Omit<DiscountPreset, 'id' | 'createdAt'>) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase.from('gallery_discount_presets').insert({
        user_id: userId,
        name: preset.name,
        packages: preset.packages as unknown as Json,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-settings', userId] });
    },
  });

  const updateDiscountPreset = useMutation({
    mutationFn: async (preset: DiscountPreset) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('gallery_discount_presets')
        .update({
          name: preset.name,
          packages: preset.packages as unknown as Json,
        })
        .eq('id', preset.id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-settings', userId] });
    },
  });

  const deleteDiscountPreset = useMutation({
    mutationFn: async (presetId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('gallery_discount_presets')
        .delete()
        .eq('id', presetId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-settings', userId] });
    },
  });

  return {
    saveCustomTheme: (theme: Omit<CustomTheme, 'id'> & { id?: string }) => saveCustomTheme.mutate(theme, {
      onSuccess: () => toast.success('Tema salvo com sucesso.'),
    }),
    deleteCustomTheme: () => deleteCustomTheme.mutate(undefined, {
      onSuccess: () => toast.success('Tema do sistema restaurado.'),
    }),
    setThemeType: (themeType: ThemeType) => setThemeType.mutate(themeType, {
      onSuccess: () => toast.success('Tema atualizado.'),
    }),
    updateEmailTemplate: updateEmailTemplate.mutateAsync,
    isUpdatingEmailTemplate: updateEmailTemplate.isPending,
    createDiscountPreset: createDiscountPreset.mutate,
    updateDiscountPreset: updateDiscountPreset.mutate,
    deleteDiscountPreset: deleteDiscountPreset.mutate,
  };
}
