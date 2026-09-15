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
  const [opcoes, setOpcoes] = useState<string[]>(campo?.opcoes ?? []);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setOpcoes(campo?.opcoes ?? []);
  }, [campo?.id, campo?.opcoes]);

  if (!campo) return null;

  const showPlaceholder = !CAMPOS_SEM_PLACEHOLDER.includes(campo.tipo);
  const showOpcoes =
    campo.tipo === 'selecao_unica' || campo.tipo === 'multipla_escolha';

  const handleOpcoesChange = (next: string[]) => {
    setOpcoes(next);
    onChange({ opcoes: next });
  };

  const handleAddOpcao = () => {
    handleOpcoesChange([...opcoes, `Opção ${opcoes.length + 1}`]);
  };

  const handleRemoveOpcao = (idx: number) => {
    handleOpcoesChange(opcoes.filter((_, i) => i !== idx));
  };

  const handleOpcaoChange = (idx: number, value: string) => {
    handleOpcoesChange(opcoes.map((o, i) => (i === idx ? value : o)));
  };

  const handleMoveOpcao = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= opcoes.length) return;
    const next = [...opcoes];
    [next[idx], next[target]] = [next[target], next[idx]];
    handleOpcoesChange(next);
  };

  const handleTipoChange = (next: FormularioCampoTipo) => {
    if (next === campo.tipo) return;
    const updates: Partial<FormularioCampo> = {
      tipo: next,
      // Limpar opções se o novo tipo não as usa (mantém se já usa)
      opcoes: ['selecao_unica', 'multipla_escolha'].includes(next)
        ? opcoes.length > 0
          ? opcoes
          : ['Opção 1', 'Opção 2']
        : undefined,
    };
    onChange(updates);
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
          placeholder="Ex: Qual é a data prevista para o parto?"
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
          placeholder="Ex: Ajuda a planejar o timing ideal do ensaio."
          rows={3}
        />
      </div>

      {/* Placeholder (se aplicável) */}
      {showPlaceholder && (
        <div className="space-y-2">
          <Label htmlFor="q-placeholder">Placeholder</Label>
          <Input
            id="q-placeholder"
            value={campo.placeholder ?? ''}
            onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
            placeholder="Ex: Sofia"
          />
        </div>
      )}

      {/* Opções */}
      {showOpcoes && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Opções</Label>
            <span className="text-[11px] text-muted-foreground">{opcoes.length} {opcoes.length === 1 ? 'opção' : 'opções'}</span>
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
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp size={12} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveOpcao(idx, 1)}
                    disabled={idx === opcoes.length - 1}
                    aria-label="Mover para baixo"
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown size={12} aria-hidden />
                  </button>
                </div>
                <Input
                  value={op}
                  onChange={(e) => handleOpcaoChange(idx, e.target.value)}
                  className="h-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveOpcao(idx)}
                  aria-label="Remover opção"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                >
                  <Trash size={14} aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOpcao}
            className="gap-1.5"
          >
            <Plus size={14} aria-hidden /> Adicionar opção
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
        disabled={!campo.label.trim()}
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
