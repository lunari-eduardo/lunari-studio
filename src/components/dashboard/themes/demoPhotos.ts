import { PhotoPaths } from '@/lib/photoUrl';

// Padrão global de demonstração — fotos do casal em campo ao entardecer.
// Preservam proporções realistas (3:2 horizontal e 2:3 vertical).
// Utilizadas em todos os previews de capa/grid quando não há fotos reais na galeria.
export const DEMO_PHOTOS = [
  {
    id: '1',
    storageKey: 'demo-casal-horizontal',
    originalFilename: 'casal-campo-horizontal.jpg',
    width: 1500,
    height: 1000,
    previewPath: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1500&auto=format&fit=crop',
    thumbPath: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop',
    peso_visual: 1
  },
  {
    id: '2',
    storageKey: 'demo-casal-vertical',
    originalFilename: 'casal-campo-vertical.jpg',
    width: 1000,
    height: 1500,
    previewPath: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1000&auto=format&fit=crop',
    thumbPath: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: '3',
    storageKey: 'demo-casal-vertical-2',
    originalFilename: 'casal-campo-vertical-2.jpg',
    width: 1000,
    height: 1500,
    previewPath: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=1000&auto=format&fit=crop',
    thumbPath: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: '4',
    storageKey: 'demo-estudio-horizontal',
    originalFilename: 'default-cover-horizontal.jpg',
    width: 1024,
    height: 731,
    previewPath: '/images/covers/default-cover-horizontal.jpg',
    thumbPath: '/images/covers/default-cover-horizontal.jpg',
    peso_visual: 1
  },
  {
    id: '5',
    storageKey: 'demo-casamento-horizontal-2',
    originalFilename: 'casamento-05.jpg',
    width: 1500,
    height: 1000,
    previewPath: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1500&auto=format&fit=crop',
    thumbPath: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '6',
    storageKey: 'demo-casamento-vertical',
    originalFilename: 'casamento-06.jpg',
    width: 1000,
    height: 1500,
    previewPath: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=1000&auto=format&fit=crop',
    thumbPath: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: '7',
    storageKey: 'demo-casamento-vertical-2',
    originalFilename: 'casamento-07.jpg',
    width: 1000,
    height: 1500,
    previewPath: 'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?q=80&w=1000&auto=format&fit=crop',
    thumbPath: 'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: '8',
    storageKey: 'demo-casamento-horizontal-3',
    originalFilename: 'casamento-08.jpg',
    width: 1500,
    height: 1000,
    previewPath: 'https://images.unsplash.com/photo-1510076857177-7470076d4098?q=80&w=1500&auto=format&fit=crop',
    thumbPath: 'https://images.unsplash.com/photo-1510076857177-7470076d4098?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '9',
    storageKey: 'demo-estudio-vertical',
    originalFilename: 'default-cover-vertical.jpg',
    width: 576,
    height: 1024,
    previewPath: '/images/covers/default-cover-vertical.jpg',
    thumbPath: '/images/covers/default-cover-vertical.jpg',
  }
];