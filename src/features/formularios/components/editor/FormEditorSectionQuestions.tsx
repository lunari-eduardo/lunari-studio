/**
 * FormEditorSectionQuestions — seção "Perguntas" do editor.
 *
 * Lista vertical de perguntas com drag & drop para reordenar. Clicar em um
 * card abre o `QuestionEditor`. O botão "+ Adicionar pergunta" abre o
 * `AddQuestionSheet`.
 *
 * Implementa o drag & drop com `@dnd-kit` (já em uso no `FormularioTemplateEditor`)
 * com `PointerSensor` que tem tolerância para não conflitar com scroll em touch.
 */
import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionCard } from './QuestionCard';
import { QuestionEditor } from './QuestionEditor';
import { AddQuestionSheet } from './AddQuestionSheet';
import {
  defaultCampoFor,
  duplicateCampo,
  reorderCampos,
} from '@/features/formularios/pages/utils';
import type {
  Formulario,
  FormularioCampo,
  FormularioCampoTipo,
} from '@/types/formulario';

interface Props {
  draft: Formulario;
  onChange: (updates: Partial<Formulario>) => void;
}

export function FormEditorSectionQuestions({ draft, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const campos = draft.campos;
  const ids = useMemo(() => campos.map((c) => c.id), [campos]);

  const editingCampo: FormularioCampo | null =
    editingId ? campos.find((c) => c.id === editingId) ?? null : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Evita reorder acidental ao scrollar em touch
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const updateCampo = (id: string, updates: Partial<FormularioCampo>) => {
    onChange({
      campos: campos.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  };

  const removeCampo = (id: string) => {
    const next = campos
      .filter((c) => c.id !== id)
      .map((c, idx) => ({ ...c, ordem: idx + 1 }));
    onChange({ campos: next });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange({ campos: reorderCampos(campos, String(active.id), String(over.id)) });
  };

  const handleAddTipo = (tipo: FormularioCampoTipo) => {
    const novo = defaultCampoFor(tipo, campos.length + 1);
    onChange({ campos: [...campos, novo] });
    setAddOpen(false);
    // Abre o editor já no campo recém-criado para o usuário preencher
    setEditingId(novo.id);
  };

  const handleDuplicate = (campo: FormularioCampo) => {
    const novo = duplicateCampo(campo, campos.length + 1);
    onChange({ campos: [...campos, novo] });
    // Abre o editor para o usuário ver a cópia
    setEditingId(novo.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">Perguntas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize as perguntas que seu cliente responderá antes da sessão.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="gap-1.5 bg-foreground text-background hover:bg-foreground/90"
        >
          <Plus size={14} aria-hidden /> Adicionar pergunta
        </Button>
      </div>

      {campos.length === 0 ? (
        <EmptyQuestions onAdd={() => setAddOpen(true)} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {campos.map((campo) => (
                <QuestionCard
                  key={campo.id}
                  campo={campo}
                  onClick={() => setEditingId(campo.id)}
                  onDuplicate={() => handleDuplicate(campo)}
                  onDelete={() => {
                    // Confirmação vem do DeleteQuestionDialog dentro do QuestionEditor.
                    // Se o usuário excluir pelo menu ⋮ sem abrir o editor, abrimos
                    // o editor para ele confirmar.
                    setEditingId(campo.id);
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <QuestionEditor
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        campo={editingCampo}
        onChange={(updates) => {
          if (editingId) updateCampo(editingId, updates);
        }}
        onDelete={() => {
          if (editingId) {
            removeCampo(editingId);
            setEditingId(null);
          }
        }}
      />

      <AddQuestionSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onSelect={handleAddTipo}
      />
    </div>
  );
}

function EmptyQuestions({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center">
      <h3 className="text-sm font-medium text-foreground">
        Nenhuma pergunta ainda
      </h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
        Comece adicionando a primeira pergunta para conhecer melhor o seu
        cliente.
      </p>
      <Button
        onClick={onAdd}
        className="mt-4 gap-1.5 bg-foreground text-background hover:bg-foreground/90"
      >
        <Plus size={14} aria-hidden /> Adicionar pergunta
      </Button>
    </div>
  );
}
