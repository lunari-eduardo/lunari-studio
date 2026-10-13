import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMaterials } from '@/hooks/useMaterials';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useConfigurationContext } from '@/contexts/ConfigurationContext';
import { gestaoR2Upload } from '@/lib/gestaoR2Upload';
import { toast } from 'sonner';
import { Step, Categoria, DbTemplate, DbTemplatePreview } from '../types';
import { pacoteToProposalPackage } from '../../blocks/normalization';
import { pdfjs } from 'react-pdf';

/** Vitrine de modelos ativos (wizard de criação e "Trocar modelo" do editor dividem o cache). */
export function useProposalTemplates(enabled = true) {
  return useQuery({
    queryKey: ['proposal-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_templates')
        .select('id, template_id, name, description, tags, preview_html_path, thumbnail_url')
        .eq('is_active', true)
        .order('name'); // ordem estável na vitrine (sem ORDER BY a do banco não é garantida)

      if (error && error.code !== '42P01') {
        console.error('Erro ao buscar templates:', error);
      }
      return (data || []) as DbTemplate[];
    },
    enabled,
  });
}

/**
 * Carrega a composição real de um modelo sob demanda. A galeria continua leve e
 * a prévia usa os mesmos blocos que serão instanciados ao criar a proposta.
 */
export function useProposalTemplatePreview(templateId?: string, enabled = true) {
  return useQuery({
    queryKey: ['proposal-template-preview', templateId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('proposal_templates')
        .select('blocks_json, design_tokens')
        .eq('template_id', templateId!)
        .single();

      if (error) throw error;
      return data as DbTemplatePreview;
    },
    enabled: enabled && !!templateId,
    staleTime: 5 * 60_000,
  });
}

interface UseCreateMaterialWizardProps {
  isOpen: boolean;
  onClose: () => void;
  /** Permite reutilizar o fluxo de PDF fora do seletor de métodos. */
  initialCreationMethod?: 'db-template' | 'pdf';
}

export function useCreateMaterialWizard({ isOpen, onClose, initialCreationMethod = null }: UseCreateMaterialWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createMaterial } = useMaterials();
  const { profile } = useUserProfile();
  const { pacotes, produtos } = useConfigurationContext();

  // Wizard state
  const initialStep: Step = initialCreationMethod === 'pdf'
    ? 'pdf-upload'
    : initialCreationMethod === 'db-template'
      ? 'template-gallery'
      : 'method';
  const [step, setStep] = useState<Step>(initialStep);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [creationMethod, setCreationMethod] = useState<'db-template' | 'pdf' | null>(initialCreationMethod);
  const [selectedDbTemplate, setSelectedDbTemplate] = useState<DbTemplate | null>(null);

  // PDF Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // Busca categorias reais do usuário
  const { data: categorias = [], isLoading: isLoadingCategorias } = useQuery({
    queryKey: ['categorias-for-material', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome, cor')
        .eq('user_id', user.id)
        .order('nome');
      if (error) throw error;
      return (data || []) as Categoria[];
    },
    enabled: !!user?.id && isOpen,
  });

  // Busca templates do banco
  const { data: dbTemplates = [], isLoading: isLoadingDbTemplates } = useProposalTemplates(isOpen);

  const resetModal = () => {
    setStep(initialStep);
    setSelectedCategoria(null);
    setCustomTitle('');
    setCreationMethod(initialCreationMethod);
    setSelectedDbTemplate(null);
    setSelectedPdf(null);
    setIsUploadingPdf(false);
  };

  const handleCloseModal = () => {
    onClose();
    resetModal();
  };

  const resolvedTitle = customTitle.trim() || selectedCategoria?.nome || '';

  const handleCreate = async () => {
    if (!resolvedTitle || !creationMethod) return;

    let initialContent: any = undefined;

    if (creationMethod === 'db-template' && selectedDbTemplate) {
      // Variáveis dinâmicas: o modelo nasce com a assinatura do perfil e os
      // pacotes reais da categoria escolhida (sem pacotes → mantém os do modelo).
      const categoriaPacotes = pacotes.filter((p) => p.categoria_id === selectedCategoria?.id);
      createMaterial.mutate(
        {
          title: resolvedTitle,
          categoria_id: selectedCategoria?.id,
          template_id: selectedDbTemplate.template_id,
          vars: {
            photographerName: profile?.empresa || profile?.nome || undefined,
            packages: categoriaPacotes.map((p) => pacoteToProposalPackage(p, produtos)),
          },
        },
        {
          onSuccess: (data) => {
            handleCloseModal();
            navigate(`/app/comercial/construtor/${data.id}`);
          },
        }
      );
      return;
    } else if (creationMethod === 'pdf' && selectedPdf) {
      let initialCoverUrl: string | undefined = undefined;
      try {
        setIsUploadingPdf(true);

        // 1. Extração instantânea da capa (primeira página) no próprio navegador
        try {
          const arrayBuffer = await selectedPdf.arrayBuffer();
          const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport } as any).promise;
            const coverBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            if (coverBlob) {
              const coverFile = new File([coverBlob], `${Date.now()}-cover.jpg`, { type: 'image/jpeg' });
              const coverRes = await gestaoR2Upload({ file: coverFile, context: 'general' });
              initialCoverUrl = coverRes.url || `https://media.lunarihub.com/${coverRes.storagePath}`;
            }
          }
        } catch (coverErr) {
          console.warn('[useCreateMaterialWizard] Falha ao extrair capa do PDF:', coverErr);
        }

        // 2. Upload do arquivo PDF para o R2 (lunari-previews / media.lunarihub.com)
        const result = await gestaoR2Upload({ file: selectedPdf, context: 'proposals-pdf' });
        const pdfUrl = result.url || `https://media.lunarihub.com/${result.storagePath}`;
        initialContent = { type: 'pdf', url: pdfUrl };
      } catch (err) {
        console.error(err);
        toast.error('Erro ao fazer upload do PDF.');
        setIsUploadingPdf(false);
        return;
      } finally {
        setIsUploadingPdf(false);
      }

      createMaterial.mutate(
        {
          title: resolvedTitle,
          categoria_id: selectedCategoria?.id,
          initialContent,
          cover_image_url: initialCoverUrl,
        },
        {
          onSuccess: (data) => {
            handleCloseModal();
            navigate(`/app/comercial/construtor/${data.id}`);
          },
        }
      );
      return;
    }
  };

  return {
    step,
    setStep,
    selectedCategoria,
    setSelectedCategoria,
    customTitle,
    setCustomTitle,
    creationMethod,
    setCreationMethod,
    selectedDbTemplate,
    setSelectedDbTemplate,
    fileInputRef,
    selectedPdf,
    setSelectedPdf,
    isUploadingPdf,
    categorias,
    isLoadingCategorias,
    dbTemplates,
    isLoadingDbTemplates,
    resetModal,
    handleCloseModal,
    handleCreate,
    isPendingCreate: createMaterial.isPending,
  };
}
