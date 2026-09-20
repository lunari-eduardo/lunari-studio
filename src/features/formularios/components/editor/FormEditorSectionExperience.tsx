/**
 * FormEditorSectionExperience — seção "Experiência" do editor.
 *
 * Configurações da experiência do cliente:
 *  - Capa personalizada (cover_url)
 *  - Mensagem final de conclusão (mensagem_conclusao)
 *  - Prazo para preenchimento (expires_at)
 */
import { useState } from 'react';
import { Calendar, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CoverUpload } from './CoverUpload';
import type { Formulario } from '@/types/formulario';

interface Props {
  draft: Formulario;
  onChange: (updates: Partial<Formulario>) => void;
}

export function FormEditorSectionExperience({ draft, onChange }: Props) {
  const hasDeadline = Boolean(draft.expires_at);

  const handleDeadlineToggle = (checked: boolean) => {
    if (!checked) {
      onChange({ expires_at: null });
    } else {
      // Default: 7 dias a partir de hoje às 23:59:59
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(23, 59, 59, 0);
      onChange({ expires_at: d.toISOString() });
    }
  };

  const handleDateChange = (dateString: string) => {
    if (!dateString) {
      onChange({ expires_at: null });
      return;
    }
    const iso = new Date(`${dateString}T23:59:59`).toISOString();
    onChange({ expires_at: iso });
  };

  const formattedDate = draft.expires_at
    ? new Date(draft.expires_at).toISOString().split('T')[0]
    : '';

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-1 space-y-8 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">Experiência do cliente</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize a identidade visual e o momento de resposta do seu cliente.
        </p>
      </div>

      {/* 1. Capa do formulário */}
      <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-5">
        <div className="flex items-center gap-2">
          <ImageIcon size={18} className="text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Capa do formulário</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          A imagem de capa é exibida no topo do formulário público, reforçando a identidade do seu estúdio ou do ensaio.
        </p>

        <div className="pt-2">
          <CoverUpload
            coverUrl={draft.cover_url}
            formularioId={draft.id}
            onChange={(url) => onChange({ cover_url: url })}
          />
        </div>
      </div>

      {/* 2. Mensagem final de conclusão */}
      <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Mensagem de confirmação</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Texto exibido na tela logo após o cliente clicar em enviar as respostas.
        </p>

        <div className="space-y-2 pt-1">
          <Textarea
            id="f-conclusao"
            value={draft.mensagem_conclusao}
            onChange={(e) => onChange({ mensagem_conclusao: e.target.value })}
            placeholder="Ex: Muito obrigada por compartilhar suas respostas! Estamos super animados para o ensaio e entraremos em contato com todos os detalhes."
            rows={4}
            maxLength={500}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Seja acolhedor e oriente sobre os próximos passos.</span>
            <span>{draft.mensagem_conclusao?.length || 0}/500</span>
          </div>
        </div>
      </div>

      {/* 3. Prazo para resposta */}
      <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-muted-foreground" />
              <Label htmlFor="f-deadline" className="text-sm font-medium text-foreground cursor-pointer">
                Prazo limite para preenchimento
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Define uma data limite após a qual o formulário não aceitará mais novas respostas.
            </p>
          </div>
          <Switch
            id="f-deadline"
            checked={hasDeadline}
            onCheckedChange={handleDeadlineToggle}
          />
        </div>

        {hasDeadline && (
          <div className="pt-2 border-t space-y-2">
            <Label htmlFor="f-exp-date" className="text-xs text-muted-foreground">
              Data limite
            </Label>
            <Input
              id="f-exp-date"
              type="date"
              value={formattedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="max-w-[200px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Após as 23:59 desta data, o link informará ao cliente que o prazo expirou.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
