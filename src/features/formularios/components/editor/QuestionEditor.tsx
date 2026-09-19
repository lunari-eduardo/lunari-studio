/**
 * QuestionEditor — drawer para editar uma pergunta.
 *
 * Componente único que se adapta ao viewport:
 *  - Desktop (≥md): Sheet lateral (440px, side=right) — mantém lista visível.
 *  - Mobile (<md): Drawer (Vaul) bottom-sheet (90vh).
 *
 * Lógica, estado e handlers são idênticos — só o container muda.
 *
 * Persistência: o `onChange` propaga para o draft (FormEditorSectionQuestions),
 * o "Salvar" do drawer apenas fecha (não persiste de imediato; persiste com
 * "Salvar" do header do editor).
 */
import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { DeleteQuestionDialog } from './DeleteQuestionDialog';
import { newFieldId } from '@/features/formularios/pages/utils';
import {
  CAMPO_TIPO_LABELS,
  CAMPOS_SEM_PLACEHOLDER,
  type FormularioCampo,
  type FormularioCampoTipo,
  type FormularioCampoOpcaoCor,
} from '@/types/formulario';
import { cn } from '@/lib/utils';

const TODOS_TIPOS: FormularioCampoTipo[] = [
  'texto_curto',
  'texto_longo',
  'selecao_unica',
  'multipla_escolha',
  'data',
  'upload_referencia',
  'upload_imagem',
  'selecao_cores',
];

interface TipoContexto {
  labelPlaceholder: string;
  descricaoPlaceholder: string;
  campoPlaceholder?: string;
  dica?: string;
}

const CONTEXTO_POR_TIPO: Record<FormularioCampoTipo, TipoContexto> = {
  texto_curto: {
    labelPlaceholder: 'Ex: Qual é o seu nome completo?',
    descricaoPlaceholder: 'Ex: Usaremos para personalizar seu atendimento e documentação.',
    campoPlaceholder: 'Ex: Sofia Silva',
  },
  texto_longo: {
    labelPlaceholder: 'Ex: Conte-nos sobre suas expectativas para o ensaio',
    descricaoPlaceholder: 'Ex: Quanto mais detalhes você compartilhar, melhor prepararemos a experiência.',
    campoPlaceholder: 'Ex: Gostaria de fotos bem espontâneas, com luz natural...',
  },
  data: {
    labelPlaceholder: 'Ex: Qual é a data prevista para o parto ou evento?',
    descricaoPlaceholder: 'Ex: Ajuda a planejar o timing ideal para a realização do ensaio.',
    dica: 'O cliente verá um seletor de calendário nativo.',
  },
  selecao_unica: {
    labelPlaceholder: 'Ex: Qual é o local de sua preferência para o ensaio?',
    descricaoPlaceholder: 'Ex: Escolha o ambiente que melhor representa o seu estilo.',
    dica: 'O cliente poderá escolher apenas uma entre as opções.',
  },
  multipla_escolha: {
    labelPlaceholder: 'Ex: Quais cenários ou momentos mais te encantam?',
    descricaoPlaceholder: 'Ex: Você pode marcar mais de uma alternativa.',
    dica: 'O cliente poderá marcar múltiplas opções.',
  },
  upload_imagem: {
    labelPlaceholder: 'Ex: Envie fotos ou arquivos que você gostaria que víssemos',
    descricaoPlaceholder: 'Ex: Fotos do ultrassom, ensaio anterior, figurino ou local.',
    dica: 'O cliente poderá anexar imagens (JPG, PNG) ou PDF.',
  },
  upload_referencia: {
    labelPlaceholder: 'Ex: Compartilhe suas referências visuais e inspirações',
    descricaoPlaceholder: 'Ex: Fotos do Pinterest, paletas ou poses que você ama.',
    dica: 'Ideal para o cliente compartilhar inspirações visuais.',
  },
  selecao_cores: {
    labelPlaceholder: 'Ex: Quais tons você prefere para o figurino?',
    descricaoPlaceholder: 'Ex: Indique as cores predominantes que gostaria de usar no dia.',
    dica: 'O cliente escolherá entre as cores que você configurar.',
  },
};

interface QuestionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campo: FormularioCampo | null;
  onChange: (updates: Partial<FormularioCampo>) => void;
  onDelete: () => void;
}

export function QuestionEditor({
  open,
  onOpenChange,
  campo,
  onChange,
  onDelete,
}: QuestionEditorProps) {
  const isMobile = useIsMobile();

  // Estado local para opções de seleção (single/multipla). Sincroniza com o campo.
  const [opcoes, setOpcoes] = useState<string[]>([]);
  // Estado local para opções de cor (selecao_cores)
  const [opcoesCor, setOpcoesCor] = useState<FormularioCampoOpcaoCor[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Parse opcoes do campo conforme o tipo
  const parseOpcoesFromCampo = (c: FormularioCampo | null) => {
    if (!c?.opcoes) return;
    if (c.tipo === 'selecao_cores') {
      const cores = c.opcoes.map((o): FormularioCampoOpcaoCor => {
        if (typeof o === 'string') return { label: o, hex: '#888888' };
        return o as FormularioCampoOpcaoCor;
      });
      setOpcoesCor(cores);
    } else {
      const strs = c.opcoes.map((o) => (typeof o === 'string' ? o : o.label));
      setOpcoes(strs);
    }
  };

  useEffect(() => {
    setOpcoes([]);
    setOpcoesCor([]);
    parseOpcoesFromCampo(campo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campo?.id]);

  if (!campo) return null;

  const contexto = CONTEXTO_POR_TIPO[campo.tipo];
  const showPlaceholder = !CAMPOS_SEM_PLACEHOLDER.includes(campo.tipo);
  const showOpcoes =
    campo.tipo === 'selecao_unica' || campo.tipo === 'multipla_escolha';
  const showOpcoesCor = campo.tipo === 'selecao_cores';
  const opcoesValidas = opcoes.filter((o) => o.trim()).length;
  const opcoesCorValidas = opcoesCor.filter((o) => o.label.trim()).length;

  const handleOpcoesChange = (next: string[]) => {
    setOpcoes(next);
    onChange({ opcoes: next });
  };

  const handleOpcoesCorChange = (next: FormularioCampoOpcaoCor[]) => {
    setOpcoesCor(next);
    onChange({ opcoes: next });
  };

  const handleAddOpcao = () => {
    handleOpcoesChange([...opcoes, `Opção ${opcoes.length + 1}`]);
  };

  const handleAddOpcaoCor = () => {
    handleOpcoesCorChange([
      ...opcoesCor,
      { label: `Cor ${opcoesCor.length + 1}`, hex: '#888888' },
    ]);
  };

  const handleRemoveOpcao = (idx: number) => {
    handleOpcoesChange(opcoes.filter((_, i) => i !== idx));
  };

  const handleRemoveOpcaoCor = (idx: number) => {
    handleOpcoesCorChange(opcoesCor.filter((_, i) => i !== idx));
  };

  const handleOpcaoChange = (idx: number, value: string) => {
    handleOpcoesChange(opcoes.map((o, i) => (i === idx ? value : o)));
  };

  const handleOpcaoCorChange = (idx: number, field: keyof FormularioCampoOpcaoCor, value: string) => {
    handleOpcoesCorChange(
      opcoesCor.map((o, i) => (i === idx ? { ...o, [field]: value } : o)),
    );
  };

  const handleMoveOpcao = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= opcoes.length) return;
    const next = [...opcoes];
    [next[idx], next[target]] = [next[target], next[idx]];
    handleOpcoesChange(next);
  };

  const handleMoveOpcaoCor = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= opcoesCor.length) return;
    const next = [...opcoesCor];
    [next[idx], next[target]] = [next[target], next[idx]];
    handleOpcoesCorChange(next);
  };

  const handleTipoChange = (next: FormularioCampoTipo) => {
    if (next === campo.tipo) return;
    // Resetar ambos estados ao trocar tipo
    setOpcoes([]);
    setOpcoesCor([]);
    if (next === 'selecao_cores') {
      onChange({
        tipo: next,
        opcoes: [
          { label: 'Azul', hex: '#4A90D9' },
          { label: 'Verde', hex: '#6AB04C' },
        ],
        placeholder: undefined,
      });
    } else if (['selecao_unica', 'multipla_escolha'].includes(next)) {
      onChange({
        tipo: next,
        opcoes: ['Opção 1', 'Opção 2'],
        placeholder: undefined,
      });
    } else {
      onChange({
        tipo: next,
        opcoes: undefined,
        placeholder: CAMPOS_SEM_PLACEHOLDER.includes(next) ? undefined : campo.placeholder,
      });
    }
  };

  const handleConfirmDelete = () => {
    setDeleteOpen(false);
    onDelete();
  };

  const handleClose = () => onOpenChange(false);

  const body = (
    <div className="space-y-6 pb-6">
      {/* Tipo */}
      <div className="space-y-2">
        <Label>Tipo de pergunta</Label>
        <Select value={campo.tipo} onValueChange={(v) => handleTipoChange(v as FormularioCampoTipo)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TODOS_TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {CAMPO_TIPO_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {contexto?.dica && (
          <p className="text-[11px] text-muted-foreground">{contexto.dica}</p>
        )}
      </div>

      {/* Pergunta */}
      <div className="space-y-2">
        <Label htmlFor="q-label">
          Pergunta <span className="text-destructive">*</span>
        </Label>
        <Input
          id="q-label"
          value={campo.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={contexto?.labelPlaceholder || 'Digite a pergunta...'}
          autoFocus
        />
      </div>

      {/* Descrição / Ajuda */}
      <div className="space-y-2">
        <Label htmlFor="q-desc">Descrição / Ajuda</Label>
        <Textarea
          id="q-desc"
          value={campo.descricao ?? ''}
          onChange={(e) => onChange({ descricao: e.target.value || undefined })}
          placeholder={contexto?.descricaoPlaceholder || 'Texto explicativo opcional para orientar o cliente.'}
          rows={3}
        />
      </div>

      {/* Placeholder (se aplicável para o tipo) */}
      {showPlaceholder && (
        <div className="space-y-2">
          <Label htmlFor="q-placeholder">Texto de exemplo (placeholder)</Label>
          <Input
            id="q-placeholder"
            value={campo.placeholder ?? ''}
            onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
            placeholder={contexto?.campoPlaceholder || 'Ex: Digite aqui...'}
          />
          <p className="text-[11px] text-muted-foreground">
            Exibido dentro do campo como orientação antes do cliente começar a digitar.
          </p>
        </div>
      )}

      {/* Opções (apenas para Seleção única e Múltipla escolha) */}
      {showOpcoes && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Opções de resposta</Label>
            <span className="text-[11px] text-muted-foreground">
              {opcoes.length} {opcoes.length === 1 ? 'opção' : 'opções'}
            </span>
          </div>

          <div className="space-y-2">
            {opcoes.map((op, idx) => (
              <div
                key={`${campo.id}-op-${idx}`}
                className="flex items-center gap-1.5"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleMoveOpcao(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Mover para cima"
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ChevronUp size={12} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveOpcao(idx, 1)}
                    disabled={idx === opcoes.length - 1}
                    aria-label="Mover para baixo"
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ChevronDown size={12} aria-hidden />
                  </button>
                </div>
                <Input
                  value={op}
                  onChange={(e) => handleOpcaoChange(idx, e.target.value)}
                  placeholder={`Opção ${idx + 1}`}
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveOpcao(idx)}
                  disabled={opcoes.length <= 1}
                  aria-label="Remover opção"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive disabled:opacity-30"
                >
                  <Trash size={14} aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          {opcoesValidas < 2 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Adicione pelo menos 2 opções para que o cliente possa escolher.
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOpcao}
            className="gap-1.5 mt-1"
          >
            <Plus size={14} aria-hidden /> Adicionar opção
          </Button>
        </div>
      )}

      {/* Opções de cor (selecao_cores) */}
      {showOpcoesCor && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Paleta de cores</Label>
            <span className="text-[11px] text-muted-foreground">
              {opcoesCor.length} {opcoesCor.length === 1 ? 'cor' : 'cores'}
            </span>
          </div>

          <div className="space-y-2">
            {opcoesCor.map((op, idx) => (
              <div
                key={`${campo.id}-cor-${idx}`}
                className="flex items-center gap-1.5"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleMoveOpcaoCor(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Mover para cima"
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ChevronUp size={12} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveOpcaoCor(idx, 1)}
                    disabled={idx === opcoesCor.length - 1}
                    aria-label="Mover para baixo"
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ChevronDown size={12} aria-hidden />
                  </button>
                </div>
                {/* Swatch de preview */}
                <div
                  className="w-9 h-9 rounded border shrink-0"
                  style={{ backgroundColor: op.hex }}
                  aria-hidden
                />
                {/* Hex input */}
                <Input
                  type="color"
                  value={op.hex}
                  onChange={(e) => handleOpcaoCorChange(idx, 'hex', e.target.value)}
                  className="w-9 h-9 p-0 border-0 cursor-pointer"
                  title="Cor"
                />
                {/* Label input */}
                <Input
                  value={op.label}
                  onChange={(e) => handleOpcaoCorChange(idx, 'label', e.target.value)}
                  placeholder={`Cor ${idx + 1}`}
                  className="h-9 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveOpcaoCor(idx)}
                  disabled={opcoesCor.length <= 1}
                  aria-label="Remover cor"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive disabled:opacity-30"
                >
                  <Trash size={14} aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          {opcoesCorValidas < 2 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Adicione pelo menos 2 cores para que o cliente possa escolher.
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOpcaoCor}
            className="gap-1.5 mt-1"
          >
            <Plus size={14} aria-hidden /> Adicionar cor
          </Button>
        </div>
      )}

      {/* Obrigatório */}
      <div className="flex items-center justify-between rounded-lg border bg-card/40 px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="q-obrigatorio" className="cursor-pointer">
            Pergunta obrigatória
          </Label>
          <p className="text-xs text-muted-foreground">
            {campo.obrigatorio
              ? 'O cliente precisará responder esta pergunta.'
              : 'O cliente poderá deixá-la em branco.'}
          </p>
        </div>
        <Switch
          id="q-obrigatorio"
          checked={campo.obrigatorio}
          onCheckedChange={(v) => onChange({ obrigatorio: v })}
        />
      </div>

      {/* Excluir (separado, ação destrutiva) */}
      <div className="border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          <Trash2 size={14} aria-hidden /> Excluir pergunta
        </Button>
      </div>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" onClick={handleClose}>
        Cancelar
      </Button>
      <Button
        onClick={handleClose}
        className="bg-foreground text-background hover:bg-foreground/90"
        disabled={
          !campo.label.trim() ||
          (showOpcoes && opcoesValidas < 2) ||
          (showOpcoesCor && opcoesCorValidas < 2)
        }
      >
        Salvar
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Editar pergunta</DrawerTitle>
              <DrawerDescription>
                Configure como o cliente verá esta pergunta.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4">{body}</div>
            <DrawerFooter className="border-t pt-4">
              {footer}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        <DeleteQuestionDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          questionLabel={campo.label}
          onConfirm={handleConfirmDelete}
        />
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-[440px] flex-col sm:max-w-[440px] p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Editar pergunta</SheetTitle>
            <SheetDescription>
              Configure como o cliente verá esta pergunta.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">{body}</div>
          <SheetFooter className="border-t px-6 py-4">{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
      <DeleteQuestionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        questionLabel={campo.label}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
