import { ComponentType } from 'react';
import { User, Tag, Settings, Sparkles, Image, MessageSquare, Check } from 'lucide-react';

export interface StepItem {
  id: number;
  name: string;
  icon: ComponentType<{ className?: string }>;
}

export const GALLERY_CREATE_STEPS: StepItem[] = [
  { id: 1, name: 'Cliente', icon: User },
  { id: 2, name: 'Venda', icon: Tag },
  { id: 3, name: 'Configurações', icon: Settings },
  { id: 4, name: 'Visual', icon: Sparkles },
  { id: 5, name: 'Fotos', icon: Image },
  { id: 6, name: 'Mensagem', icon: MessageSquare },
  { id: 7, name: 'Revisão', icon: Check },
];
