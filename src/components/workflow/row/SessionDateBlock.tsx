import { getSessionDateParts, formatSessionTime } from "@/features/workflow/domain/sessionDisplay";
import { cn } from "@/lib/utils";

interface SessionDateBlockProps {
  dataSessao?: string | null;
  horaSessao?: string | null;
  appointmentId?: string | null;
  className?: string;
}

export function SessionDateBlock({ dataSessao, horaSessao, appointmentId, className }: SessionDateBlockProps) {
  const dateParts = getSessionDateParts(dataSessao);
  const time = formatSessionTime(horaSessao, appointmentId);

  if (!dateParts) {
    return <div className={cn("w-14 flex flex-col items-center justify-center shrink-0", className)}>-</div>;
  }

  return (
    <div className={cn("w-14 flex flex-col items-center justify-center shrink-0", className)}>
      <span 
        className={cn(
          "text-[18px] font-semibold tabular-nums leading-none mb-1",
          dateParts.isToday ? "text-accent-gold" : "text-foreground"
        )}
      >
        {dateParts.day}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground leading-none mb-1">
        {dateParts.month}
      </span>
      {time && (
        <span className="text-[11px] font-medium tabular-nums text-foreground/70 leading-none">
          {time}
        </span>
      )}
    </div>
  );
}
