import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, Plus, X, Loader2, Trash2 } from 'lucide-react';
import { useConversasEtiquetas } from '@/hooks/useConversasEtiquetas';
import { cn } from '@/lib/utils';
import type { Etiqueta } from '@/modules/conversas/types';

export interface ManageLabelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  '#EF4444', // Red
  '#D4AF37', // Gold
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#64748B', // Slate
];

export function ManageLabelsModal({ open, onOpenChange }: ManageLabelsModalProps) {
  const { etiquetas, isLoading, createEtiqueta, updateEtiqueta, deleteEtiqueta } = useConversasEtiquetas();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState(PRESET_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setDraftName('');
    setDraftColor(PRESET_COLORS[0]);
  };

  const handleNew = () => {
    resetForm();
    setEditingId('new');
  };

  const handleEdit = (etiqueta: Etiqueta) => {
    setEditingId(etiqueta.id);
    setDraftName(etiqueta.nome);
    setDraftColor(etiqueta.cor);
  };

  const handleSave = async () => {
    if (!draftName.trim()) return;
    setIsSaving(true);
    
    if (editingId === 'new') {
      await createEtiqueta({ nome: draftName.trim(), cor: draftColor });
    } else if (editingId) {
      await updateEtiqueta(editingId, { nome: draftName.trim(), cor: draftColor });
    }
    
    setIsSaving(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta etiqueta?')) {
      await deleteEtiqueta(id);
      if (editingId === id) resetForm();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetForm(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] p-0 border-l border-border/50 bg-background flex flex-col hide-close-button">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-white dark:bg-[#1A1A1A] shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Tag className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              Etiquetas
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Organize conversas com etiquetas coloridas
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!editingId && (
              <Button onClick={handleNew} className="h-8 rounded-lg text-xs px-3 shadow-sm bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nova Etiqueta
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Editor Form */}
        {editingId && (
          <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/20 border-b border-border/50 flex flex-col gap-4 animate-in slide-in-from-top-2 fade-in">
            <h3 className="text-sm font-semibold text-foreground">
              {editingId === 'new' ? 'Criar Etiqueta' : 'Editar Etiqueta'}
            </h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome da etiqueta</label>
              <Input 
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                placeholder="Ex: Urgente, VIP..."
                className="h-9"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">Cor</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setDraftColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                      draftColor === color ? "ring-2 ring-offset-2 ring-foreground" : "hover:scale-110"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Button onClick={handleSave} disabled={!draftName.trim() || isSaving} className="h-8 flex-1 text-xs">
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Salvar
              </Button>
              <Button onClick={resetForm} variant="ghost" className="h-8 flex-1 text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : etiquetas.length === 0 && !editingId ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma etiqueta criada ainda.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {etiquetas.map(etiqueta => (
                <div 
                  key={etiqueta.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:border-border transition-colors bg-white dark:bg-[#1A1A1A] group"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: etiqueta.cor }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {etiqueta.nome}
                    </span>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(etiqueta)}
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(etiqueta.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
