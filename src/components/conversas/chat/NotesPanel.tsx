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
    <div className="w-full md:w-80 flex-shrink-0 flex flex-col border-l border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] bg-[#FFFDF5] dark:bg-[#181818] h-full">
      <div className="px-3 py-2.5 border-b border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.05)] flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-[#C9A87C]" />
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Notas internas</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notes.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center py-8">
            Sem notas. Use para registrar contexto importante sobre o cliente.
          </p>
        ) : (
          notes.map(n => (
            <div
              key={n.id}
              className={cn(
                'group rounded-lg bg-white dark:bg-[#242424] border border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.05)] px-3 py-2 text-sm shadow-sm',
              )}
            >
              <p className="whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200">{n.content}</p>
              <div className="flex items-center justify-between mt-2">
                {n.created_at ? (
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                    {new Date(n.created_at).toLocaleString('pt-BR')}
                  </span>
                ) : <span />}
                <button
                  type="button"
                  onClick={() => onDelete(n.id)}
                  aria-label="Excluir nota"
                  className="opacity-0 group-hover:opacity-100 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.05)] space-y-2 bg-[#FAFAF5] dark:bg-[#181818]">
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Adicionar nota interna…"
          rows={3}
          className="resize-none text-sm bg-white dark:bg-[#242424] text-zinc-900 dark:text-zinc-200 border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.08)]"
        />
        <Button
          onClick={submit}
          disabled={!draft.trim() || submitting}
          size="sm"
          className="w-full bg-[#C9A87C] hover:bg-[#b89567] text-white"
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
