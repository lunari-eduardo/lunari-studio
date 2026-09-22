/**
 * FormEditorPreview — preview ao vivo do formulário público no editor.
 *
 * Renderiza o mesmo componente usado na rota pública (`FormPublicRenderer`),
 * garantindo paridade visual total. Modo `readOnly` suprime submit/upload.
 *
 * Frame visual:
 *  - Desktop: moldura com aspect ratio 16:10, escala o conteúdo via CSS.
 *  - Mobile: moldura tipo smartphone (375×700), escala via CSS.
 */
import { useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormPublicRenderer } from '@/components/formularios/shared/FormPublicRenderer';
import type { Formulario } from '@/types/formulario';

interface Props {
  draft: Formulario;
  defaultMode?: Mode;
}

type Mode = 'desktop' | 'mobile';

// Tamanho virtual do conteúdo (o conteúdo é renderizado nessa resolução
// e depois escalado via transform para caber na moldura visível).
const CONTENT_W = 1280;
const CONTENT_H = 720;
const MOBILE_W = 375;
const MOBILE_H = 700;

export function FormEditorPreview({ draft, defaultMode }: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode || 'desktop');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-card/40 px-4 py-2.5 shrink-0">
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

      <div className="flex-1 min-h-0 bg-muted/30 overflow-hidden">
        {mode === 'desktop' ? (
          <DesktopFrame>
            <PreviewContent draft={draft} layoutMode="desktop" />
          </DesktopFrame>
        ) : (
          <MobileFrame>
            <PreviewContent draft={draft} layoutMode="mobile" />
          </MobileFrame>
        )}
      </div>
    </div>
  );
}

function PreviewContent({
  draft,
  layoutMode,
}: {
  draft: Formulario;
  layoutMode: Mode;
}) {
  return (
    <FormPublicRenderer
      token={draft.public_token}
      readOnly
      overrideForm={draft}
      wrapInPublicTheme
      preserveDarkMode
      layoutMode={layoutMode}
    />
  );
}

/**
 * Moldura desktop. Renderiza o conteúdo em CONTENT_W × CONTENT_H fixos e
 * aplica transform: scale() calculado por JS para caber no espaço
 * disponível, mantendo proporção. O scale é recomputado em resize via
 * ResizeObserver.
 */
function DesktopFrame({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      setScale(Math.min(w / CONTENT_W, h / CONTENT_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="h-full w-full p-6 flex items-center justify-center">
      <div
        ref={ref}
        className="relative rounded-xl border bg-background shadow-md overflow-hidden"
        style={{
          width: '100%',
          maxWidth: 920,
          aspectRatio: CONTENT_W / CONTENT_H,
          maxHeight: '100%',
        }}
      >
        <div
          className="origin-top-left"
          style={{
            width: `${CONTENT_W}px`,
            height: `${CONTENT_H}px`,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function MobileFrame({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const padding = 24;
      const availW = el.clientWidth - padding;
      const availH = el.clientHeight - padding;
      if (availW <= 0 || availH <= 0) return;
      const totalW = MOBILE_W + 20;
      const totalH = MOBILE_H + 20;
      const s = Math.min(1, availW / totalW, availH / totalH);
      setScale(Math.max(0.35, s));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full p-4 flex items-center justify-center overflow-hidden"
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <div
          className="relative rounded-[44px] border-[10px] border-foreground/90 bg-foreground/90 shadow-2xl shrink-0"
          style={{
            width: `${MOBILE_W + 20}px`,
            height: `${MOBILE_H + 20}px`,
          }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4 bg-foreground/90 rounded-b-2xl z-20 pointer-events-none" />
          <div
            className="absolute inset-0 bg-background rounded-[34px] overflow-hidden"
            style={{ margin: '2px' }}
          >
            <div
              className="w-full h-full overflow-hidden"
              style={{
                width: `${MOBILE_W}px`,
                height: `${MOBILE_H}px`,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
