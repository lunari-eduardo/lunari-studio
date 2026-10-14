import React, { useRef } from 'react';
import { ResizeHandle } from './panel/ResizeHandle';
import { useStoredWidth } from './panel/panelStyles';

// Limites das colunas laterais (px). O canvas nunca fica abaixo de CANVAS_MIN ao arrastar.
const LEFT_MIN = 220;
const LEFT_MAX = 360;
const RIGHT_MIN = 320;
const RIGHT_MAX = 520;
const CANVAS_MIN = 360;

interface EditorColumnsProps {
  /** Lista de seções / estilo. `null` abaixo de lg: no celular ela vive num Sheet (nunca montada 2×). */
  left: React.ReactNode;
  /** Inspetor da seção. `null` abaixo de lg, pelo mesmo motivo. */
  right: React.ReactNode;
  /** Canvas (a arte). */
  children: React.ReactNode;
}

/**
 * Casca de 3 colunas do editor (≥ lg): estrutura | canvas | inspetor, com alças de redimensionar.
 *
 * Largura padrão do inspetor: 340 px; 380 px a partir de 1728 px e 420 px a partir de 1920 px —
 * onde o documento já está em escala 1,0 (cada +40 px do painel custa ≈ 0,043 de escala abaixo disso).
 * A largura escolhida fica no aparelho (localStorage), fora do documento e do histórico.
 */
export function EditorColumns({ left, right, children }: EditorColumnsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [leftW, setLeftW] = useStoredWidth('lunari:proposal:structure-w', LEFT_MIN, LEFT_MAX);
  const [rightW, setRightW] = useStoredWidth('lunari:proposal:inspector-w', RIGHT_MIN, RIGHT_MAX);

  const room = (other: React.RefObject<HTMLDivElement>) => (rootRef.current?.clientWidth ?? 0) - (other.current?.offsetWidth ?? 0) - CANVAS_MIN;

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 overflow-hidden">
      {/* COLUNA ESQUERDA: ESTRUTURA (≥lg) */}
      <div
        ref={leftRef}
        // maxWidth protege o canvas se a janela encolher depois de uma largura grande ter sido escolhida
        style={{ ...(leftW && { width: leftW }), maxWidth: `calc(100% - ${RIGHT_MIN + CANVAS_MIN}px)` }}
        className="relative z-10 hidden w-[280px] shrink-0 flex-col border-r bg-background lg:flex"
      >
        {left}
        {left && (
          <ResizeHandle
            edge="right"
            label="Largura do painel de seções"
            min={LEFT_MIN}
            getMax={() => Math.min(LEFT_MAX, room(rightRef))}
            getWidth={() => leftRef.current?.offsetWidth ?? 280}
            value={leftW ?? undefined}
            onChange={setLeftW}
          />
        )}
      </div>

      {/* COLUNA CENTRAL: RENDERIZADOR VISUAL */}
      <div className="relative flex min-w-0 flex-1">{children}</div>

      {/* COLUNA DIREITA: PROPRIEDADES (≥lg) */}
      <div
        ref={rightRef}
        style={{ ...(rightW && { width: rightW }), maxWidth: `calc(100% - ${LEFT_MIN + CANVAS_MIN}px)` }}
        className="relative z-10 hidden w-[340px] shrink-0 flex-col border-l bg-background shadow-[-4px_0_24px_rgba(0,0,0,0.02)] min-[1728px]:w-[380px] min-[1920px]:w-[420px] lg:flex"
      >
        {right}
        {right && (
          <ResizeHandle
            edge="left"
            label="Largura do painel de propriedades"
            min={RIGHT_MIN}
            getMax={() => Math.min(RIGHT_MAX, room(leftRef))}
            getWidth={() => rightRef.current?.offsetWidth ?? 340}
            value={rightW ?? undefined}
            onChange={setRightW}
          />
        )}
      </div>
    </div>
  );
}
