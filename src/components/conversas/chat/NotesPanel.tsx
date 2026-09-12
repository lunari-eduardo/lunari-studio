/**
 * Painel lateral de notas do chat (estilo WhatsApp).
 */

import { useState } from 'react';
import { Loader2, Plus, StickyNote, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface Note {
  id: string;
  content: string;
  created_at?: string;
}

export interface NotesPanelProps {
  notes: Note[];
  onAdd: (content: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function NotesPanel({ notes, onAdd, onDelete }: NotesPanelProps) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!draft.trim() || submitting) return;
    try {
      setSubmitting(true);
      await onAdd(draft.trim());
      setDraft('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full md:w-80 flex-shrink-0 flex flex-col border-l border-zinc-200 bg-amber-50/40 h-full">
      <div className="px-3 py-2.5 border-b border-amber-200/60 flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-amber-700" />
        <span className="text-sm font-medium text-amber-900">Notas internas</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notes.length === 0 ? (
          <p className="text-xs text-amber-800/60 text-center py-8">
            Sem notas. Use para registrar contexto importante sobre o cliente.
          </p>
        ) : (
          notes.map(n => (
            <div
              key={n.id}
              className={cn(
                'group rounded-lg bg-white border border-amber-200/60 px-3 py-2 text-sm shadow-sm',
              )}
            >
              <p className="whitespace-pre-wrap break-words text-zinc-800">{n.content}</p>
              <div className="flex items-center justify-between mt-2">
                {n.created_at ? (
                  <span className="text-[10px] text-zinc-400">
                    {new Date(n.created_at).toLocaleString('pt-BR')}
                  </span>
                ) : <span />}
                <button
                  type="button"
                  onClick={() => onDelete(n.id)}
                  aria-label="Excluir nota"
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-amber-200/60 space-y-2 bg-white/40">
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Adicionar nota interna…"
          rows={3}
          className="resize-none text-sm bg-white"
        />
        <Button
          onClick={submit}
          disabled={!draft.trim() || submitting}
          size="sm"
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
