import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ClienteAvatarProps {
  src?: string | null;
  nome: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Avatar compartilhado para Workflow (Desktop e Mobile) e outros módulos.
 * Mantém consistência visual com ClientesTable e evita layout shifts com dimensões fixas.
 */
export function ClienteAvatar({ src, nome, size = "lg", className }: ClienteAvatarProps) {
  // O tamanho lg é o padrão do workflow (40px)
  const sizeClasses = {
    sm: "w-6 h-6 text-[9px]",
    md: "w-8 h-8 text-[11px]",
    lg: "w-10 h-10 text-xs",
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        "ring-1 ring-border/20 shrink-0",
        className
      )}
    >
      <AvatarImage 
        src={src || undefined} 
        alt={nome}
        className="object-cover"
        loading="lazy"
        // @ts-ignore
        decoding="async"
      />
      <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 font-semibold text-muted-foreground">
        {getInitials(nome)}
      </AvatarFallback>
    </Avatar>
  );
}
