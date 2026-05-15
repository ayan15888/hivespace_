import { cn } from "@/lib/utils"

interface CTAButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
}

export function CTAButton({ children, className, ...props }: CTAButtonProps) {
  return (
    <button
      className={cn(
        "h-9 px-4 rounded-md text-[10px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
        "bg-[linear-gradient(145deg,#CABEFF,#947DFF)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
