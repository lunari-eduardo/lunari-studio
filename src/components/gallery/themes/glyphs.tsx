import type { ComponentType, ReactNode } from 'react';

type Props = { className?: string };

const Frame = ({ className, children }: Props & { children: ReactNode }) => (
  <svg viewBox="0 0 160 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="100" fill="hsl(var(--muted))" />
    {children}
  </svg>
);

const cell = (x: number, y: number, w: number, h: number) => (
  <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill="currentColor" opacity="0.28" />
);

/** Lunari — linhas justificadas, cada foto com sua proporção. */
export const LunariGridGlyph: ComponentType<Props> = ({ className }) => (
  <Frame className={className}>
    {[cell(12, 12, 52, 36), cell(67, 12, 24, 36), cell(94, 12, 54, 36)]}
    {[cell(12, 52, 30, 36), cell(45, 52, 56, 36), cell(104, 52, 44, 36)]}
  </Frame>
);

/** Clean — grade regular, respiro amplo. */
export const CleanGridGlyph: ComponentType<Props> = ({ className }) => (
  <Frame className={className}>
    {[cell(14, 12, 28, 36), cell(48, 12, 28, 36), cell(84, 12, 28, 36), cell(118, 12, 28, 36)]}
    {[cell(14, 54, 28, 34), cell(48, 54, 62, 34), cell(118, 54, 28, 34)]}
  </Frame>
);

/** Editorial — blocos de revista com destaque. */
export const EditorialGridGlyph: ComponentType<Props> = ({ className }) => (
  <Frame className={className}>
    {[cell(12, 12, 70, 76), cell(86, 12, 30, 36), cell(119, 12, 29, 36), cell(86, 52, 62, 36)]}
  </Frame>
);

export const GRID_STYLE_OPTIONS = [
  { value: 'lunari', label: 'Lunari', description: 'Linhas justificadas que respeitam a proporção de cada foto', glyph: LunariGridGlyph },
  { value: 'clean', label: 'Clean', description: 'Grade regular, com respiro amplo e fundo branco', glyph: CleanGridGlyph },
  { value: 'editorial', label: 'Editorial', description: 'Composições de revista, com fotos em destaque', glyph: EditorialGridGlyph },
];
