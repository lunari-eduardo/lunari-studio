import { Galeria } from '@/hooks/useSupabaseGalleries';

export interface GaleriaItem {
  id: string;
  sessionName: string;
  packageName: string;
  tipo: 'selecao' | 'entrega';
  status: string;
  statusSelecao: string;
  statusPagamento: string | null;
  selectedCount: number;
  includedPhotos: number;
  extraCount: number;
  valorExtras: number;
  valorTotalVendido: number;
  publicToken: string | null;
  thumbnailUrl?: string;
  raw: Galeria;
}

export interface GaleriasResumo {
  totalGalerias: number;
  totalFotosSelecionadas: number;
  totalFotosExtras: number;
  faturamentoExtrasTotal: number;
}
