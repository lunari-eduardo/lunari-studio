import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColoredStatusBadge } from "./ColoredStatusBadge";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionStatusSelectProps {
  status: string;
  statusOptions: string[];
  onChange: (newStatus: string) => void;
  variant?: "default" | "mobile-pill";
}

export function SessionStatusSelect({ status, statusOptions, onChange, variant = "default" }: SessionStatusSelectProps) {
  return (
    <Select value={status || ""} onValueChange={onChange}>
      <SelectTrigger className={cn("border-0 bg-transparent p-0 focus:ring-0 [&>svg]:hidden", variant === "mobile-pill" ? "h-[28px]" : "h-8")}>
        <SelectValue placeholder="Status">
          <div className="relative group">
            <ColoredStatusBadge 
              status={status} 
              variant="soft"
              className={cn(variant === "mobile-pill" && "pr-6 h-[28px] text-[11px] font-medium border-border/40")}
            />
            {variant === "mobile-pill" && (
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-50" />
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border shadow-lg z-[9999] min-w-[140px]">
        <SelectItem value="__CLEAR__" className="text-muted-foreground italic text-xs">
          Limpar status
        </SelectItem>
        {statusOptions.map((opt) => (
          <SelectItem key={opt} value={opt} className="text-xs">
            <ColoredStatusBadge status={opt} variant="soft" className="border-0 px-0 h-6" />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
