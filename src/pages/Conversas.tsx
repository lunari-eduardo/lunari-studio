/**
 * Página Conversas — skeleton.
 *
 * A implementação completa vem em fases:
 *  - Fase 5: layout 3-colunas
 *  - Fase 6: chat bubbles/composer
 *  - Fase 7: painel contexto CRM
 *  - Fase 14: mobile layout
 *
 * Este arquivo existe apenas para que a rota /app/conversas funcione
 * como placeholder durante o desenvolvimento incremental.
 */
import * as React from 'react';
import { Loader2 } from 'lucide-react';

export default function ConversasPage() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Carregando Conversas...</p>
      </div>
    </div>
  );
}
