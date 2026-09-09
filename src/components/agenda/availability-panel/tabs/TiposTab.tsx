import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAvailabilityTypes } from '@/hooks/useAvailabilityTypes';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Check, X, Tag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#06b6d4', '#ef4444', '#64748b'
];

export function TiposTab() {
  const {
    availabilityTypes,
    addAvailabilityType,
    updateAvailabilityType,
    deleteAvailabilityType,
    isLoading
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
      await addAvailabilityType({ name: newName.trim(), color: newColor });
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
      toast.success('Tipo adicionado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar tipo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (type: any) => {
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
      await updateAvailabilityType(id, { name: editName.trim(), color: editColor });
      setEditingId(null);
      toast.success('Tipo atualizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este tipo de disponibilidade?')) return;
    setIsSubmitting(true);
    try {
      await deleteAvailabilityType(id);
      toast.success('Tipo excluído (ou inativado)');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="space-y-3 p-4 bg-muted/30 border rounded-lg">
        <h4 className="text-sm font-medium">Novo Tipo</h4>
        <div className="space-y-2">
          <Label>Nome do tipo (ex: Ensaio Gestante)</Label>
          <Input 
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nome..."
            disabled={isSubmitting}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label>Cor de identificação</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setNewColor(color)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  newColor === color ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} size="sm" className="w-full mt-2">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Adicionar Tipo
        </Button>
      </form>

      <div className="space-y-3">
        <Label>Tipos Existentes</Label>
        
        {isLoading ? (
          <div className="text-sm text-muted-foreground animate-pulse">Carregando...</div>
        ) : availabilityTypes.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum tipo cadastrado.</div>
        ) : (
          <div className="space-y-2">
            {availabilityTypes.map((type: any) => {
              const isEditing = editingId === type.id;
              
              if (isEditing) {
                return (
                  <div key={type.id} className="p-3 border rounded-lg bg-muted/20 space-y-3">
                    <Input 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-8 text-sm bg-background"
                    />
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditColor(color)}
                          className={cn(
                            "w-6 h-6 rounded-full border-2",
                            editColor === color ? "border-foreground" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={isSubmitting}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleSaveEdit(type.id)} disabled={isSubmitting}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={type.id} className="flex items-center justify-between p-3 border rounded-lg bg-card group">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: type.color }} />
                    <span className="text-sm font-medium truncate">{type.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(type)} disabled={isSubmitting}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(type.id)} disabled={isSubmitting}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
