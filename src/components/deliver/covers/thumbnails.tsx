import type { ComponentType } from 'react';

type Props = { className?: string };

const Frame: ComponentType<Props & { children: React.ReactNode }> = ({ className, children }) => (
  <svg viewBox="0 0 160 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="100" fill="hsl(var(--muted))" />
    {children}
  </svg>
);

/**
 * 1. Cinemática (Fullscreen)
 * Foto em tela cheia com tipografia e metadados alinhados na base esquerda.
 */
export const FullscreenThumbnail: ComponentType<Props> = ({ className }) => (
  <Frame className={className}>
    {/* Foto 100% */}
    <rect width="160" height="100" fill="currentColor" opacity="0.2" />
    {/* Véu inferior */}
    <rect y="46" width="160" height="54" fill="currentColor" opacity="0.28" />
    {/* Kicker */}
    <rect x="14" y="56" width="28" height="2" fill="currentColor" opacity="0.6" />
    {/* Título Display XL em 2 linhas */}
    <rect x="14" y="62" width="76" height="5" rx="0.5" fill="currentColor" opacity="0.95" />
    <rect x="14" y="69" width="54" height="5" rx="0.5" fill="currentColor" opacity="0.95" />
    {/* Filete Accent */}
    <rect x="14" y="77" width="16" height="1" fill="currentColor" opacity="0.8" />
    {/* Data */}
    <rect x="14" y="81" width="30" height="2" fill="currentColor" opacity="0.5" />
    {/* Botão outline */}
    <rect x="14" y="86" width="34" height="6.5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.75" />
    {/* Scroll cue sutil na lateral */}
    <line x1="146" y1="80" x2="146" y2="92" stroke="currentColor" strokeWidth="1" opacity="0.4" />
  </Frame>
);

/**
 * 2. Passe-partout (Floating Frame)
 * Moldura flutuante com proporção real sobre o fundo do tema, título centralizado abaixo.
 */
export const FloatingFrameThumbnail: ComponentType<Props> = ({ className }) => (
  <Frame className={className}>
    {/* Fundo do tema */}
    <rect width="160" height="100" fill="currentColor" opacity="0.04" />
    {/* Kicker centralizado no topo */}
    <rect x="68" y="7" width="24" height="2" fill="currentColor" opacity="0.4" />
    {/* Moldura fotográfica flutuante com sombra suave */}
    <rect x="36" y="14" width="88" height="54" rx="1" fill="currentColor" opacity="0.1" />
    <rect x="36" y="12" width="88" height="54" rx="1" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.2" />
    {/* Filete accent centralizado */}
    <line x1="72" y1="71" x2="88" y2="71" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    {/* Título Display M centralizado */}
    <rect x="44" y="75" width="72" height="4.5" rx="0.5" fill="currentColor" opacity="0.85" />
    {/* Data e categoria */}
    <rect x="58" y="82" width="44" height="2" fill="currentColor" opacity="0.45" />
    {/* CTA underline */}
    <rect x="66" y="87" width="28" height="2.5" fill="currentColor" opacity="0.6" />
    <line x1="66" y1="91" x2="94" y2="91" stroke="currentColor" strokeWidth="1" opacity="0.75" />
  </Frame>
);

/**
 * 3. Díptico (Split)
 * Duas colunas: foto à esquerda com sobreposição de 40px sobre o painel de texto à direita.
 */
export const SplitThumbnail: ComponentType<Props> = ({ className }) => (
  <Frame className={className}>
    {/* Painel do tema à direita */}
    <rect width="160" height="100" fill="currentColor" opacity="0.04" />
    {/* Foto à esquerda avançando sobre o painel */}
    <rect x="0" y="0" width="92" height="100" fill="currentColor" opacity="0.25" />
    <line x1="92" y1="0" x2="92" y2="100" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.25" />
    {/* Conteúdo à direita com alinhamento óptico */}
    <rect x="104" y="24" width="22" height="2" fill="currentColor" opacity="0.4" />
    {/* Filete vertical de destaque */}
    <line x1="100" y1="30" x2="100" y2="62" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    {/* Título Display L */}
    <rect x="104" y="31" width="44" height="4.5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="104" y="38" width="34" height="4.5" rx="0.5" fill="currentColor" opacity="0.85" />
    {/* Subtítulo e data */}
    <rect x="104" y="47" width="30" height="2" fill="currentColor" opacity="0.45" />
    <rect x="104" y="52" width="38" height="2" fill="currentColor" opacity="0.35" />
    {/* CTA solid */}
    <rect x="104" y="64" width="36" height="7" rx="0.5" fill="currentColor" opacity="0.8" />
  </Frame>
);

/**
 * 4. Editorial
 * Costura em 42% com tipografia monumental atravessando e dividindo tema e foto.
 */
export const EditorialThumbnail: ComponentType<Props> = ({ className }) => (
  <Frame className={className}>
    {/* Tema à esquerda */}
    <rect x="0" y="0" width="67" height="100" fill="currentColor" opacity="0.04" />
    {/* Foto à direita a partir de 42% */}
    <rect x="67" y="0" width="93" height="100" fill="currentColor" opacity="0.25" />
    <line x1="67" y1="0" x2="67" y2="100" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.2" />
    {/* Subtítulo no topo */}
    <rect x="14" y="26" width="26" height="2" fill="currentColor" opacity="0.5" />
    {/* Título monumental cruzando a costura */}
    <rect x="14" y="36" width="94" height="7.5" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="14" y="46" width="76" height="7.5" rx="0.5" fill="currentColor" opacity="0.85" />
    {/* Data no rodapé esquerdo */}
    <rect x="14" y="85" width="28" height="2" fill="currentColor" opacity="0.45" />
    {/* CTA pill arredondado no rodapé direito */}
    <rect x="112" y="82" width="36" height="7" rx="3.5" fill="currentColor" opacity="0.7" />
  </Frame>
);
