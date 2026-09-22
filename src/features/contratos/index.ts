/**
 * Módulo de Contratos do Lunari Studio
 * Gestão moderna de templates e biblioteca profissional de contratos
 */

export { default as ContratosListPage } from './pages/ContratosListPage';
export { default as ContratoEditorPage } from './pages/ContratoEditorPage';

export { ContratoCard, ContratoCardSkeleton } from './components/ContratoCard';
export { TemplateCard, TemplateCardSkeleton } from './components/TemplateCard';
export { CreateContratoCard } from './components/CreateContratoCard';
export { ContratoToolbar } from './components/ContratoToolbar';
export { CategoryChips } from './components/CategoryChips';
export { ContratoPreviewModal } from './components/ContratoPreviewModal';

export { useContratoActions } from './hooks/useContratoActions';
export { useBeforeUnload } from './hooks/useBeforeUnload';

export * from './utils/contratoMetrics';
export * from './utils/mockContratoData';
