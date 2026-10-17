/**
 * Segmented Control Component
 * iOS/Notion/Stripe style visual tab switcher
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface SegmentOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** Mostra só o ícone; o rótulo vira aria-label/title. */
  iconOnly?: boolean;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  /** `solid`: ativo em grafite (padrão histórico). `subtle`: pílula clara sobre trilho neutro. */
  variant?: "solid" | "subtle";
  size?: "default" | "sm";
  "aria-label"?: string;
}

export function SegmentedControl({
  options,
  value,
  onValueChange,
  className,
  variant = "solid",
  size = "default",
  ...aria
}: SegmentedControlProps) {
  const subtle = variant === "subtle";

  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-lg",
        subtle ? "bg-muted/60 border border-border/60" : "bg-muted/50 border border-border",
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.iconOnly ? option.label : undefined}
            title={option.iconOnly ? option.label : undefined}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
              size === "sm" ? "h-7 text-xs" : "py-2 text-sm",
              option.iconOnly ? (size === "sm" ? "w-8" : "w-10") : size === "sm" ? "px-3" : "px-4",
              isActive
                ? subtle
                  ? "bg-background text-foreground shadow-sm"
                  : "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
                  "transition-opacity duration-200",
                  isActive ? "opacity-100" : "opacity-60"
                )}
              />
            )}
            {!option.iconOnly && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
