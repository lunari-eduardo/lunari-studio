import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAvailabilityTypes } from '@/hooks/useAvailabilityTypes';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { dialogSize, DIALOG_SHELL, DIALOG_TITLE_CLS } from '@/lib/dialogTokens';
import { cn } from '@/lib/utils';

interface AvailabilityTypesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#10b981', // Verde esmeralda
  '#3b82f6', // Azul
  '#8b5cf6', // Roxo
  '#ec4899', // Rosa
  '#f59e0b', // Âmbar
  '#06b6d4', // Ciano
  '#ef4444', // Vermelho
  '#64748b', // Slate
];

export function AvailabilityTypesManagerModal({
  isOpen,
  onClose,
}: AvailabilityTypesManagerModalProps) {
  const {
    availabilityTypes,
    addAvailabilityType,
    updateAvailabilityType,
    deleteAvailabilityType,
  } = useAvailabilityTypes();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Informe o nome do tipo');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAvailabilityType({
        name: newName.trim(),
        color: newColor,
      });
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
      toast.success('Tipo de disponibilidade adicionado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar tipo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (type: { id: string; name: string; color: string }) => {
    setEditingId(type.id);
    setEditName(type.name);
    setEditColor(type.color);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Informe o nome do tipo');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAvailabilityType(id, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingId(null);
      toast.success('Tipo atualizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar tipo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === '1' || id === '2') {
      toast.error('Tipos padrão do sistema não podem ser removidos.');
      return;
    }

    if (!confirm('Deseja realmente remover este tipo de disponibilidade?')) return;

    setIsSubmitting(true);
    try {
      await deleteAvailabilityType(id);
      toast.success('Tipo removido');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover tipo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(dialogSize('md'), DIALOG_SHELL)}>
        <DialogHeader>
          <DialogTitle className={cn(DIALOG_TITLE_CLS, 'flex items-center gap-2')}>
            <Tag className="h-5 w-5 text-primary" />
            Tipos de Disponibilidade
          </DialogTitle>
          <DialogDescription>
            Categorize seus horários de agenda (ex: Páscoa, Mini-ensaio, Estúdio) para vincular ao Agendamento Online.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Formulário de Adicionar */}
          <form onSubmit={handleAdd} className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold">Novo Tipo</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ex: Páscoa, Ensaio Gestante..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9 text-sm"
              />
              <div className="flex items-center gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={cn(
                      'w-6 h-6 rounded-full border border-black/20 transition-transform flex items-center justify-center',
                      newColor === c ? 'scale-110 ring-2 ring-primary ring-offset-1' : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {newColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
              <Button type="submit" size="sm" className="h-9 gap-1 shrink-0" disabled={isSubmitting}>
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </form>

          {/* Lista de Tipos Existentes */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            <Label className="text-xs font-semibold text-muted-foreground">Tipos cadastrados</Label>
            {availabilityTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">Nenhum tipo cadastrado.</p>
            ) : (
              availabilityTypes.map((type) => {
                const isEditing = editingId === type.id;
                return (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card hover:bg-muted/10 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                        <div className="flex items-center gap-1">
                          {PRESET_COLORS.slice(0, 5).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className={cn(
                                'w-5 h-5 rounded-full border border-black/20 flex items-center justify-center',
                                editColor === c ? 'scale-110 ring-2 ring-primary ring-offset-1' : ''
                              )}
                              style={{ backgroundColor: c }}
                            >
                              {editColor === c && <Check className="w-3 h-3 text-white" />}
                            </button>
                          ))}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-primary"
                          onClick={() => handleSaveEdit(type.id)}
                          disabled={isSubmitting}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: type.color }}
                          />
                          <span className="text-sm font-medium">{type.name}</span>
                          {(type.id === '1' || type.id === '2') && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              Padrão
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleStartEdit(type)}
                            disabled={type.id === '1' || type.id === '2'}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(type.id)}
                            disabled={type.id === '1' || type.id === '2'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
