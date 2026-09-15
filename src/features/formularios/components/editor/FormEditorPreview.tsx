/**
 * FormEditorPreview — preview ao vivo do formulário público no editor.
 *
 * Renderiza o mesmo componente usado na rota pública (`FormPublicRenderer`),
 * garantindo paridade visual total. Modo `readOnly` suprime submit/upload.
 *
 * Toggle Desktop/Mobile no topo. Mobile é especialmente importante porque
 * o cliente provavelmente responderá pelo celular.
 *
 * Frame visual:
 *  - Desktop: container largo com borda arredondada.
 *  - Mobile: moldura tipo smartphone (375×720 com borda escura).
 */
import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { FormPublicRenderer } from '@/components/formularios/shared/FormPublicRenderer';
import type { Formulario } from '@/types/formulario';

interface Props {
  draft: Formulario;
}

type Mode = 'desktop' | 'mobile';

export function FormEditorPreview({ draft }: Props) {
  const [mode, setMode] = useState<Mode>('desktop');

  // O renderer consome o form via useFormularioPublico(token). No editor,
  // passamos o public_token do draft. Como o draft está em rascunho e o
  // token já existe, isso mostra o que está persistido — mas queremos
  // refletir mudanças em tempo real. Solução: hook local que sobrescreve
  // o formulario injetado pelo renderer.
  //
  // Implementação: o renderer usa `useFormularioPublico(token)` que faz
  // fetch. Para preview "live" sem persistir, precisaríamos de uma API
  // adicional. Compromisso desta etapa: o preview reflete o que está
  // SALVO. Alterações não salvas não aparecem no preview. Isso é honesto
  // e evita drag de complexidade. O brief 16 diz "preview atualiza conforme
  // conteúdo" — e o conteúdo é o que está persistido (status "Publicado").
  //
  // Para draft em rascunho: como `useFormularioPublico` aceita token e o
  // backend retorna formulários em rascunho apenas se o token bater, mas o
  // schema de RLS pode impedir. Workaround: o renderer precisa aceitar uma
  // prop opcional `overrideForm` que bypassa o fetch.

  return (
    <div className="flex h-full flex-col">
      {/* Header do preview */}
      <div className="flex items-center justify-between border-b bg-card/40 px-4 py-2.5">
        <span className="text-xs font-medium text-foreground">
          Preview do formulário
        </span>
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          className="h-7"
        >
          <TabsList className="h-7 p-0.5 bg-muted/60">
            <TabsTrigger
              value="desktop"
              className="h-6 px-2.5 text-[11px] gap-1 data-[state=active]:bg-background"
            >
              <Monitor size={11} aria-hidden /> Desktop
            </TabsTrigger>
            <TabsTrigger
              value="mobile"
              className="h-6 px-2.5 text-[11px] gap-1 data-[state=active]:bg-background"
            >
              <Smartphone size={11} aria-hidden /> Mobile
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Frame */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        {mode === 'desktop' ? (
          <DesktopFrame>
            <PreviewContent draft={draft} />
          </DesktopFrame>
        ) : (
          <MobileFrame>
            <PreviewContent draft={draft} />
          </MobileFrame>
        )}
      </div>
    </div>
  );
}

function PreviewContent({ draft }: { draft: Formulario }) {
  // O renderer faz fetch pelo token. Para preview ao vivo (sem salvar),
  // usamos uma versão interna que aceita o form direto. Como o renderer
  // atual espera um token, optamos por sempre renderizar o estado atual
  // do draft através de um pequeno wrapper que simula o hook:
  // passamos o draft real (readOnly) montando o mesmo markup do renderer.
  //
  // Para manter paridade visual total sem duplicar markup, o ideal seria
  // adicionar prop `overrideForm?: Formulario` ao FormPublicRenderer que
  // curto-circuita o useFormularioPublico. Fizemos isso abaixo.

  return <FormPublicRenderer token={draft.public_token} readOnly overrideForm={draft} wrapInPublicTheme />;
}

function DesktopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'mx-auto max-w-3xl rounded-xl border bg-background shadow-sm overflow-hidden',
      )}
    >
      {children}
    </div>
  );
}

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto" style={{ width: 387 }}>
      {/* Moldura tipo smartphone */}
      <div className="relative rounded-[44px] border-[10px] border-foreground/90 bg-foreground/90 shadow-xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-foreground/90 rounded-b-2xl z-10" />
        <div
          className="bg-background overflow-y-auto"
          style={{ height: 700, width: 367 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
