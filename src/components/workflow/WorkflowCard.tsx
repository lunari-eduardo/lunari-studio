import React from "react";
import { WorkflowCardCollapsed } from "./WorkflowCardCollapsed";
import { WorkflowCardExpanded } from "./WorkflowCardExpanded";
import type { SessionData } from "@/types/workflow";
import { cn } from "@/lib/utils";

interface WorkflowCardProps {
  session: SessionData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  statusOptions: string[];
  packageOptions: any[];
  productOptions: any[];
  onStatusChange: (id: string, newStatus: string) => void;
  onFieldUpdate: (id: string, field: string, value: any, silent?: boolean) => void;
  onDeleteSession?: (id: string, sessionTitle: string, paymentCount: number) => void;
}

export function WorkflowCard({
  session,
  isExpanded,
  onToggleExpand,
  statusOptions,
  packageOptions,
  productOptions,
  onStatusChange,
  onFieldUpdate,
  onDeleteSession,
}: WorkflowCardProps) {
  return (
    <div
      data-card-id={session.id}
      className={cn(
        // Base styles
        "rounded-2xl transition-all duration-200 ease-in-out w-full",
        // Gradient background - light mode (visible contrast)
        "bg-gradient-to-br from-white via-gray-100/60 to-gray-50/80",
        // Gradient background - dark mode (warm grays, no blue)
        "dark:bg-gradient-to-br dark:from-[#1a1a1a] dark:via-[#1f1f1f] dark:to-[#1a1a1a]",
        // Border for card separation
        "border border-gray-200/60 dark:border-gray-700/40",
        // Minimal base shadow
        "shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.15)]",
        // Hover state - strong lift
        !isExpanded && "hover:shadow-[0_8px_28px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.5)]",
        // Expanded state - moderate shadow (less than hover so hover still adds depth)
        isExpanded && [
          "shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.35)]",
          "hover:shadow-[0_10px_32px_rgba(0,0,0,0.14)] dark:hover:shadow-[0_10px_32px_rgba(0,0,0,0.55)]",
          "from-white via-gray-100/70 to-gray-50/90",
          "dark:from-[#1c1c1c] dark:via-[#222] dark:to-[#1c1c1c]"
        ]
      )}
    >
      {/* Collapsed row - sempre visível (clicável para expandir) */}
      <WorkflowCardCollapsed
        session={session}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        statusOptions={statusOptions}
        packageOptions={packageOptions}
        productOptions={productOptions}
        onStatusChange={onStatusChange}
        onFieldUpdate={onFieldUpdate}
        onDeleteSession={onDeleteSession}
      />
      
      {/* Separador visual elegante quando expandido */}
      {isExpanded && (
        <div className="mx-4 md:mx-6 border-b border-primary/20 dark:border-primary/30" />
      )}
      
      {/* Expanded content - só visível quando expandido */}
      {isExpanded && (
        <WorkflowCardExpanded
          session={session}
          packageOptions={packageOptions}
          productOptions={productOptions}
          statusOptions={statusOptions}
          onFieldUpdate={onFieldUpdate}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
}
