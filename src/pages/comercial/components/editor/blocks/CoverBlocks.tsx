import React from 'react';
import { CtaHandler } from './helpers';

// Componentes de capa isolados — cada um com layout rígido independente
import { CoverMinimalCenter } from './covers/CoverMinimalCenter';
import { CoverPosterSplit } from './covers/CoverPosterSplit';
import { CoverSeamSide } from './covers/CoverSeamSide';
import { CoverHeroFull } from './covers/CoverHeroFull';
import { CoverEditorialDiptych } from './covers/CoverEditorialDiptych';
import { CoverFloatingFrame } from './covers/CoverFloatingFrame';

// Re-exports para compatibilidade com eventuais imports diretos
export { CoverMinimalCenter } from './covers/CoverMinimalCenter';
export { CoverPosterSplit } from './covers/CoverPosterSplit';
export { CoverSeamSide } from './covers/CoverSeamSide';
export { CoverHeroFull } from './covers/CoverHeroFull';
export { CoverEditorialDiptych } from './covers/CoverEditorialDiptych';
export { CoverFloatingFrame } from './covers/CoverFloatingFrame';

/**
 * Despachante principal das capas — roteia para o componente
 * de layout dedicado com base na variante selecionada.
 * Nenhuma variante cai em fallback genérico: cada uma das 6
 * possui seu próprio motor visual com isolamento de mídia.
 */
export function CoverRenderer({
  data,
  props,
  onCtaClick,
}: {
  data?: any;
  props?: any;
  onCtaClick?: CtaHandler;
}) {
  const variant = props?.variant || 'minimal-center';
  switch (variant) {
    case 'poster-split':
      return <CoverPosterSplit data={data} props={props} onCtaClick={onCtaClick} />;
    case 'seam-side':
      return <CoverSeamSide data={data} props={props} onCtaClick={onCtaClick} />;
    case 'hero-full':
      return <CoverHeroFull data={data} props={props} onCtaClick={onCtaClick} />;
    case 'editorial-diptych':
      return <CoverEditorialDiptych data={data} props={props} onCtaClick={onCtaClick} />;
    case 'floating-frame':
      return <CoverFloatingFrame data={data} props={props} onCtaClick={onCtaClick} />;
    case 'minimal-center':
    default:
      return <CoverMinimalCenter data={data} props={props} onCtaClick={onCtaClick} />;
  }
}
