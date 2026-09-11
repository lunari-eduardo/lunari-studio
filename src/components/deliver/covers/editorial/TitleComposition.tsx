import React from 'react';

interface TitleCompositionProps {
  line1: string;
  line2: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  fontWeight?: number;
}

export function TitleComposition({
  line1,
  line2,
  fontSize,
  color,
  fontFamily,
  fontWeight = 600,
}: TitleCompositionProps) {
  const serifStyle = fontFamily
    ? { fontFamily }
    : { fontFamily: "'Bodoni Moda', 'Cormorant Garamond', 'Playfair Display', 'Instrument Serif', Didot, 'Times New Roman', serif" };

  const strokeStyle = fontSize < 48 ? { WebkitTextStroke: '0.35px currentColor' } : {};

  return (
    <div
      className="select-none pointer-events-none tracking-[-0.03em] leading-[0.84] uppercase transition-colors duration-500"
      style={{
        ...serifStyle,
        fontSize: `${fontSize}px`,
        fontWeight,
        color,
        ...strokeStyle,
      }}
    >
      <div className="block whitespace-nowrap">{line1}</div>
      {line2 && <div className="block mt-[0.05em] whitespace-nowrap">{line2}</div>}
    </div>
  );
}
