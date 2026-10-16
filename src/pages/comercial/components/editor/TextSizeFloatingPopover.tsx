import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Minus, Palette, Plus, RotateCcw, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { resolveFieldInfo, type TextRole } from '../../blocks/textFields';
import { useLastTextColor, setLastTextColor } from '../../blocks/recentColors';
import {
  DEFAULT_DESIGN_TOKENS,
  PROPOSAL_FONTS,
  ensureFontLoaded,
  isHexColor,
  type ProposalDesignTokens,
  type FontKind,
} from '../../blocks/design';

export interface TextSizePopoverProps {
  /** Campo selecionado no canvas (ex: 'title', 'subtitle', 'description', 'feature'). */
  fieldKey: string;
  /** Tamanho atual em px (do block.props.typography). */
  currentSize?: number;
  /** Cor atual personalizada (do block.props.typography). */
  currentColor?: string;
  /** Design tokens ativos da proposta. */
  designTokens?: ProposalDesignTokens;
  /** Callback ao mudar o tamanho; `undefined` remove o override. */
  onChange: (fieldKey: string, size: number | undefined) => void;
  /** Callback ao mudar a cor; `undefined` remove o override. */
  onColorChange?: (fieldKey: string, color: string | undefined) => void;
  /** Callback ao mudar a fonte da categoria (ex: role = 'subtitle', font = 'Montserrat'). */
  onFontCategoryChange?: (role: TextRole, font: string) => void;
  /** Elemento âncora para posicionamento. */
  anchorEl: HTMLElement | null;
  /** Fecha o popover. */
  onClose: () => void;
}

const KIND_LABEL: Record<FontKind, string> = {
  serif: 'Serifadas',
  sans: 'Sem serifa',
  script: 'Caligráficas',
};

const CATEGORY_NAMES: Record<TextRole, string> = {
  display: 'Títulos',
  subtitle: 'Subtítulos e Apoio',
  body: 'Descrições e Textos',
  highlight: 'Destaques em Itálico',
  script: 'Caligrafia',
  accent: 'Números e Preços',
};

export function TextSizeFloatingPopover({
  fieldKey,
  currentSize,
  currentColor,
  designTokens,
  onChange,
  onColorChange,
  onFontCategoryChange,
  anchorEl,
  onClose,
}: TextSizePopoverProps) {
  const fieldInfo = useMemo(() => resolveFieldInfo(fieldKey), [fieldKey]);
  const bounds = {
    min: fieldInfo.min,
    max: fieldInfo.max,
    default: fieldInfo.defaultSize,
    label: fieldInfo.label,
  };

  // Sem override salvo, o tamanho real é o que o tema renderiza no DOM
  const measure = useCallback(() => {
    const px = anchorEl ? Math.round(parseFloat(getComputedStyle(anchorEl).fontSize)) : NaN;
    return px > 0 ? px : bounds.default;
  }, [anchorEl, bounds.default]);

  const [size, setSize] = useState(() => currentSize ?? measure());
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const [colorOpen, setColorOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [hexInput, setHexInput] = useState(currentColor ?? '');

  // Última cor de texto usada gravada no storage
  const lastTextColor = useLastTextColor();

  // Posicionamento do popover relativo ao âncora
  useEffect(() => {
    if (!anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const popoverHeight = 52;
      let top = rect.top - popoverHeight - 8;
      let left = rect.left + rect.width / 2;

      // Se não couber acima, posiciona logo abaixo
      if (top < 8) {
        top = rect.bottom + 8;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorEl]);

  // Sync com props externas
  useEffect(() => {
    setSize(currentSize ?? measure());
  }, [currentSize, measure]);

  useEffect(() => {
    setHexInput(currentColor ?? '');
  }, [currentColor]);

  // Fechar ao clicar fora (a menos que um subpopover de cor ou fonte esteja aberto)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorOpen || fontOpen) return;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorEl, colorOpen, fontOpen]);

  const commit = useCallback(
    (newSize: number) => {
      const clamped = Math.max(bounds.min, Math.min(bounds.max, newSize));
      setSize(clamped);
      onChange(fieldKey, clamped);
    },
    [fieldKey, onChange, bounds]
  );

  const applyColor = useCallback(
    (hex: string | undefined) => {
      if (hex) {
        setLastTextColor(hex);
      }
      onColorChange?.(fieldKey, hex);
      setColorOpen(false);
    },
    [fieldKey, onColorChange]
  );

  if (!anchorEl) return null;

  // Paleta de cores da proposta
  const palette = { ...DEFAULT_DESIGN_TOKENS.colors, ...(designTokens?.colors ?? {}) };
  const paletteList = [
    { key: 'ink', label: 'Tinta (Escuro)', color: palette.ink },
    { key: 'white', label: 'Branco Base', color: palette.white },
    { key: 'accent', label: 'Dourado / Destaque', color: palette.accent },
    { key: 'taupe', label: 'Neutro Escuro', color: palette.taupe },
    { key: 'stone', label: 'Neutro Médio', color: palette.stone },
    { key: 'linen', label: 'Neutro Suave', color: palette.linen },
    { key: 'cream', label: 'Creme', color: palette.cream },
  ];

  // Fonte atual da categoria deste campo
  const currentCategoryFont =
    designTokens?.typography?.[fieldInfo.role === 'body' ? 'body' : fieldInfo.role] ||
    (fieldInfo.role === 'subtitle'
      ? designTokens?.typography?.subtitle || designTokens?.typography?.body || 'Inter'
      : fieldInfo.role === 'display'
      ? designTokens?.typography?.display || 'Playfair Display'
      : 'Inter');

  // Filtro de fontes compatíveis com este papel
  const isBodyRole = fieldInfo.role === 'body';
  const allowedKinds: FontKind[] =
    fieldInfo.role === 'script'
      ? ['script']
      : fieldInfo.role === 'highlight'
      ? ['serif', 'script']
      : isBodyRole
      ? ['sans', 'serif']
      : ['serif', 'sans'];

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[999] flex items-center gap-1.5 rounded-2xl bg-neutral-900/95 backdrop-blur-md px-3 py-2 shadow-2xl border border-white/10 select-none text-white transition-all duration-150"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Rótulo da Categoria */}
      <span className="text-[10px] font-semibold text-white/50 tracking-wider uppercase whitespace-nowrap mr-0.5">
        {bounds.label}
      </span>

      {/* Botão - */}
      <button
        type="button"
        className="h-6 w-6 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
        onClick={() => commit(size - 1)}
        disabled={size <= bounds.min}
        title="Diminuir tamanho"
      >
        <Minus className="h-3 w-3" />
      </button>

      {/* Slider de Tamanho */}
      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={1}
        value={size}
        onChange={(e) => commit(Number(e.target.value))}
        className="w-24 h-1 appearance-none bg-white/20 rounded-full accent-white cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
      />

      {/* Botão + */}
      <button
        type="button"
        className="h-6 w-6 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
        onClick={() => commit(size + 1)}
        disabled={size >= bounds.max}
        title="Aumentar tamanho"
      >
        <Plus className="h-3 w-3" />
      </button>

      {/* Valor numérico em px */}
      <span className="text-xs font-mono text-white/90 w-7 text-center tabular-nums">
        {size}
      </span>

      {/* Reset de tamanho */}
      <button
        type="button"
        className={cn(
          'h-6 w-6 flex items-center justify-center rounded-lg transition-colors',
          currentSize !== undefined
            ? 'text-white/70 hover:text-white hover:bg-white/10'
            : 'text-white/20 cursor-default'
        )}
        onClick={() => currentSize !== undefined && onChange(fieldKey, undefined)}
        title="Restaurar tamanho padrão"
      >
        <RotateCcw className="h-3 w-3" />
      </button>

      {/* Divisória 1 */}
      <div className="h-4 w-px bg-white/15 mx-0.5" />

      {/* SELETOR DE COR DE TEXTO */}
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 h-6 px-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/10',
              currentColor ? 'text-white bg-white/10' : 'text-white/80'
            )}
            title="Trocar cor do texto"
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-white/40 shadow-xs shrink-0"
              style={{
                backgroundColor: currentColor || 'currentColor',
                backgroundImage: !currentColor ? 'linear-gradient(135deg, #fff 50%, #171717 50%)' : undefined,
              }}
            />
            <span className="text-[11px] font-mono tracking-tight max-w-[50px] truncate">
              {currentColor ? currentColor.toUpperCase() : 'Cor'}
            </span>
            <ChevronDown className="h-2.5 w-2.5 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          className="z-[1000] w-64 rounded-2xl bg-neutral-900/98 border border-white/10 p-3 shadow-2xl text-white select-none backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="space-y-3">
            {/* ÚLTIMA COR USADA (FIXA EM DESTAQUE) */}
            {lastTextColor && (
              <div className="space-y-1.5 pb-2.5 border-b border-white/10">
                <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider block">
                  Última cor usada
                </span>
                <button
                  type="button"
                  onClick={() => applyColor(lastTextColor)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-white/30 shadow-xs shrink-0"
                      style={{ backgroundColor: lastTextColor }}
                    />
                    <span className="text-xs font-mono font-medium tracking-wider text-white">
                      {lastTextColor.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
                    Aplicar
                  </span>
                </button>
              </div>
            )}

            {/* CORES DA PROPOSTA (PALETA ATIVA) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider block">
                Cores da Proposta
              </span>
              <div className="grid grid-cols-7 gap-1.5">
                {paletteList.map((swatch) => {
                  const isSelected = currentColor?.toLowerCase() === swatch.color.toLowerCase();
                  return (
                    <button
                      key={swatch.key}
                      type="button"
                      title={`${swatch.label} (${swatch.color})`}
                      onClick={() => applyColor(swatch.color)}
                      className={cn(
                        'h-6 w-6 rounded-lg border flex items-center justify-center transition-all',
                        isSelected
                          ? 'border-white scale-110 shadow-md ring-2 ring-white/30'
                          : 'border-white/20 hover:scale-105'
                      )}
                      style={{ backgroundColor: swatch.color }}
                    >
                      {isSelected && <Check className="h-3 w-3 text-neutral-900 invert" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CORES RÁPIDAS & COR LIVRE */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider block">
                Cor Livre & Essenciais
              </span>
              <div className="flex items-center gap-2">
                {/* Botões Rápidos Preto e Branco */}
                <button
                  type="button"
                  title="Branco Puro (#FFFFFF)"
                  onClick={() => applyColor('#FFFFFF')}
                  className={cn(
                    'h-7 px-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors',
                    currentColor?.toLowerCase() === '#ffffff'
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-white border border-black/20" />
                  Branco
                </button>

                <button
                  type="button"
                  title="Preto Grafite (#1A1714)"
                  onClick={() => applyColor('#1A1714')}
                  className={cn(
                    'h-7 px-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors',
                    currentColor?.toLowerCase() === '#1a1714'
                      ? 'bg-neutral-800 text-white border-white'
                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1A1714] border border-white/30" />
                  Preto
                </button>

                {/* Input Color Nativo / Conta-gotas */}
                <div className="relative flex-1">
                  <input
                    type="color"
                    value={isHexColor(hexInput) ? hexInput : '#ffffff'}
                    onChange={(e) => {
                      setHexInput(e.target.value);
                      applyColor(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    title="Seletor com conta-gotas"
                  />
                  <div className="h-7 w-full flex items-center justify-center rounded-lg border border-white/15 bg-white/5 text-xs text-white/80 hover:bg-white/10 transition-colors">
                    <Palette className="h-3.5 w-3.5 mr-1 text-white/60" />
                    <span className="text-[11px] font-mono">Hex</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RESTAURAR COR PADRÃO / TEMA */}
            <button
              type="button"
              onClick={() => applyColor(undefined)}
              className={cn(
                'w-full py-1.5 text-center text-xs rounded-lg transition-colors border',
                currentColor === undefined
                  ? 'bg-white/10 text-white/90 border-white/20'
                  : 'bg-transparent text-white/50 border-white/5 hover:bg-white/5 hover:text-white/80'
              )}
            >
              Cor do tema (automática)
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Divisória 2 */}
      {onFontCategoryChange && (
        <>
          <div className="h-4 w-px bg-white/15 mx-0.5" />

          {/* SELETOR DE FONTE DA CATEGORIA */}
          <Popover open={fontOpen} onOpenChange={setFontOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 h-6 px-2 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors max-w-[130px]"
                title={`Fonte de todos os ${CATEGORY_NAMES[fieldInfo.role] || 'textos'} da proposta`}
              >
                <Type className="h-3 w-3 text-white/60 shrink-0" />
                <span className="truncate text-[11px] font-sans">{currentCategoryFont}</span>
                <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="top"
              sideOffset={8}
              className="z-[1000] w-64 max-h-80 overflow-y-auto custom-scrollbar rounded-2xl bg-neutral-900/98 border border-white/10 p-3 shadow-2xl text-white select-none backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-white">
                    {CATEGORY_NAMES[fieldInfo.role]}
                  </p>
                  <p className="text-[10px] text-white/50 leading-tight">
                    Aplica a todos os {CATEGORY_NAMES[fieldInfo.role]?.toLowerCase() || 'textos'} da proposta.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {allowedKinds.map((kind) => {
                    const families = Object.entries(PROPOSAL_FONTS).filter(
                      ([, f]) => f.kind === kind && (!isBodyRole || !f.displayOnly)
                    );
                    if (!families.length) return null;
                    return (
                      <div key={kind} className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block">
                          {KIND_LABEL[kind]}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          {families.map(([family, f]) => {
                            const isSelected = currentCategoryFont === family;
                            ensureFontLoaded(family);
                            return (
                              <button
                                key={family}
                                type="button"
                                onClick={() => {
                                  onFontCategoryChange(fieldInfo.role, family);
                                  setFontOpen(false);
                                }}
                                className={cn(
                                  'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors',
                                  isSelected
                                    ? 'bg-white/20 text-white font-medium'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                )}
                              >
                                <span style={{ fontFamily: `'${family}', sans-serif` }}>
                                  {f.label.split(' (')[0]}
                                </span>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>,
    document.body
  );
}

export { FIELD_BOUNDS_EXPORT as FIELD_BOUNDS };
const FIELD_BOUNDS_EXPORT: Record<string, { min: number; max: number; default: number; label: string }> = {};
