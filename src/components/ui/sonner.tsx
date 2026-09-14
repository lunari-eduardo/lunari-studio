import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      duration={2400}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-900/80 dark:group-[.toaster]:bg-zinc-900/80 group-[.toaster]:text-zinc-100 group-[.toaster]:border-white/10 group-[.toaster]:backdrop-blur-md group-[.toaster]:shadow-sm group-[.toaster]:rounded-full group-[.toaster]:text-xs group-[.toaster]:py-1.5 group-[.toaster]:px-3.5",
          description: "group-[.toast]:text-zinc-400 group-[.toast]:text-[11px]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground text-xs",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-xs",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
