/**
 * FormEditorSectionExperience — seção "Experiência" do editor.
 *
 * Persistimos apenas o que o schema suporta:
 *  - `mensagem_conclusao` (existe em `formularios`).
 *
 * Não implementamos (e não fingimos): mensagem inicial, "mostrar progresso",
 * "permitir voltar". Esses toggles não existem no schema e o formulário
 * público não os respeita. Regra 32 do brief: sem funcionalidades mockadas.
 */
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Formulario } from '@/types/formulario';

interface Props {
  draft: Formulario;
  onChange: (updates: Partial<Formulario>) => void;
}

export function FormEditorSectionExperience({ draft, onChange }: Props) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">Experiência</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Como o cliente se sentirá ao preencher este formulário.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-conclusao">Mensagem final</Label>
        <Textarea
          id="f-conclusao"
          value={draft.mensagem_conclusao}
          onChange={(e) => onChange({ mensagem_conclusao: e.target.value })}
          placeholder="Ex: Obrigada por compartilhar essas informações. Estamos ansiosos para preparar seu ensaio."
          rows={4}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          Exibida após o cliente enviar as respostas.
        </p>
      </div>
    </div>
  );
}
