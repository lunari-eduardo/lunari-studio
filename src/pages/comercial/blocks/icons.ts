import {
  Users,
  Baby,
  Heart,
  Camera,
  Image as ImageIcon,
  Images,
  Frame,
  BookOpen,
  Printer,
  TreePine,
  Sparkles,
  Star,
  Snowflake,
  Gift,
  Shirt,
  Palette,
  CalendarDays,
  Clock,
  Hourglass,
  MapPin,
  CreditCard,
  Wallet,
  ShieldCheck,
  FileText,
  MessageCircle,
  Phone,
  Mail,
  Truck,
  Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================================
// ÍCONES DAS PROPOSTAS (sem JSX: testado em scripts/test_template_instantiation.ts)
// Um único estilo (Lucide de contorno, traço fino) para nunca misturar
// preenchido e contorno. O conteúdo guarda só a chave; chave desconhecida
// (ex.: removida do catálogo no futuro) simplesmente não aparece.
// ============================================================

export const ICON_GROUPS = ['Pessoas', 'Fotografia', 'Cenário', 'Vestuário', 'Agenda', 'Pagamento', 'Contato e entrega'] as const;
export type IconGroup = (typeof ICON_GROUPS)[number];

export const PROPOSAL_ICONS: Record<string, { label: string; icon: LucideIcon; group: IconGroup }> = {
  users: { label: 'Participantes', icon: Users, group: 'Pessoas' },
  baby: { label: 'Criança', icon: Baby, group: 'Pessoas' },
  heart: { label: 'Carinho', icon: Heart, group: 'Pessoas' },
  camera: { label: 'Fotos', icon: Camera, group: 'Fotografia' },
  image: { label: 'Imagem', icon: ImageIcon, group: 'Fotografia' },
  images: { label: 'Galeria', icon: Images, group: 'Fotografia' },
  frame: { label: 'Quadro', icon: Frame, group: 'Fotografia' },
  album: { label: 'Álbum', icon: BookOpen, group: 'Fotografia' },
  print: { label: 'Impressão', icon: Printer, group: 'Fotografia' },
  tree: { label: 'Cenário', icon: TreePine, group: 'Cenário' },
  sparkles: { label: 'Brilho', icon: Sparkles, group: 'Cenário' },
  star: { label: 'Estrela', icon: Star, group: 'Cenário' },
  snowflake: { label: 'Floco de neve', icon: Snowflake, group: 'Cenário' },
  gift: { label: 'Presente', icon: Gift, group: 'Cenário' },
  shirt: { label: 'Vestuário', icon: Shirt, group: 'Vestuário' },
  palette: { label: 'Cores', icon: Palette, group: 'Vestuário' },
  calendar: { label: 'Data', icon: CalendarDays, group: 'Agenda' },
  clock: { label: 'Duração', icon: Clock, group: 'Agenda' },
  hourglass: { label: 'Prazo', icon: Hourglass, group: 'Agenda' },
  location: { label: 'Local', icon: MapPin, group: 'Agenda' },
  card: { label: 'Pagamento', icon: CreditCard, group: 'Pagamento' },
  wallet: { label: 'Carteira', icon: Wallet, group: 'Pagamento' },
  shield: { label: 'Segurança', icon: ShieldCheck, group: 'Pagamento' },
  contract: { label: 'Contrato', icon: FileText, group: 'Pagamento' },
  message: { label: 'Mensagem', icon: MessageCircle, group: 'Contato e entrega' },
  phone: { label: 'Telefone', icon: Phone, group: 'Contato e entrega' },
  mail: { label: 'E-mail', icon: Mail, group: 'Contato e entrega' },
  truck: { label: 'Entrega', icon: Truck, group: 'Contato e entrega' },
  package: { label: 'Embalagem', icon: Package, group: 'Contato e entrega' },
};

// Ordem importa: "2 trocas de roupa (uma por cenário)" é vestuário; "galeria" vem antes de "foto"
const SUGGESTIONS: [RegExp, string][] = [
  [/participant|pessoa|integrant|famil/, 'users'],
  [/beb[eê]|crian[cç]|newborn/, 'baby'],
  [/roupa|look|vestu[aá]ri|figurino/, 'shirt'],
  [/cen[aá]rio|decora/, 'tree'],
  [/[aá]lbum/, 'album'],
  [/impress|papel fotogr/, 'print'],
  [/quadro|moldura|porta[- ]?retrato|frame/, 'frame'],
  [/galeria|sele[cç][aã]o/, 'images'],
  [/foto|imagem|digita|arquivo/, 'camera'],
  [/\d+\s*(h(?![a-z])|hora|min)|dura[cç][aã]o|sess[aã]o/, 'clock'],
  [/entrega|envio|frete/, 'truck'],
  [/prazo|\d+\s*dias/, 'hourglass'],
  [/local|endere[cç]/, 'location'],
  [/pagamento|pix|cart[aã]o|parcel/, 'card'],
  [/contrato/, 'contract'],
  [/altera|cancel|remarc|reserva|agenda/, 'calendar'],
  [/presente|presentear/, 'gift'],
  [/segur|garantia/, 'shield'],
  [/qualidade/, 'heart'],
  [/d[uú]vida|contato|whatsapp|disposi[cç]/, 'message'],
  [/paleta|\bcores\b|\btons\b/, 'palette'],
];

/** Ícone padrão pelo texto do item (o fotógrafo pode trocar); sem correspondência = null. */
export function suggestIcon(text: string): string | null {
  const t = (text || '').toLowerCase();
  return SUGGESTIONS.find(([re]) => re.test(t))?.[1] ?? null;
}

/** Valor salvo quando o fotógrafo escolhe "Sem ícone" (vazio = padrão da seção). */
export const ICON_NONE = 'none';

/** Chave a exibir: escolha explícita vence; vazio usa o padrão da seção; "Sem ícone" ou desconhecida = nada. */
export function resolveIconKey(value: unknown, fallback: string | null = null): string | null {
  if (value === ICON_NONE) return null;
  if (typeof value === 'string' && value) return PROPOSAL_ICONS[value] ? value : null;
  return fallback && PROPOSAL_ICONS[fallback] ? fallback : null;
}
