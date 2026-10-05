import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColoredStatusBadge } from "./ColoredStatusBadge";

interface SessionStatusSelectProps {
  status: string;
  statusOptions: string[];
  onChange: (newStatus: string) => void;
}

export function SessionStatusSelect({ status, statusOptions, onChange }: SessionStatusSelectProps) {
  return (
    <Select value={status || ""} onValueChange={onChange}>
      <SelectTrigger className="h-8 border-0 bg-transparent p-0 focus:ring-0 [&>svg]:hidden">
        <SelectValue placeholder="Status">
          <ColoredStatusBadge 
            status={status} 
            variant="soft" 
          />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover border shadow-lg z-50 min-w-[120px]">
        <SelectItem value="__CLEAR__" className="text-muted-foreground italic text-xs">
          Limpar status
        </SelectItem>
        {statusOptions.map((opt) => (
          <SelectItem key={opt} value={opt} className="text-xs">
            {/* The dropdown options remain solid/background for clarity if we want, or soft. Let's use soft. */}
            <ColoredStatusBadge status={opt} variant="soft" className="border-0 px-0 h-6" />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
