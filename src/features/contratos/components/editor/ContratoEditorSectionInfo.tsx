import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Code2, FileText, Star } from 'lucide-react';
import type { ContratoTemplate } from '@/types/contrato';
import { countVariables, estimateReadingTime } from '../../utils/contratoMetrics';

const CATEGORIAS_SUGERIDAS = [
  'geral',
  'ensaio',
  'gestante',
  'casamento',
  'newborn',
  'evento',
  'corporativo',
];

interface ContratoEditorSectionInfoProps {
  draft: Partial<ContratoTemplate>;
  onChange: (patch: Partial<ContratoTemplate>) => void;
}

export function ContratoEditorSectionInfo({ draft, onChange }: ContratoEditorSectionInfoProps) {
  const varsCount = countVariables(draft.conteudo);
  const readingTime = estimateReadingTime(draft.conteudo);
  const charCount = (draft.conteudo || '').replace(/<[^>]+>/g, '').length;

  return (
    <div className="max-w-3xl space-y-6 pb-10 animate-in fade-in duration-200">
      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">
          Informações do Modelo
        </h2>
        <p className="text-xs text-muted-foreground">
          Configure a identificação, categoria e comportamento padrão do modelo de contrato.
        </p>
      </div>

      <div className="space-y-4">
        {/* Nome do modelo */}
        <div className="space-y-1.5">
          <Label htmlFor="nome" className="text-xs font-medium">
            Nome do modelo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="nome"
            value={draft.nome || ''}
            onChange={(e) => onChange({ nome: e.target.value })}
            placeholder="Ex.: Contrato de Prestação de Serviços Fotográficos — Gestante"
            className="h-10 text-sm bg-background border-border/70"
          />
        </div>

        {/* Categoria + Sugestões */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="categoria" className="text-xs font-medium">
              Categoria
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Usada para organizar e filtrar seus modelos
            </span>
          </div>
          <Input
            id="categoria"
            value={draft.categoria || ''}
            onChange={(e) => onChange({ categoria: e.target.value.toLowerCase().trim() })}
            placeholder="Ex.: ensaio, gestante, casamento..."
            className="h-10 text-sm bg-background border-border/70"
          />
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-muted-foreground mr-1">Sugestões:</span>
            {CATEGORIAS_SUGERIDAS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onChange({ categoria: cat })}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  draft.categoria?.toLowerCase() === cat
                    ? 'bg-[hsl(var(--accent-gold))]/15 text-[hsl(var(--accent-gold))] border-[hsl(var(--accent-gold))]/40 font-medium'
                    : 'bg-muted/40 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Descrição interna */}
        <div className="space-y-1.5">
          <Label htmlFor="descricao" className="text-xs font-medium">
            Descrição interna (opcional)
          </Label>
          <Textarea
            id="descricao"
            value={draft.descricao || ''}
            onChange={(e) => onChange({ descricao: e.target.value })}
            placeholder="Ex.: Contrato completo com cláusulas de entrega de fotos digitais, direitos autorais e atrasos de ensaio."
            rows={3}
            className="text-sm bg-background border-border/70 resize-none"
          />
        </div>

        {/* Switch Modelo Padrão */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card/40">
          <div className="space-y-0.5 pr-4">
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <Label htmlFor="is_padrao" className="text-xs font-semibold cursor-pointer">
                Definir como modelo padrão
              </Label>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ao gerar um novo contrato para um cliente na agenda ou CRM, este modelo será selecionado automaticamente por padrão.
            </p>
          </div>
          <Switch
            id="is_padrao"
            checked={draft.is_padrao || false}
            onCheckedChange={(checked) => onChange({ is_padrao: checked })}
          />
        </div>

        {/* Métricas do documento */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <Card className="p-3 border-border/60 bg-card/40 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText size={18} />
            </div>
            <div>
              <div className="text-base font-semibold">{charCount}</div>
              <div className="text-[11px] text-muted-foreground">Caracteres de texto</div>
            </div>
          </Card>

          <Card className="p-3 border-border/60 bg-card/40 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Code2 size={18} />
            </div>
            <div>
              <div className="text-base font-semibold">{varsCount}</div>
              <div className="text-[11px] text-muted-foreground">Variáveis dinâmicas</div>
            </div>
          </Card>

          <Card className="p-3 border-border/60 bg-card/40 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-base font-semibold">~{readingTime} min</div>
              <div className="text-[11px] text-muted-foreground">Tempo de leitura</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
