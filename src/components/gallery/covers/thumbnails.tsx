import type { ComponentType } from 'react';

type Props = { className?: string };

const Frame: ComponentType<Props & { children: React.ReactNode }> = ({ className, children }) => (
  <svg viewBox="0 0 160 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="100" fill="hsl(var(--muted))" />
    {children}
  </svg>
);

/**
 * 1. Minimalista — logo centralizado + nome da sessão.
 */
export const MinimalLogoThumbnail: ComponentType<Props> = ({ className }) => (
  <Frame className={className}>
    <rect x="70" y="24" width="20" height="20" rx="2" fill="currentColor" opacity="0.25" />
    <rect x="50" y="56" width="60" height="6" rx="1" fill="currentColor" opacity="0.8" />
    <rect x="62" y="66" width="36" height="3" fill="currentColor" opacity="0.4" />
  </Frame>
);

/**
 * 2. Retrato emoldurado — foto vertical com moldura fina e legenda abaixo.
 */
export const FramedPortraitThumbnail: ComponentType<Props> = ({ className }) => (
  <Frame className={className}>
    <rect x="58" y="10" width="44" height="58" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.3" />
    <rect x="63" y="15" width="34" height="48" fill="currentColor" opacity="0.25" />
    <rect x="56" y="78" width="48" height="4.5" rx="0.5" fill="currentColor" opacity="0.8" />
    <rect x="68" y="86" width="24" height="2.5" fill="currentColor" opacity="0.4" />
  </Frame>
);

/**
 * 3. Faixa horizontal — banner baixo com foto de fundo e texto sobreposto.
 */
export const HorizontalBandThumbnail: ComponentType<Props> = ({ className }) => (
  <Frame className={className}>
    <rect x="18" y="26" width="124" height="48" rx="2" fill="currentColor" opacity="0.22" />
    <rect x="50" y="58" width="60" height="5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="62" y="66" width="36" height="2.5" fill="currentColor" opacity="0.5" />
  </Frame>
);
