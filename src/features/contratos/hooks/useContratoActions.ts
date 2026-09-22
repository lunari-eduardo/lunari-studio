import { useState, useCallback } from 'react';
import { useContratoTemplates } from '@/hooks/useContratoTemplates';
import { toast } from '@/hooks/use-toast';
import type { ContratoTemplate } from '@/types/contrato';
import type { ContratoSeedTemplate } from '@/utils/contratoSeedTemplates';

export function useContratoActions() {
  const { create, update, remove } = useContratoTemplates();
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isSettingPadrao, setIsSettingPadrao] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingSeed, setIsAddingSeed] = useState(false);

  const duplicateTemplate = useCallback(
    async (template: ContratoTemplate) => {
      setIsDuplicating(true);
      try {
        await create({
          nome: `${template.nome} (cópia)`,
          descricao: template.descricao || null,
          categoria: template.categoria || 'geral',
          conteudo: template.conteudo,
          is_padrao: false,
        });
        toast({ title: 'Modelo duplicado com sucesso!' });
      } catch (err: any) {
        toast({
          title: 'Erro ao duplicar modelo',
          description: err.message,
          variant: 'destructive',
        });
      } finally {
        setIsDuplicating(false);
      }
    },
    [create]
  );

  const setAsPadrao = useCallback(
    async (template: ContratoTemplate) => {
      setIsSettingPadrao(true);
      try {
        await update({
          id: template.id,
          is_padrao: true,
        });
        toast({ title: `"${template.nome}" agora é o modelo padrão!` });
      } catch (err: any) {
        toast({
          title: 'Erro ao definir padrão',
          description: err.message,
          variant: 'destructive',
        });
      } finally {
        setIsSettingPadrao(false);
      }
    },
    [update]
  );

  const deleteTemplate = useCallback(
    async (id: string, nome?: string) => {
      setIsDeleting(true);
      try {
        await remove(id);
        toast({ title: nome ? `"${nome}" foi removido.` : 'Modelo removido com sucesso.' });
      } catch (err: any) {
        toast({
          title: 'Erro ao remover modelo',
          description: err.message,
          variant: 'destructive',
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [remove]
  );

  const useSeed = useCallback(
    async (seed: ContratoSeedTemplate) => {
      setIsAddingSeed(true);
      try {
        const created = await create({
          nome: seed.nome,
          descricao: seed.descricao,
          categoria: seed.categoria,
          conteudo: seed.conteudo,
          is_padrao: false,
        });
        toast({
          title: 'Modelo adicionado!',
          description: `"${seed.nome.replace('Contrato — ', '')}" agora está nos seus modelos.`,
        });
        return created;
      } catch (err: any) {
        toast({
          title: 'Erro ao adicionar modelo',
          description: err.message,
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsAddingSeed(false);
      }
    },
    [create]
  );

  return {
    duplicateTemplate,
    setAsPadrao,
    deleteTemplate,
    useSeed,
    isDuplicating,
    isSettingPadrao,
    isDeleting,
    isAddingSeed,
  };
}
