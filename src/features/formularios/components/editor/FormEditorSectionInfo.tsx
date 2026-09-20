/**
 * FormEditorSectionInfo — seção "Informações" do editor.
 *
 * Campos persistidos (schema atual):
 *  - titulo (obrigatório para publicar)
 *  - titulo_cliente (opcional, o que o cliente vê)
 *  - descricao
 *  - tempo_estimado (mostrado, mas backend já trata; aqui exibimos como
 *    informativo se o usuário quiser ajustar manualmente)
 *
 * Não persistido nesta etapa: categoria (vide regra 18 do brief). O schema
 * atual de `formularios` não tem coluna de categoria; a categoria existe apenas
 * em `formulario_templates`. Mantemos um campo de categoria desabilitado com
 * nota honesta em vez de fingir suporte.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock } from 'lucide-react';
import type { Formulario } from '@/types/formulario';

interface Props {
  draft: Formulario;
  onChange: (updates: Partial<Formulario>) => void;
}

export function FormEditorSectionInfo({ draft, onChange }: Props) {
  return (
    <div className="h-full min-h-0 overflow-y-auto pr-1 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">Informações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Como o formulário será identificado internamente e o que o cliente verá
          antes de responder.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-titulo">
          Nome <span className="text-destructive">*</span>
        </Label>
        <Input
          id="f-titulo"
          value={draft.titulo}
          onChange={(e) => onChange({ titulo: e.target.value })}
          placeholder="Ex: Ensaio Gestante"
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground">
          Usado internamente para identificar o formulário.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-titulo-cliente">Título para o cliente</Label>
        <Input
          id="f-titulo-cliente"
          value={draft.titulo_cliente ?? ''}
          onChange={(e) =>
            onChange({ titulo_cliente: e.target.value || null })
          }
          placeholder="Se vazio, mostraremos o nome acima"
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground">
          O que o cliente verá no topo do formulário público. Opcional.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-descricao">Descrição</Label>
        <Textarea
          id="f-descricao"
          value={draft.descricao ?? ''}
          onChange={(e) => onChange({ descricao: e.target.value || null })}
          placeholder="Ex: Um formulário para conhecer as expectativas e preferências da cliente antes do ensaio."
          rows={4}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-tempo" className="flex items-center gap-1.5">
          <Clock size={12} aria-hidden /> Tempo estimado
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="f-tempo"
            type="number"
            min={1}
            max={60}
            value={draft.tempo_estimado}
            onChange={(e) =>
              onChange({ tempo_estimado: Math.max(1, Number(e.target.value) || 1) })
            }
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">minutos</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Apenas informativo — exibido ao cliente como referência de duração.
        </p>
      </div>
    </div>
  );
}
