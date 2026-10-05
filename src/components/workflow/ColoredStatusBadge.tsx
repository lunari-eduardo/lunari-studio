import { useMemo } from "react";
import { useWorkflowStatus } from "@/hooks/useWorkflowStatus";
import { getContrastColor, getStatusTone } from "@/lib/colorUtils";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ColoredStatusBadgeProps = {
  status: string;
  className?: string;
  showBackground?: boolean; // Legacy
  variant?: "solid" | "soft" | "text";
}

export function ColoredStatusBadge({ 
  status, 
  className = '', 
  showBackground = false,
  variant
}: ColoredStatusBadgeProps) {
  const { getStatusColor, workflowStatuses } = useWorkflowStatus();
  const { resolvedTheme } = useTheme();

  // Compatibilidade com código legado
  const actualVariant = variant || (showBackground ? "solid" : "text");

  // Recalcula quando workflowStatuses carregam (evita cor cinza no cold start)
  const statusColor = useMemo(() => {
    if (!status || status === '') return '#6B7280';
    switch (status.toLowerCase()) {
      case 'confirmado':
        return '#34C759';
      case 'a confirmar':
      case 'pendente':
        return '#F59E0B';
      case 'cancelado':
        return '#EF4444';
      default:
        return getStatusColor(status);
    }
  }, [status, workflowStatuses, getStatusColor]);

  if (!status || status === '') {
    if (actualVariant === "soft") {
      return (
        <div className={cn("px-3 h-8 rounded-full border border-dashed border-border/60 bg-transparent flex items-center justify-center text-xs font-normal text-muted-foreground italic", className)}>
          Definir status
        </div>
      );
    }
    return (
      <span className={cn("text-xs font-normal text-muted-foreground italic", className)}>
        Sem status
      </span>
    );
  }

  const displayText = status === 'A Confirmar' ? 'Pendente' : status;

  if (actualVariant === "soft") {
    const tone = getStatusTone(statusColor);
    const isDark = resolvedTheme === "dark";
    
    return (
      <div 
        className={cn("px-3 h-8 rounded-full border flex items-center gap-2 text-xs font-medium whitespace-nowrap", className)}
        style={{ 
          backgroundColor: isDark ? tone.bgDark : tone.bgLight,
          borderColor: isDark ? tone.borderDark : tone.borderLight,
          color: isDark ? tone.textDark : tone.textLight
        }}
      >
        <span 
          className="w-1.5 h-1.5 rounded-full shrink-0" 
          style={{ backgroundColor: statusColor }}
        />
        <span className="truncate">{displayText}</span>
      </div>
    );
  }

  if (actualVariant === "solid") {
    const textColor = getContrastColor(statusColor);
    return (
      <div 
        className={cn("px-3 py-1 rounded-full text-xs font-medium text-center inline-flex items-center justify-center", className)}
        style={{ 
          backgroundColor: statusColor,
          color: textColor
        }}
      >
        {displayText}
      </div>
    );
  }

  return (
    <span 
      className={cn("text-xs font-normal", className)}
      style={{ color: statusColor }}
    >
      {displayText}
    </span>
  );
}
