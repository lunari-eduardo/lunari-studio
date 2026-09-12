/**
 * Avatar determinístico colorido a partir do telefone.
 * Cores pastel inspiradas no WhatsApp Web — nunca repete para o mesmo número.
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getInitials } from './format';

const PALETTE = [
  'bg-[#F4A261] text-white',     // laranja
  'bg-[#E76F51] text-white',     // coral
  'bg-[#2A9D8F] text-white',     // teal
  'bg-[#264653] text-white',     // grafite-azulado
  'bg-[#E9C46A] text-zinc-900',  // amarelo mostarda
  'bg-[#8AB17D] text-white',     // verde sálvia
  'bg-[#6D597A] text-white',     // roxo acinzentado
  'bg-[#B56576] text-white',     // rosa antigo
];

function hashPhone(phone: string | null | undefined): number {
  if (!phone) return 0;
  let sum = 0;
  for (let i = 0; i < phone.length; i++) {
    sum = (sum * 31 + phone.charCodeAt(i)) >>> 0;
  }
  return sum;
}

export interface ContactAvatarProps {
  phone?: string | null;
  name?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<ContactAvatarProps['size']>, string> = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function ContactAvatar({
  phone,
  name,
  src,
  size = 'md',
  className,
}: ContactAvatarProps) {
  const idx = hashPhone(phone ?? name ?? '') % PALETTE.length;
  const palette = PALETTE[idx];
  const initials = getInitials(name, phone);

  return (
    <Avatar
      className={cn(SIZE_CLASS[size], palette, className)}
    >
      {src ? <AvatarImage src={src} alt={name ?? phone ?? ''} /> : null}
      <AvatarFallback className="bg-transparent font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
