import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const UnderlineTabs = Tabs

const UnderlineTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn(
      "w-full h-auto p-0 bg-transparent border-b border-border rounded-none justify-start gap-1 sm:gap-6 overflow-x-auto no-scrollbar",
      className
    )}
    {...props}
  />
))
UnderlineTabsList.displayName = "UnderlineTabsList"

const UnderlineTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsTrigger>
>(({ className, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(
      "relative px-3 sm:px-4 py-3.5 text-[13px] sm:text-sm font-medium bg-transparent rounded-none border-none text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent",
      "after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-px after:h-[2px] data-[state=active]:after:bg-accent-gold",
      "flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 hover:text-foreground",
      className
    )}
    {...props}
  />
))
UnderlineTabsTrigger.displayName = "UnderlineTabsTrigger"

const UnderlineTabsContent = TabsContent

export {
  UnderlineTabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
}
